"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Download, Loader2, Settings } from "lucide-react";
import { loadXlsx } from "@/lib/loadXlsx";
import type { PnlResponse } from "@/app/api/finance/pnl/route";
import LayoutEditorModal from "@/components/finance-pnl/LayoutEditorModal";
import PnlStatementTable from "@/components/finance-pnl/PnlStatementTable";
import PnlSummaryCards from "@/components/finance-pnl/PnlSummaryCards";
import { buildLayoutCategoryOptions, buildStatement } from "@/components/finance-pnl/layout-utils";
import { monthLabel } from "@/components/finance-pnl/format";
import { usePnlLayout } from "@/components/finance-pnl/usePnlLayout";

export default function PnlPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(0);
  const [data, setData] = useState<PnlResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const layout = usePnlLayout();

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = month > 0
        ? `/api/finance/pnl?year=${year}&month=${month}`
        : `/api/finance/pnl?year=${year}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("שגיאה בטעינת הדוח");
      setData(await res.json() as PnlResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה לא ידועה");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const statement = useMemo(() => {
    if (!data) return null;
    return buildStatement(data.lines, data.months, layout.blocks);
  }, [data, layout.blocks]);

  const categoryOptions = useMemo(
    () => buildLayoutCategoryOptions(data?.lines ?? []),
    [data?.lines],
  );

  const handleExport = useCallback(async () => {
    if (!statement) return;
    setExporting(true);
    try {
      const XLSX = await loadXlsx();
      const header = ["סעיף", ...statement.months.map(monthLabel), "סה\"כ"];
      const rows: Array<Array<string | number>> = [];

      for (const block of statement.blocks) {
        rows.push([block.name, ...statement.months.map(() => ""), block.total]);
        for (const category of block.categories) {
          rows.push([
            `  ${category.name}`,
            ...statement.months.map((month) => category.monthly[month] ?? 0),
            category.total,
          ]);
        }
      }

      rows.push(["רווח גולמי", ...statement.months.map(() => ""), statement.grossProfit]);
      rows.push(["רווח תפעולי", ...statement.months.map(() => ""), statement.operatingProfit]);
      rows.push(["רווח נקי", ...statement.months.map(() => ""), statement.netProfit]);

      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "P&L");
      XLSX.writeFile(wb, `pnl-${year}${month > 0 ? `-${String(month).padStart(2, "0")}` : ""}.xlsx`);
    } finally {
      setExporting(false);
    }
  }, [statement, year, month]);

  return (
    <div className="space-y-5 pb-10" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/finance" className="text-gray-400 hover:text-gray-600">
            <ChevronRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">דוח רווח והפסד ניהולי</h1>
            <p className="text-sm text-gray-500 mt-0.5">מבנה גמיש, גרירת סדר, וסיכומי ביניים חשבונאיים</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setEditorOpen(true)}
            disabled={!data || layout.loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <Settings className="w-4 h-4" />
            מבנה דוח וגרירה
          </button>
          <button
            onClick={handleExport}
            disabled={!statement || exporting}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            {exporting ? "מייצא..." : "Excel"}
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setYear((prev) => prev - 1)}
              className="w-8 h-8 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              ›
            </button>
            <span className="w-14 text-center font-semibold">{year}</span>
            <button
              onClick={() => setYear((prev) => prev + 1)}
              disabled={year >= currentYear}
              className="w-8 h-8 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              ‹
            </button>
          </div>

          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white"
          >
            <option value={0}>כל השנה</option>
            <option value={1}>ינואר</option>
            <option value={2}>פברואר</option>
            <option value={3}>מרץ</option>
            <option value={4}>אפריל</option>
            <option value={5}>מאי</option>
            <option value={6}>יוני</option>
            <option value={7}>יולי</option>
            <option value={8}>אוגוסט</option>
            <option value={9}>ספטמבר</option>
            <option value={10}>אוקטובר</option>
            <option value={11}>נובמבר</option>
            <option value={12}>דצמבר</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
        גרירה ושיוך קטגוריות מתבצעים בתוך חלון <strong>מבנה דוח וגרירה</strong>. במסך הראשי אפשר לפתוח/לסגור סעיפים בלחיצה על שורת הסעיף.
      </div>

      {(loading || layout.loading) && (
        <div className="py-10 flex items-center justify-center gap-2 text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>טוען נתונים...</span>
        </div>
      )}

      {(error || layout.error) && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {error ?? layout.error}
        </div>
      )}

      {statement && !loading && (
        <>
          <PnlSummaryCards view={statement} />
          <PnlStatementTable view={statement} />
        </>
      )}

      <LayoutEditorModal
        open={editorOpen}
        blocks={layout.blocks}
        categoryOptions={categoryOptions}
        saving={layout.saving}
        onClose={() => setEditorOpen(false)}
        onSave={layout.saveLayout}
      />
    </div>
  );
}
