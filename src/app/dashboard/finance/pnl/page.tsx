"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronRight, Loader2, TrendingUp, TrendingDown, Minus,
  Download, BarChart3,
} from "lucide-react";
import Link from "next/link";
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { loadXlsx } from "@/lib/loadXlsx";
import type { PnlResponse, PnlCategoryLine } from "@/app/api/finance/pnl/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return "₪" + Math.abs(n).toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function pct(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((curr - prev) / Math.abs(prev)) * 100);
}

const MONTH_NAMES = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני",
  "יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

function monthLabel(ym: string): string {
  const [, m] = ym.split("-");
  return MONTH_NAMES[(parseInt(m ?? "1") - 1)] ?? ym;
}

const TYPE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  income:        { bg: "bg-green-50",  text: "text-green-700",  label: "הכנסות"   },
  expense:       { bg: "bg-red-50",    text: "text-red-700",    label: "הוצאות"   },
  transfer:      { bg: "bg-blue-50",   text: "text-blue-700",   label: "העברות"   },
  ignore:        { bg: "bg-gray-50",   text: "text-gray-400",   label: "מתעלם"    },
  uncategorized: { bg: "bg-yellow-50", text: "text-yellow-700", label: "לא מסווג" },
};

const PIE_COLORS = [
  "#ef4444","#f97316","#eab308","#84cc16","#22c55e",
  "#14b8a6","#3b82f6","#8b5cf6","#ec4899","#6b7280",
];

// ─── Delta badge ─────────────────────────────────────────────────────────────

