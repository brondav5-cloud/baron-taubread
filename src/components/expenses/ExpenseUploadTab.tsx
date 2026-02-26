"use client";

import { useState, useCallback } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { processExpenseExcel } from "@/lib/expenseExcelProcessor";
import type { ExpenseProcessingResult } from "@/types/expenses";

interface Props {
  onUploadComplete: () => void;
}

type UploadStep =
  | "idle"
  | "parsing"
  | "checking"
  | "preview"
  | "uploading"
  | "done"
  | "error";

export default function ExpenseUploadTab({ onUploadComplete }: Props) {
  const [step, setStep] = useState<UploadStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExpenseProcessingResult | null>(null);
  const [uploadStats, setUploadStats] = useState<Record<string, number> | null>(null);
  const [fileName, setFileName] = useState("");
  const [duplicateMonths, setDuplicateMonths] = useState<string[]>([]);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  // ─── File selected → parse → check duplicates → show preview ───
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setFileName(file.name);
      setError(null);
      setResult(null);
      setUploadStats(null);
      setDuplicateMonths([]);

      // Step 1: Parse
      setStep("parsing");
      let processed: ExpenseProcessingResult;
      try {
        processed = await processExpenseExcel(file);
        if (!processed.success) {
          setError(processed.error ?? "שגיאה בעיבוד הקובץ");
          setStep("error");
          return;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "שגיאה בקריאת הקובץ");
        setStep("error");
        return;
      }

      setResult(processed);

      // Step 2: Check duplicates
      if (processed.detectedMonths.length > 0) {
        setStep("checking");
        try {
          const monthsParam = processed.detectedMonths
            .map((dm) => `${dm.year}-${String(dm.month).padStart(2, "0")}`)
            .join(",");
          const res = await fetch(
            `/api/expenses/check-duplicates?months=${monthsParam}`,
          );
          if (res.ok) {
            const data = await res.json();
            if (data.hasDuplicates) {
              setDuplicateMonths(data.existingMonths as string[]);
            }
          }
        } catch {
          // Non-critical — skip duplicate check silently
        }
      }

      setStep("preview");
    },
    [],
  );

  // ─── Upload to server ───
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
      if (!res.ok) throw new Error(data.error || "שגיאה בהעלאה");

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
    setDuplicateMonths([]);
  };

  // ─── Delete all expense data ───
  const handleResetAllData = useCallback(async () => {
    if (
      !window.confirm(
        "האם אתה בטוח שברצונך למחוק את כל נתוני ההוצאות?\n\nפעולה זו תמחק את כל החשבוניות שהועלו עד כה.\nספקים, קטגוריות והכנסות שהוזנו ידנית — ישמרו.",
      )
    )
      return;
    setResetting(true);
    setResetDone(false);
    try {
      const res = await fetch("/api/expenses/reset", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "שגיאה במחיקה");
      } else {
        setResetDone(true);
        resetUpload();
        onUploadComplete();
      }
    } catch {
      alert("שגיאה בחיבור לשרת");
    } finally {
      setResetting(false);
    }
  }, [onUploadComplete]);

  return (
    <div className="space-y-6">

      {/* Header + reset button */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            העלאת דוח הוצאות
          </h2>
          <p className="text-sm text-gray-500">
            העלה קובץ Excel מחשבשבת — המערכת תזהה אוטומטית את החודשים והספקים
          </p>
        </div>
        <button
          onClick={handleResetAllData}
          disabled={resetting}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
          title="מחק את כל נתוני ההוצאות שהועלו"
        >
          {resetting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          {resetting ? "מוחק..." : "מחק כל הנתונים"}
        </button>
      </div>

      {/* Reset success banner */}
      {resetDone && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          כל נתוני ההוצאות נמחקו. ניתן להעלות קובץ חדש.
        </div>
      )}

      {/* ── STEP: idle — file picker ── */}
      {step === "idle" && (
        <label className="block border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-all group">
          <Upload className="w-12 h-12 mx-auto text-gray-300 group-hover:text-primary-400 transition-colors" />
          <p className="mt-4 text-sm text-gray-600">
            <span className="text-primary-600 font-medium">לחץ לבחירת קובץ</span>{" "}
            או גרור לכאן
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Excel (.xlsx) בלבד — הקובץ יכול להכיל נתונים ממספר חודשים
          </p>
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileSelect}
          />
        </label>
      )}

      {/* ── STEP: parsing / checking ── */}
      {(step === "parsing" || step === "checking") && (
        <div className="flex flex-col items-center py-12 gap-4">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
          <p className="text-sm text-gray-600">
            {step === "parsing"
              ? "קורא ומפענח את הקובץ..."
              : "בודק אם הנתונים כבר קיימים במערכת..."}
          </p>
        </div>
      )}

      {/* ── STEP: preview ── */}
      {step === "preview" && result && (
        <div className="space-y-4">

          {/* Parse success */}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-green-800">הקובץ פוענח בהצלחה</p>
              <p className="text-sm text-green-600 mt-0.5">{fileName}</p>
            </div>
          </div>

          {/* ⚠️ Duplicate warning */}
          {duplicateMonths.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-800">
                    {duplicateMonths.length === 1
                      ? "חודש אחד כבר קיים במערכת"
                      : `${duplicateMonths.length} חודשים כבר קיימים במערכת`}
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    העלאה תוסיף רשומות נוספות לחודשים אלה (כפילות). מומלץ למחוק
                    קודם את הנתונים הישנים.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {duplicateMonths.map((m) => (
                      <span
                        key={m}
                        className="px-2 py-0.5 bg-amber-100 border border-amber-300 rounded-md text-xs font-medium text-amber-800"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="חשבוניות" value={result.stats.rowsCount} />
            <StatCard label="ספקים" value={result.stats.suppliersCount} />
            <StatCard
              label="חודשים"
              value={result.stats.monthsCount}
              icon={<Calendar className="w-4 h-4 text-blue-400" />}
            />
            <StatCard
              label="סה״כ חיובים"
              value={formatCurrency(result.totals.totalDebits)}
              color="text-red-600"
            />
          </div>

          {/* Date range + months */}
          {result.detectedMonths.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-blue-800">
                  חודשים שזוהו ({result.detectedMonths.length})
                </h3>
                {result.dateRange.from && result.dateRange.to && (
                  <span className="text-xs text-blue-500 mr-auto">
                    {formatDate(result.dateRange.from)} —{" "}
                    {formatDate(result.dateRange.to)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                {result.detectedMonths.map((dm) => {
                  const label = `${String(dm.month).padStart(2, "0")}/${dm.year}`;
                  const isDupe = duplicateMonths.includes(label);
                  return (
                    <span
                      key={`${dm.year}-${dm.month}`}
                      className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border ${
                        isDupe
                          ? "bg-amber-50 border-amber-300 text-amber-800"
                          : "bg-white border-blue-200 text-blue-800"
                      }`}
                    >
                      {isDupe && (
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                      )}
                      <span className="font-medium">{dm.label}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                          isDupe
                            ? "bg-amber-100 text-amber-600"
                            : "bg-blue-100 text-blue-600"
                        }`}
                      >
                        {dm.rowCount} שורות
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* No dates warning */}
          {result.detectedMonths.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  לא זוהו תאריכים בקובץ
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  ודא שעמודת &quot;ת.אסמכ&quot; (עמודה I) קיימת וממולאת בקובץ.
                </p>
              </div>
            </div>
          )}

          {/* Suppliers */}
          {result.suppliers.length > 0 && (
            <div className="bg-gray-50 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                ספקים שזוהו ({result.suppliers.length})
              </h3>
              <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                {result.suppliers.map((s) => (
                  <span
                    key={s.accountKey}
                    className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs text-gray-700"
                  >
                    {s.name}{" "}
                    <span className="text-gray-400">({s.accountKey})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 justify-center pt-1">
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
              {duplicateMonths.length > 0
                ? `העלה בכל זאת (${result.stats.rowsCount} שורות)`
                : `העלה נתונים (${result.stats.rowsCount} שורות)`}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: uploading ── */}
      {step === "uploading" && (
        <div className="flex flex-col items-center py-12 gap-4">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
          <p className="text-sm text-gray-600">מעלה נתונים לשרת...</p>
        </div>
      )}

      {/* ── STEP: done ── */}
      {step === "done" && uploadStats && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <p className="text-lg font-semibold text-green-800 mt-3">
              ההעלאה הושלמה בהצלחה!
            </p>
            <div className="flex justify-center gap-6 mt-4 text-sm text-green-700">
              <span>{uploadStats.rowsInserted} חשבוניות</span>
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

      {/* ── STEP: error ── */}
      {step === "error" && error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">שגיאה בעיבוד הקובץ</p>
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

// ─── helpers ───────────────────────────────────────────────────────────────

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
      <div className="flex items-center justify-center gap-1 mb-1">
        {icon}
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className={`text-lg font-bold ${color ?? "text-gray-900"}`}>
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
  return d.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
