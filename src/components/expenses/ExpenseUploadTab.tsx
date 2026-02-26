"use client";

import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Calendar } from "lucide-react";
import { processExpenseExcel } from "@/lib/expenseExcelProcessor";
import type { ExpenseProcessingResult } from "@/types/expenses";

interface Props {
  onUploadComplete: () => void;
}

type UploadStep = "idle" | "reading" | "processing" | "uploading" | "done" | "error";

export default function ExpenseUploadTab({ onUploadComplete }: Props) {
  const [step, setStep] = useState<UploadStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExpenseProcessingResult | null>(null);
  const [uploadStats, setUploadStats] = useState<Record<string, number> | null>(null);
  const [fileName, setFileName] = useState("");

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setFileName(file.name);
      setError(null);
      setResult(null);
      setUploadStats(null);

      setStep("reading");
      try {
        setStep("processing");
        const processed = await processExpenseExcel(file);
        if (!processed.success) {
          setError(processed.error ?? "שגיאה בעיבוד הקובץ");
          setStep("error");
          return;
        }
        setResult(processed);
        setStep("idle");
      } catch (err) {
        setError(err instanceof Error ? err.message : "שגיאה בקריאת הקובץ");
        setStep("error");
      }
    },
    [],
  );

  const handleUpload = useCallback(async () => {
    if (!result) return;
    setStep("uploading");
    setError(null);
    try {
      const res = await fetch("/api/expenses/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: result.rows,
          suppliers: result.suppliers,
          totals: result.totals,
          stats: result.stats,
          detectedMonths: result.detectedMonths,
          dateRange: result.dateRange,
          fileName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "שגיאה בהעלאה");
      }

      setUploadStats(data.stats);
      setStep("done");
      onUploadComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהעלאה");
      setStep("error");
    }
  }, [result, fileName, onUploadComplete]);

  const resetUpload = () => {
    setStep("idle");
    setError(null);
    setResult(null);
    setUploadStats(null);
    setFileName("");
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">העלאת דוח הוצאות</h2>
        <p className="text-sm text-gray-500">
          העלה קובץ Excel מחשבשבת — המערכת תזהה אוטומטית את החודשים והספקים מתוך הנתונים
        </p>
      </div>

      {/* Upload area */}
      {step === "idle" && !result && (
        <label className="block border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-all group">
          <Upload className="w-12 h-12 mx-auto text-gray-300 group-hover:text-primary-400 transition-colors" />
          <p className="mt-4 text-sm text-gray-600">
            <span className="text-primary-600 font-medium">לחץ לבחירת קובץ</span>{" "}
            או גרור לכאן
          </p>
          <p className="mt-1 text-xs text-gray-400">Excel (.xlsx) בלבד — הקובץ יכול להכיל נתונים ממספר חודשים</p>
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileSelect}
          />
        </label>
      )}

      {/* Processing indicator */}
      {(step === "reading" || step === "processing") && (
        <div className="flex flex-col items-center py-12 gap-4">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
          <p className="text-sm text-gray-600">
            {step === "reading" ? "קורא את הקובץ..." : "מעבד נתונים ומזהה חודשים..."}
          </p>
        </div>
      )}

      {/* Preview result */}
      {result && step === "idle" && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">הקובץ עובד בהצלחה!</p>
                <p className="text-sm text-green-600 mt-1">{fileName}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="שורות" value={result.stats.rowsCount} />
            <StatCard label="ספקים" value={result.stats.suppliersCount} />
            <StatCard label="חודשים" value={result.stats.monthsCount} icon={<Calendar className="w-4 h-4 text-blue-400" />} />
            <StatCard
              label="חיובים"
              value={formatCurrency(result.totals.totalDebits)}
              color="text-red-600"
            />
            <StatCard
              label="זיכויים"
              value={formatCurrency(result.totals.totalCredits)}
              color="text-green-600"
            />
          </div>

          {/* Detected months breakdown */}
          {result.detectedMonths.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-blue-800">
                  חודשים שזוהו ({result.detectedMonths.length})
                </h3>
              </div>
              {result.dateRange.from && result.dateRange.to && (
                <p className="text-xs text-blue-600 mb-3">
                  טווח תאריכים: {formatDate(result.dateRange.from)} — {formatDate(result.dateRange.to)}
                </p>
              )}
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {result.detectedMonths.map((dm) => (
                  <span
                    key={`${dm.year}-${dm.month}`}
                    className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center gap-1.5"
                  >
                    <span className="font-medium">{dm.label}</span>
                    <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-md text-[10px]">
                      {dm.rowCount} שורות
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.detectedMonths.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">לא זוהו תאריכים בקובץ</p>
                  <p className="text-xs text-amber-600 mt-1">
                    הרשומות יישמרו עם תאריך החודש הנוכחי. ודא שעמודת &quot;ת.אסמכ&quot; קיימת בקובץ.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Suppliers preview */}
          {result.suppliers.length > 0 && (
            <div className="bg-gray-50 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                ספקים שזוהו ({result.suppliers.length})
              </h3>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {result.suppliers.map((s) => (
                  <span
                    key={s.accountKey}
                    className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs text-gray-700"
                  >
                    {s.name} ({s.accountKey})
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={resetUpload}
              className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              בטל
            </button>
            <button
              onClick={handleUpload}
              className="px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 inline-block ml-2" />
              העלה נתונים ({result.stats.rowsCount} שורות, {result.stats.monthsCount} חודשים)
            </button>
          </div>
        </div>
      )}

      {/* Uploading */}
      {step === "uploading" && (
        <div className="flex flex-col items-center py-12 gap-4">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
          <p className="text-sm text-gray-600">מעלה נתונים לשרת...</p>
        </div>
      )}

      {/* Done */}
      {step === "done" && uploadStats && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <p className="text-lg font-semibold text-green-800 mt-3">ההעלאה הושלמה בהצלחה!</p>
            <div className="flex justify-center gap-6 mt-4 text-sm text-green-700">
              <span>{uploadStats.rowsInserted} שורות</span>
              <span>{uploadStats.suppliersFound} ספקים</span>
              <span>{uploadStats.monthsDetected} חודשים</span>
            </div>
          </div>
          <div className="text-center">
            <button
              onClick={resetUpload}
              className="px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              העלה קובץ נוסף
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {step === "error" && error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">שגיאה</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <button
                onClick={resetUpload}
                className="mt-3 text-sm text-red-700 underline hover:no-underline"
              >
                נסה שוב
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
      <div className="flex items-center justify-center gap-1">
        {icon}
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className={`text-lg font-bold mt-1 ${color || "text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(val);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
}
