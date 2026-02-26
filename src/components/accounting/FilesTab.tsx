"use client";

import { useRef, useState } from "react";
import { Upload, Trash2, CheckCircle, AlertCircle, Clock, FileText } from "lucide-react";
import { clsx } from "clsx";
import type { DbUploadedFile } from "@/types/accounting";

interface Props {
  files: DbUploadedFile[];
  onUploadComplete: () => void;
}

const MONTH_NAMES = [
  "ינואר","פברואר","מרץ","אפריל","מאי","יוני",
  "יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר",
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

export default function FilesTab({ files, onUploadComplete }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number | null>(null);
  const [fileType, setFileType] = useState<"yearly" | "monthly">("yearly");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleFile = async (f: File) => {
    if (!f.name.endsWith(".xlsx")) {
      setLastResult({ success: false, message: "הקובץ חייב להיות בפורמט .xlsx" });
      return;
    }

    setUploading(true);
    setLastResult(null);
    setProgress("מעבד קובץ...");

    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("year", String(year));
      fd.append("fileType", fileType);
      if (fileType === "monthly" && month) fd.append("month", String(month));

      setProgress("שולח לשרת...");
      const res = await fetch("/api/accounting/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setLastResult({ success: false, message: data.error ?? "שגיאה בהעלאה" });
      } else {
        const { stats } = data;
        setLastResult({
          success: true,
          message: `יובאו ${stats.rowsInserted.toLocaleString()} תנועות · ${stats.accountsCount} חשבונות · ${stats.rowsSkipped > 0 ? `${stats.rowsSkipped} כפילויות דולגו` : ""}`,
        });
        onUploadComplete();
      }
    } catch (err) {
      setLastResult({ success: false, message: String(err) });
    } finally {
      setUploading(false);
      setProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) void handleFile(f);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await fetch(`/api/accounting/files?id=${id}`, { method: "DELETE" });
    setDeletingId(null);
    onUploadComplete();
  };

  const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Config */}
        <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">הגדרות העלאה</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">שנה</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
              >
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">סוג</label>
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value as "yearly" | "monthly")}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
              >
                <option value="yearly">שנתי</option>
                <option value="monthly">חודשי</option>
              </select>
            </div>
          </div>

          {fileType === "monthly" && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">חודש</label>
              <select
                value={month ?? ""}
                onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
              >
                <option value="">בחר חודש</option>
                {MONTH_NAMES.map((n, i) => (
                  <option key={i + 1} value={i + 1}>{n}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={clsx(
            "border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors min-h-[140px]",
            dragOver ? "border-primary-400 bg-primary-50" : "border-gray-200 hover:border-primary-300 hover:bg-gray-50",
            uploading && "pointer-events-none opacity-60",
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              <p className="text-sm text-gray-500">{progress}</p>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">גרור קובץ Excel לכאן</p>
                <p className="text-xs text-gray-400 mt-1">או לחץ לבחירה · קובץ .xlsx בלבד</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Result */}
      {lastResult && (
        <div
          className={clsx(
            "flex items-start gap-3 p-4 rounded-2xl border text-sm",
            lastResult.success
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800",
          )}
        >
          {lastResult.success
            ? <CheckCircle className="w-5 h-5 mt-0.5 shrink-0 text-green-600" />
            : <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-600" />}
          <span>{lastResult.message}</span>
        </div>
      )}

      {/* Files list */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          קבצים שהועלו ({files.length})
        </h3>

        {files.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">לא הועלו קבצים עדיין</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-gray-200 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <StatusIcon status={f.status} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{f.filename}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {f.year}
                      {f.month ? ` · ${MONTH_NAMES[f.month - 1]}` : " · שנתי"}
                      {f.row_count != null ? ` · ${f.row_count.toLocaleString()} תנועות` : ""}
                      {" · "}
                      {fmtDate(f.uploaded_at)}
                    </p>
                    {f.error_msg && (
                      <p className="text-xs text-red-500 mt-0.5">{f.error_msg}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => void handleDelete(f.id)}
                  disabled={deletingId === f.id}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Setup hint */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
        <strong>הגדרה ראשונה:</strong> אם הטבלאות עדיין לא נוצרו ב-Supabase, הרץ את קובץ{" "}
        <code className="bg-amber-100 px-1 rounded">supabase/migrations/001_accounting.sql</code>{" "}
        ב-SQL Editor של Supabase, או הוסף{" "}
        <code className="bg-amber-100 px-1 rounded">SUPABASE_PROJECT_REF</code> ו-
        <code className="bg-amber-100 px-1 rounded">SUPABASE_ACCESS_TOKEN</code> ל-
        <code className="bg-amber-100 px-1 rounded">.env.local</code>{" "}
        לאיתחול אוטומטי.
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: DbUploadedFile["status"] }) {
  if (status === "completed") return <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />;
  if (status === "error") return <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />;
  return <Clock className="w-4 h-4 text-yellow-500 shrink-0 animate-pulse" />;
}