function DeltaBadge({ curr, prev }: { curr: number; prev: number }) {
  const delta = pct(curr, prev);
  if (delta === null) return null;
  const up = delta >= 0;
  return (
    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${up ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
      {up ? "▲" : "▼"} {Math.abs(delta)}%
    </span>
  );
}

// ─── PnL Section ─────────────────────────────────────────────────────────────

function PnlSection({ lines, months, type }: { lines: PnlCategoryLine[]; months: string[]; type: string }) {
  const style = TYPE_STYLE[type] ?? TYPE_STYLE["uncategorized"]!;
  const group = lines.filter((l) => l.category_type === type);
  if (group.length === 0) return null;

  const sectionTotal = group.reduce((s, l) => s + l.total, 0);
  const showMonths = months.length > 1;

  return (
    <div className={`rounded-xl overflow-hidden border border-gray-100 shadow-sm ${style.bg}`}>
      <div className={`flex items-center justify-between px-4 py-3 font-bold ${style.text}`}>
        <span>{style.label}</span>
        <span className="text-lg">{fmt(sectionTotal)}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" dir="rtl">
          {showMonths && (
            <thead className="border-b border-gray-100 bg-white/60">
              <tr>
                <th className="text-right px-4 py-2 font-medium text-gray-500">קטגוריה</th>
                {months.map((ym) => (
                  <th key={ym} className="text-center px-3 py-2 font-medium text-gray-500 whitespace-nowrap">
                    {monthLabel(ym)}
                  </th>
                ))}
                <th className="text-left px-4 py-2 font-medium text-gray-500">סה&quot;כ</th>
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-gray-100/50">
            {group.map((line) => (
              <tr key={line.category_id ?? "__none__"} className="bg-white/40 hover:bg-white/70 transition-colors">
                <td className="px-4 py-2.5 font-medium text-gray-700">{line.category_name}</td>
                {showMonths && months.map((ym) => (
                  <td key={ym} className={`px-3 py-2.5 text-center font-mono text-xs ${
                    (line.monthly[ym] ?? 0) !== 0 ? style.text : "text-gray-300"}`}>
                    {(line.monthly[ym] ?? 0) !== 0 ? fmt(line.monthly[ym] ?? 0) : "—"}
                  </td>
                ))}
                <td className={`px-4 py-2.5 text-left font-mono font-semibold ${style.text}`}>
                  {fmt(line.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Top 5 Expenses ──────────────────────────────────────────────────────────

function Top5Expenses({ lines }: { lines: PnlCategoryLine[] }) {
  const expenses = lines
    .filter((l) => l.category_type === "expense")
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  if (expenses.length === 0) return null;
  const max = expenses[0]?.total ?? 1;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-red-400" />
        5 הוצאות גדולות
      </h3>
      <div className="space-y-2">
        {expenses.map((line, i) => (
          <div key={line.category_id ?? i}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-gray-700 font-medium">{line.category_name}</span>
              <span className="text-red-600 font-mono font-semibold">{fmt(line.total)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-red-400 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.round((line.total / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Expense Pie ─────────────────────────────────────────────────────────────

function ExpensePie({ lines }: { lines: PnlCategoryLine[] }) {
  const expenses = lines
    .filter((l) => l.category_type === "expense" && l.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  if (expenses.length === 0) return null;

  const pieData = expenses.map((l) => ({ name: l.category_name, value: l.total }));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
      <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-red-400" />
        פילוח הוצאות
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <ReTooltip
            formatter={(val: number) => [fmt(val), ""]}
            contentStyle={{ direction: "rtl", fontSize: 12 }}
          />
          <Legend
            formatter={(val: string) => val}
            wrapperStyle={{ fontSize: 10, direction: "rtl" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PnlPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(0);
  const [data, setData] = useState<PnlResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPie, setShowPie] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = month > 0
        ? `/api/finance/pnl?year=${year}&month=${month}`
        : `/api/finance/pnl?year=${year}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("שגיאה בטעינת הדוח");
      setData(await res.json() as PnlResponse);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const handleExport = useCallback(async () => {
    if (!data) return;
    setExporting(true);
    try {
      const XLSX = await loadXlsx();
      const monthCols = data.months.map(monthLabel);
      const header = ["קטגוריה", "סוג", ...monthCols, 'סה"כ'];

      const rows = data.lines.map((l) => [
        l.category_name,
        TYPE_STYLE[l.category_type]?.label ?? l.category_type,
        ...data.months.map((ym) => l.monthly[ym] ?? 0),
        l.total,
      ]);

      rows.push([]);
      rows.push(["סה\"כ הכנסות", "", ...data.months.map(() => ""), data.income_total]);
      rows.push(["סה\"כ הוצאות", "", ...data.months.map(() => ""), data.expense_total]);
      rows.push(["רווח נקי",    "", ...data.months.map(() => ""), data.net]);

      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
      const wb = XLSX.utils.book_new();
      const sheetName = month > 0 ? `${MONTH_NAMES[month - 1]} ${year}` : `רו"ה ${year}`;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `דוח_רוה_${year}${month > 0 ? `_${String(month).padStart(2, "0")}` : ""}.xlsx`);
    } finally {
      setExporting(false);
    }
  }, [data, year, month]);

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/dashboard/finance" className="text-gray-400 hover:text-gray-600">
          <ChevronRight className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">דוח רווח והפסד</h1>
          <p className="text-sm text-gray-500 mt-0.5">סיכום הכנסות והוצאות לפי קטגוריה</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pie toggle */}
          <button
            onClick={() => setShowPie((v) => !v)}
            title={showPie ? "הצג טבלה" : "הצג פילוח"}
            className={`p-2 rounded-lg border transition-colors ${showPie ? "bg-red-50 border-red-200 text-red-600" : "border-gray-200 text-gray-400 hover:bg-gray-50"}`}
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={exporting || !data}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <Download className="w-4 h-4" />
            {exporting ? "מייצא..." : "Excel"}
          </button>

          {/* Year selector */}
          <div className="flex items-center gap-1">
            <button onClick={() => setYear((y) => y - 1)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">
              ›
            </button>
            <span className="font-bold text-gray-800 w-14 text-center">{year}</span>
            <button onClick={() => setYear((y) => y + 1)}
              disabled={year >= currentYear}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600 disabled:opacity-30">
              ‹
            </button>
          </div>

          {/* Month selector */}
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value={0}>כל השנה</option>
            {MONTH_NAMES.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-400 py-8 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>טוען...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {data && !loading && (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Income */}
            <div className="bg-green-50 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-600">סה&quot;כ הכנסות</span>
                {data.prev_income_total > 0 && (
                  <DeltaBadge curr={data.income_total} prev={data.prev_income_total} />
                )}
              </div>
              <p className="text-3xl font-bold text-green-700">{fmt(data.income_total)}</p>
              {data.prev_income_total > 0 && (
                <p className="text-xs text-green-500 mt-1">{year - 1}: {fmt(data.prev_income_total)}</p>
              )}
            </div>

            {/* Expense */}
            <div className="bg-red-50 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-5 h-5 text-red-500" />
                <span className="text-sm font-medium text-red-600">סה&quot;כ הוצאות</span>
                {data.prev_expense_total > 0 && (
                  <DeltaBadge curr={data.expense_total} prev={data.prev_expense_total} />
                )}
              </div>
              <p className="text-3xl font-bold text-red-700">{fmt(data.expense_total)}</p>
              {data.prev_expense_total > 0 && (
                <p className="text-xs text-red-500 mt-1">{year - 1}: {fmt(data.prev_expense_total)}</p>
              )}
            </div>

            {/* Net */}
            <div className={`rounded-2xl p-5 ${data.net >= 0 ? "bg-blue-50" : "bg-orange-50"}`}>
              <div className="flex items-center gap-2 mb-1">
                <Minus className={`w-5 h-5 ${data.net >= 0 ? "text-blue-500" : "text-orange-500"}`} />
                <span className={`text-sm font-medium ${data.net >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                  רווח נקי
                </span>
                {(data.prev_income_total > 0 || data.prev_expense_total > 0) && (
                  <DeltaBadge curr={data.net} prev={data.prev_net} />
                )}
              </div>
              <p className={`text-3xl font-bold ${data.net >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                {data.net < 0 ? "-" : ""}{fmt(data.net)}
              </p>
              {(data.prev_income_total > 0 || data.prev_expense_total > 0) && (
                <p className={`text-xs mt-1 ${data.net >= 0 ? "text-blue-500" : "text-orange-500"}`}>
                  {year - 1}: {data.prev_net < 0 ? "-" : ""}{fmt(data.prev_net)}
                </p>
              )}
            </div>
          </div>

          {/* ── Classification % ── */}
          {data.classified_pct < 100 && (
            <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">כיסוי סיווג</span>
                  <span className={`text-sm font-bold ${data.classified_pct >= 80 ? "text-green-600" : data.classified_pct >= 50 ? "text-amber-600" : "text-red-600"}`}>
                    {data.classified_pct}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${data.classified_pct >= 80 ? "bg-green-400" : data.classified_pct >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                    style={{ width: `${data.classified_pct}%` }}
                  />
                </div>
              </div>
              <Link
                href="/dashboard/finance/categories"
                className="text-xs text-blue-600 hover:underline font-medium shrink-0"
              >
                שפר סיווג →
              </Link>
            </div>
          )}

          {data.lines.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-center py-16 text-gray-400">
              <p className="font-medium text-lg">אין נתונים לשנה {year}</p>
              <p className="text-sm mt-2">העלה קבצי תנועות בנק והוסף קטגוריות סיווג</p>
              <div className="flex gap-3 justify-center mt-4">
                <Link href="/dashboard/finance" className="text-sm text-blue-600 hover:underline">תנועות בנק</Link>
                <span className="text-gray-300">·</span>
                <Link href="/dashboard/finance/categories" className="text-sm text-blue-600 hover:underline">קטגוריות</Link>
              </div>
            </div>
          ) : (
            <>
              {/* ── Top5 + Pie row ── */}
              {showPie ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Top5Expenses lines={data.lines} />
                  <ExpensePie lines={data.lines} />
                </div>
              ) : (
                <Top5Expenses lines={data.lines} />
              )}

              {/* ── P&L Sections ── */}
              <div className="space-y-4">
                {(["income", "expense", "transfer", "uncategorized", "ignore"] as const).map((type) => (
                  <PnlSection
                    key={type}
                    lines={data.lines}
                    months={data.months}
                    type={type}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
