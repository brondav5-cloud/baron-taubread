"use client";

import { useRef, useState, useMemo } from "react";
import {
  Upload, Trash2, CheckCircle, AlertCircle, Clock, FileText,
  Save, X, Building2, Receipt, TrendingUp, TrendingDown, Calendar,
} from "lucide-react";
import { clsx } from "clsx";
import type { DbUploadedFile, ParsedAccount, ParsedTransaction } from "@/types/accounting";
import { processAccountingExcel } from "@/lib/accountingExcelProcessor";

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

function fmtNum(n: number) {
  return n.toLocaleString("he-IL", { maximumFractionDigits: 0 });
}

function fmtCurrency(n: number) {
  return `₪${Math.abs(n).toLocaleString("he-IL", { maximumFractionDigits: 0 })}`;
}

interface ParsedPreview {
  filename: string;
  accounts: ParsedAccount[];
  transactions: ParsedTransaction[];
  stats: { rowsCount: number; accountsCount: number; dateRange: { from: string | null; to: string | null } };
}

function computePreviewStats(preview: ParsedPreview) {
  const { accounts, transactions } = preview;
  const totalDebit = transactions.reduce((s, t) => s + t.debit, 0);
  const totalCredit = transactions.reduce((s, t) => s + t.credit, 0);

  const revenueAccounts = accounts.filter((a) => a.account_type === "revenue");
  const expenseAccounts = accounts.filter((a) => a.account_type === "expense");

  const uniqueCounterAccounts = new Set(
    transactions.map((t) => t.counter_account).filter(Boolean),
  );

  const monthCounts = new Map<string, number>();
  transactions.forEach((t) => {
    const m = t.transaction_date.slice(0, 7);
    monthCounts.set(m, (monthCounts.get(m) || 0) + 1);
  });
  const monthsSorted = Array.from(monthCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  const uniqueHeaders = new Set(transactions.map((t) => t.header_number).filter(Boolean));

  const CLOSING_KW = ["סגירה", "סגירת", "סגירת שנה", "סגירת ספרים", "closing", "year end"];
  const closingCount = transactions.filter((t) => {
    const desc = (t.description || "").toLowerCase();
    return CLOSING_KW.some((kw) => desc.includes(kw));
  }).length;

  return {
    totalDebit,
    totalCredit,
    revenueAccounts,
    expenseAccounts,
    uniqueCounterAccounts: uniqueCounterAccounts.size,
    uniqueHeaders: uniqueHeaders.size,
    closingCount,
    monthsSorted,
  };
}

export default function FilesTab({ files, onUploadComplete }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number | null>(null);
  const [fileType, setFileType] = useState<"yearly" | "monthly">("yearly");
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [preview, setPreview] = useState<ParsedPreview | null>(null);

  const previewStats = useMemo(
    () => (preview ? computePreviewStats(preview) : null),
    [preview],
  );

  const BATCH_SIZE = 300;

  const safeJson = async (res: Response): Promise<Record<string, unknown>> => {
    try { return await res.json(); } catch { return { error: `שגיאת שרת ${res.status}: ${res.statusText}` }; }
  };

  const handleFile = async (f: File) => {
    if (!f.name.endsWith(".xlsx")) {
      setLastResult({ success: false, message: "הקובץ חייב להיות בפורמט .xlsx" });
      return;
    }

    setParsing(true);
    setLastResult(null);
    setPreview(null);

    try {
      const parsed = await processAccountingExcel(f);
      if (!parsed.success) {
        setLastResult({ success: false, message: parsed.error ?? "שגיאת פרסור" });
        return;
      }

      setPreview({
        filename: f.name,
        accounts: parsed.accounts,
        transactions: parsed.transactions,
        stats: parsed.stats,
      });
    } catch (err) {
      setLastResult({ success: false, message: String(err) });
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleConfirmUpload = async () => {
    if (!preview) return;
    const { filename, accounts, transactions, stats } = preview;

    setUploading(true);
    setLastResult(null);

    try {
      setProgress(`שולח חשבונות...`);
      const phase1Res = await fetch("/api/accounting/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename,
          year,
          month: fileType === "monthly" ? month : null,
          fileType,
          accounts,
          totalTransactions: stats.rowsCount,
        }),
      });

      const phase1Data = await safeJson(phase1Res);
      if (!phase1Res.ok) {
        setLastResult({ success: false, message: (phase1Data.error as string) ?? "שגיאה ביצירת רשומה" });
        return;
      }

      const fileId = phase1Data.fileId as string;

      const totalChunks = Math.ceil(transactions.length / BATCH_SIZE);
      let totalInserted = 0;
      let totalSkipped = 0;

      for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
        const chunkIndex = Math.floor(i / BATCH_SIZE);
        const chunk = transactions.slice(i, i + BATCH_SIZE);
        const isLast = i + BATCH_SIZE >= transactions.length;

        setProgress(
          `שולח תנועות... ${Math.min(i + BATCH_SIZE, transactions.length).toLocaleString()} / ${transactions.length.toLocaleString()} (${Math.round(((chunkIndex + 1) / totalChunks) * 100)}%)`,
        );

        const batchRes = await fetch("/api/accounting/upload/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId, transactions: chunk, isLast }),
        });

        const batchData = await safeJson(batchRes);
        if (!batchRes.ok) {
          setLastResult({ success: false, message: (batchData.error as string) ?? "שגיאה בהעלאת תנועות" });
          return;
        }

        totalInserted += (batchData.inserted as number) ?? 0;
        totalSkipped += (batchData.skipped as number) ?? 0;
      }

      // Phase 3: Build suppliers from transactions
      setProgress("מבנה ספקים...");
      const buildRes = await fetch("/api/accounting/suppliers/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: fileId }),
      });
      const buildData = await safeJson(buildRes);
      const supplierNote = buildRes.ok && (buildData.suppliersCreated || buildData.suppliersUpdated)
        ? ` · ${(buildData.suppliersCreated ?? 0) + (buildData.suppliersUpdated ?? 0)} ספקים עודכנו`
        : "";

      setLastResult({
        success: true,
        message: `יובאו ${totalInserted.toLocaleString()} תנועות · ${accounts.length} חשבונות${totalSkipped > 0 ? ` · ${totalSkipped} כפילויות דולגו` : ""}${supplierNote}`,
      });
      setPreview(null);
      onUploadComplete();
    } catch (err) {
      setLastResult({ success: false, message: String(err) });
    } finally {
      setUploading(false);
      setProgress(null);
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
            (uploading || parsing) && "pointer-events-none opacity-60",
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
          {parsing ? (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              <p className="text-sm text-gray-500">מנתח קובץ Excel...</p>
            </>
          ) : uploading ? (
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

      {/* ── Preview Panel ────────────────────────────────── */}
      {preview && previewStats && (
        <div className="bg-white border border-blue-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-blue-50 px-5 py-3 flex items-center justify-between border-b border-blue-100">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-blue-900">
                תצוגה מקדימה — {preview.filename}
              </h3>
            </div>
            <button
              onClick={() => setPreview(null)}
              className="p-1 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-blue-500" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <StatCard
                icon={<Building2 className="w-5 h-5" />}
                label="חשבונות (ספקים)"
                value={fmtNum(preview.stats.accountsCount)}
                color="blue"
                detail={`${previewStats.revenueAccounts.length} הכנסה · ${previewStats.expenseAccounts.length} הוצאה`}
              />
              <StatCard
                icon={<Receipt className="w-5 h-5" />}
                label="תנועות"
                value={fmtNum(preview.stats.rowsCount)}
                color="purple"
                detail={`${fmtNum(previewStats.uniqueHeaders)} כותרות`}
              />
              <StatCard
                icon={<TrendingDown className="w-5 h-5" />}
                label='סה"כ חובה'
                value={fmtCurrency(previewStats.totalDebit)}
                color="red"
              />
              <StatCard
                icon={<TrendingUp className="w-5 h-5" />}
                label='סה"כ זכות'
                value={fmtCurrency(previewStats.totalCredit)}
                color="green"
              />
              <StatCard
                icon={<Calendar className="w-5 h-5" />}
                label="טווח תאריכים"
                value={
                  preview.stats.dateRange.from && preview.stats.dateRange.to
                    ? `${fmtDate(preview.stats.dateRange.from)} — ${fmtDate(preview.stats.dateRange.to)}`
                    : "—"
                }
                color="gray"
              />
              <StatCard
                icon={<Building2 className="w-5 h-5" />}
                label="חשבונות נגדיים"
                value={fmtNum(previewStats.uniqueCounterAccounts)}
                color="amber"
              />
            </div>

            {/* Closing Entries Warning */}
            {previewStats.closingCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                <strong>שים לב:</strong> נמצאו{" "}
                <span className="font-bold">{previewStats.closingCount.toLocaleString()}</span>{" "}
                פקודות סגירת שנה (תנועות עם תיאור &quot;סגירה&quot;).
                פקודות אלו יסוננו אוטומטית מחישוב הרווח והפסד כדי להציג תמונה מדויקת.
              </div>
            )}

            {/* Monthly Breakdown */}
            {previewStats.monthsSorted.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 mb-2">פירוט לפי חודש</h4>
                <div className="flex flex-wrap gap-2">
                  {previewStats.monthsSorted.map(([m, count]) => {
                    const [y, mo] = m.split("-");
                    const monthIdx = parseInt(mo!, 10) - 1;
                    const label = MONTH_NAMES[monthIdx] ? `${MONTH_NAMES[monthIdx]} ${y}` : m;
                    return (
                      <span
                        key={m}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700"
                      >
                        <span className="font-medium">{label}</span>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-500">{fmtNum(count)} תנועות</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top Accounts */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-2">
                חשבונות עם הכי הרבה תנועות (10 ראשונים)
              </h4>
              <TopAccountsTable
                accounts={preview.accounts}
                transactions={preview.transactions}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={() => void handleConfirmUpload()}
                disabled={uploading}
                className={clsx(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors",
                  uploading
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700 shadow-sm",
                )}
              >
                <Save className="w-4 h-4" />
                {uploading ? "שומר..." : "שמור נתונים"}
              </button>
              <button
                onClick={() => setPreview(null)}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
                ביטול
              </button>
              {uploading && progress && (
                <span className="text-sm text-gray-500 mr-2">{progress}</span>
              )}
            </div>
          </div>
        </div>
      )}

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

// ── Sub-components ─────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "blue" | "purple" | "red" | "green" | "gray" | "amber";
  detail?: string;
}) {
  const colorMap: Record<string, { bg: string; icon: string }> = {
    blue:   { bg: "bg-blue-50",   icon: "text-blue-500" },
    purple: { bg: "bg-purple-50", icon: "text-purple-500" },
    red:    { bg: "bg-red-50",    icon: "text-red-500" },
    green:  { bg: "bg-green-50",  icon: "text-green-500" },
    gray:   { bg: "bg-gray-50",   icon: "text-gray-500" },
    amber:  { bg: "bg-amber-50",  icon: "text-amber-500" },
  };
  const c = colorMap[color] ?? colorMap.gray!;

  return (
    <div className={clsx("rounded-xl p-3 border border-gray-100", c.bg)}>
      <div className="flex items-center gap-2 mb-1">
        <span className={c.icon}>{icon}</span>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
      {detail && <p className="text-[11px] text-gray-400 mt-0.5">{detail}</p>}
    </div>
  );
}

function TopAccountsTable({
  accounts,
  transactions,
}: {
  accounts: ParsedAccount[];
  transactions: ParsedTransaction[];
}) {
  const accountMap = new Map(accounts.map((a) => [a.code, a]));
  const txByAccount = new Map<string, { count: number; debit: number; credit: number }>();

  transactions.forEach((tx) => {
    const entry = txByAccount.get(tx.account_code) || { count: 0, debit: 0, credit: 0 };
    entry.count++;
    entry.debit += tx.debit;
    entry.credit += tx.credit;
    txByAccount.set(tx.account_code, entry);
  });

  const sorted = Array.from(txByAccount.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-xs">
            <th className="text-right px-3 py-2 font-medium">קוד</th>
            <th className="text-right px-3 py-2 font-medium">שם חשבון</th>
            <th className="text-right px-3 py-2 font-medium">סוג</th>
            <th className="text-right px-3 py-2 font-medium">תנועות</th>
            <th className="text-right px-3 py-2 font-medium">חובה</th>
            <th className="text-right px-3 py-2 font-medium">זכות</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(([code, data]) => {
            const acc = accountMap.get(code);
            return (
              <tr key={code} className="border-t border-gray-50 hover:bg-gray-50/50">
                <td className="px-3 py-2 text-gray-600 font-mono text-xs">{code}</td>
                <td className="px-3 py-2 text-gray-800 font-medium">{acc?.name || code}</td>
                <td className="px-3 py-2">
                  <span
                    className={clsx(
                      "inline-block px-2 py-0.5 rounded text-[10px] font-medium",
                      acc?.account_type === "revenue"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700",
                    )}
                  >
                    {acc?.account_type === "revenue" ? "הכנסה" : "הוצאה"}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-700">{fmtNum(data.count)}</td>
                <td className="px-3 py-2 text-red-600">{fmtCurrency(data.debit)}</td>
                <td className="px-3 py-2 text-green-600">{fmtCurrency(data.credit)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusIcon({ status }: { status: DbUploadedFile["status"] }) {
  if (status === "completed") return <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />;
  if (status === "error") return <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />;
  return <Clock className="w-4 h-4 text-yellow-500 shrink-0 animate-pulse" />;
}
