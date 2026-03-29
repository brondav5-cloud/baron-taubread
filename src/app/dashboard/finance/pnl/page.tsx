"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronRight, Loader2, TrendingUp, TrendingDown, Minus,
  Download, BarChart3, ChevronDown, Scale, X, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip,
  ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, LabelList,
} from "recharts";
import { loadXlsx } from "@/lib/loadXlsx";
import type { PnlResponse, PnlCategoryLine } from "@/app/api/finance/pnl/route";
import type { CategoryTransactionGroup } from "@/app/api/finance/pnl/category/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const TYPE_STYLE: Record<string, { bg: string; text: string; label: string; bar: string }> = {
  income:        { bg: "bg-green-50",  text: "text-green-700",  label: "הכנסות",   bar: "#22c55e" },
  expense:       { bg: "bg-red-50",    text: "text-red-700",    label: "הוצאות",   bar: "#ef4444" },
  transfer:      { bg: "bg-blue-50",   text: "text-blue-700",   label: "העברות",   bar: "#3b82f6" },
  ignore:        { bg: "bg-gray-50",   text: "text-gray-400",   label: "מתעלם",    bar: "#9ca3af" },
  uncategorized: { bg: "bg-yellow-50", text: "text-yellow-700", label: "לא מסווג", bar: "#eab308" },
};

const PIE_COLORS = [
  "#ef4444","#f97316","#eab308","#84cc16","#22c55e",
  "#14b8a6","#3b82f6","#8b5cf6","#ec4899","#6b7280",
];

const BANK_LABELS: Record<string, string> = {
  leumi: "לאומי", hapoalim: "הפועלים", mizrahi: "מזרחי",
};

// ─── Delta badge ──────────────────────────────────────────────────────────────

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

// ─── Expandable category row ──────────────────────────────────────────────────

function CategoryRow({
  line, months, style, year,
}: {
  line: PnlCategoryLine;
  months: string[];
  style: { bg: string; text: string; label: string; bar: string };
  year: number;
}) {
  const [open, setOpen] = useState(false);
  const [txData, setTxData] = useState<CategoryTransactionGroup[] | null>(null);
  const [txLoading, setTxLoading] = useState(false);
  const [activeMonth, setActiveMonth] = useState<string | null>(null);

  const showMonths = months.length > 1;
  const totalCols = showMonths ? months.length + 2 : 2;

  const chartData = Object.entries(line.monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, amount]) => ({ month: monthLabel(ym), ym, amount: Math.abs(amount) }));

  const handleToggle = async () => {
    const opening = !open;
    setOpen(opening);
    if (opening && txData === null) {
      setTxLoading(true);
      try {
        const param = line.category_id ? `categoryId=${line.category_id}` : "categoryId=";
        const res = await fetch(`/api/finance/pnl/category?year=${year}&${param}`);
        const d = await res.json() as { groups?: CategoryTransactionGroup[] };
        setTxData(d.groups ?? []);
      } catch {
        setTxData([]);
      } finally {
        setTxLoading(false);
      }
    }
  };

  const txFiltered = activeMonth
    ? (txData ?? []).filter((g) => g.date.slice(0, 7) === activeMonth)
    : (txData ?? []);

  const totalTxCount = txFiltered.reduce((s, g) => s + g.count, 0);

  return (
    <>
      {/* Main row */}
      <tr
        onClick={handleToggle}
        className={`cursor-pointer transition-colors ${open ? "bg-white/90" : "bg-white/40 hover:bg-white/70"}`}
      >
        <td className="px-4 py-3 font-medium text-gray-700">
          <div className="flex items-center gap-2">
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            <span>{line.category_name}</span>
          </div>
        </td>
        {showMonths && months.map((ym) => (
          <td key={ym} className={`px-3 py-3 text-center font-mono text-xs whitespace-nowrap ${
            (line.monthly[ym] ?? 0) !== 0 ? style.text : "text-gray-200"}`}>
            {(line.monthly[ym] ?? 0) !== 0 ? fmt(Math.abs(line.monthly[ym] ?? 0)) : "—"}
          </td>
        ))}
        <td className={`px-4 py-3 text-left font-mono font-semibold text-sm ${style.text}`}>
          {fmt(line.total)}
        </td>
      </tr>

      {/* Expanded panel */}
      {open && (
        <tr className="bg-white/60">
          <td colSpan={totalCols} className="px-0 py-0">
            <div className="border-t border-gray-100 p-4 space-y-4">

              {/* Monthly bar chart */}
              {chartData.length > 1 && (
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-2">פילוח חודשי — לחץ על עמודה לסינון תנועות</p>
                  <ResponsiveContainer width="100%" height={110}>
                    <BarChart data={chartData} barCategoryGap="35%"
                      onClick={(d) => {
                        if (d?.activePayload) {
                          const ym = (d.activePayload[0]?.payload as { ym: string }).ym;
                          setActiveMonth((prev) => prev === ym ? null : ym);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <ReTooltip
                        formatter={(val: number) => [fmt(val), line.category_name]}
                        contentStyle={{ fontSize: 11, direction: "rtl", borderRadius: 8, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
                        cursor={{ fill: "rgba(0,0,0,0.03)" }}
                      />
                      <Bar dataKey="amount" radius={[4, 4, 0, 0]} cursor="pointer">
                        <LabelList
                          dataKey="amount"
                          position="top"
                          formatter={(v: number) => {
                            if (!v) return "";
                            if (v >= 1000) return `₪${Math.round(v / 1000)}k`;
                            return `₪${Math.round(v)}`;
                          }}
                          style={{ fontSize: 8, fill: "#9ca3af" }}
                        />
                        {chartData.map((entry) => (
                          <Cell
                            key={entry.ym}
                            fill={activeMonth === null || activeMonth === entry.ym ? style.bar : `${style.bar}44`}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Month chips */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveMonth(null); }}
                      className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${!activeMonth ? "bg-gray-700 text-white border-gray-700" : "border-gray-200 text-gray-500 hover:border-gray-400"}`}
                    >
                      הכל
                    </button>
                    {chartData.map(({ month, ym }) => (
                      <button
                        key={ym}
                        onClick={(e) => { e.stopPropagation(); setActiveMonth((p) => p === ym ? null : ym); }}
                        className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${activeMonth === ym ? "bg-gray-700 text-white border-gray-700" : "border-gray-200 text-gray-500 hover:border-gray-400"}`}
                      >
                        {month}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Transactions */}
              <div onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500 font-semibold">
                    קיבוצי תנועות {activeMonth ? `— ${monthLabel(activeMonth)}` : ""}
                    {!txLoading && txData !== null && (
                      <span className="font-normal text-gray-300 mr-1">
                        ({txFiltered.length} שורות · {totalTxCount} תנועות)
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    שורות זהות (תאריך, תיאור, ספק, אסמכתא) מקובצות. לחיצה פותחת ניתוח מלא לתנועה המייצגת.
                  </p>
                </div>

                {txLoading ? (
                  <div className="flex justify-center py-6 text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : txFiltered.length === 0 ? (
                  <p className="text-xs text-gray-300 text-center py-4">אין תנועות</p>
                ) : (
                  <div className="max-h-56 overflow-y-auto divide-y divide-gray-50 rounded-lg border border-gray-100 bg-white">
                    {txFiltered.map((g) => (
                      <Link
                        key={g.representative_id}
                        href={`/dashboard/finance?tx=${g.representative_id}`}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50/60 transition-colors group"
                      >
                        <span className="text-xs text-gray-400 font-mono w-12 shrink-0">
                          {g.date.slice(5).split("-").reverse().join("/")}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm text-gray-700 truncate leading-tight">
                              {g.supplier_name ?? g.description}
                            </p>
                            {g.count > 1 && (
                              <span className="text-[10px] font-medium text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full shrink-0">
                                ×{g.count}
                              </span>
                            )}
                            <ExternalLink className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100 shrink-0" aria-hidden />
                          </div>
                          {g.notes && (
                            <p className="text-xs text-blue-500 truncate">{g.notes}</p>
                          )}
                          <div className="flex items-center gap-2">
                            {g.source_bank && (
                              <span className="text-xs text-gray-300">{BANK_LABELS[g.source_bank] ?? g.source_bank}</span>
                            )}
                            {g.reference && (
                              <span className="text-xs text-gray-300">#{g.reference}</span>
                            )}
                          </div>
                        </div>
                        <span className={`font-mono font-semibold text-sm shrink-0 ${style.text}`}>
                          {fmt(g.amount)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── PnL Section ─────────────────────────────────────────────────────────────

function PnlSection({ lines, months, type, year }: {
  lines: PnlCategoryLine[];
  months: string[];
  type: string;
  year: number;
}) {
  const style = TYPE_STYLE[type] ?? TYPE_STYLE["uncategorized"]!;
  const group = lines.filter((l) => l.category_type === type);
  if (group.length === 0) return null;

  const sectionTotal = group.reduce((s, l) => s + l.total, 0);
  const showMonths = months.length > 1;

  return (
    <div className={`rounded-2xl overflow-hidden border border-gray-100 shadow-sm ${style.bg}`}>
      <div className={`flex items-center justify-between px-5 py-3.5 font-bold ${style.text}`}>
        <span className="text-sm">{style.label}</span>
        <span className="text-lg">{fmt(sectionTotal)}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" dir="rtl">
          {showMonths && (
            <thead className="border-b border-gray-100 bg-white/50">
              <tr>
                <th className="text-right px-4 py-2 font-medium text-gray-400 text-xs">קטגוריה</th>
                {months.map((ym) => (
                  <th key={ym} className="text-center px-3 py-2 font-medium text-gray-400 text-xs whitespace-nowrap">
                    {monthLabel(ym)}
                  </th>
                ))}
                <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">סה&quot;כ</th>
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-gray-100/60">
            {group.map((line) => (
              <CategoryRow
                key={line.category_id ?? "__none__"}
                line={line}
                months={months}
                style={style}
                year={year}
              />
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
      <div className="space-y-2.5">
        {expenses.map((line, i) => (
          <div key={line.category_id ?? i}>
            <div className="flex justify-between text-xs mb-1">
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
          <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
            {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <ReTooltip formatter={(val: number) => [fmt(val), ""]} contentStyle={{ direction: "rtl", fontSize: 12 }} />
          <Legend formatter={(val: string) => val} wrapperStyle={{ fontSize: 10, direction: "rtl" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Month Comparison Panel ───────────────────────────────────────────────────

function MonthComparePanel({
  lines, months, year, onClose,
}: {
  lines: PnlCategoryLine[];
  months: string[];
  year: number;
  onClose: () => void;
}) {
  const [monthA, setMonthA] = useState(months[months.length - 2] ?? months[0] ?? "");
  const [monthB, setMonthB] = useState(months[months.length - 1] ?? "");

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  // Build comparison rows for meaningful types only
  const relevantTypes = ["income", "expense"] as const;
  const rows = lines.filter((l) =>
    relevantTypes.includes(l.category_type as "income" | "expense") && (l.monthly[monthA] || l.monthly[monthB])
  ).map((l) => {
    const a = Math.abs(l.monthly[monthA] ?? 0);
    const b = Math.abs(l.monthly[monthB] ?? 0);
    const delta = b - a;
    const deltaPct = a > 0 ? Math.round(((b - a) / a) * 100) : null;
    return { ...l, a, b, delta, deltaPct };
  }).sort((x, y) => Math.max(y.a, y.b) - Math.max(x.a, x.b));

  // Chart data for top categories
  const chartRows = rows
    .filter((r) => r.category_type === "expense")
    .slice(0, 8)
    .map((r) => ({ name: r.category_name, [monthLabel(monthA)]: r.a, [monthLabel(monthB)]: r.b }));

  const incomeA = lines.filter(l => l.category_type === "income").reduce((s, l) => s + Math.abs(l.monthly[monthA] ?? 0), 0);
  const incomeB = lines.filter(l => l.category_type === "income").reduce((s, l) => s + Math.abs(l.monthly[monthB] ?? 0), 0);
  const expenseA = lines.filter(l => l.category_type === "expense").reduce((s, l) => s + Math.abs(l.monthly[monthA] ?? 0), 0);
  const expenseB = lines.filter(l => l.category_type === "expense").reduce((s, l) => s + Math.abs(l.monthly[monthB] ?? 0), 0);

  const labelA = monthLabel(monthA);
  const labelB = monthLabel(monthB);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4" dir="rtl">
      <div className="bg-white w-full sm:max-w-3xl max-h-[94vh] sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Scale className="w-5 h-5 text-blue-500" />
            <h2 className="font-bold text-gray-900">השוואת חודשים — {year}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Month pickers */}
        <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-3 flex-wrap bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-400" />
            <select
              value={monthA}
              onChange={(e) => setMonthA(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {months.map((ym) => <option key={ym} value={ym}>{monthLabel(ym)}</option>)}
            </select>
          </div>
          <span className="text-gray-300 font-bold">vs</span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-400" />
            <select
              value={monthB}
              onChange={(e) => setMonthB(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {months.map((ym) => <option key={ym} value={ym}>{monthLabel(ym)}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* KPI summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-xs text-green-600 font-medium mb-1">הכנסות</p>
              <div className="flex items-end gap-3">
                <div>
                  <p className="text-xs text-gray-400">{labelA}</p>
                  <p className="font-bold text-green-700">{fmt(incomeA)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">{labelB}</p>
                  <p className="font-bold text-green-700">{fmt(incomeB)}</p>
                </div>
                {incomeA > 0 && (
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full mr-auto ${incomeB >= incomeA ? "bg-green-200 text-green-800" : "bg-red-100 text-red-700"}`}>
                    {incomeB >= incomeA ? "▲" : "▼"} {Math.abs(Math.round(((incomeB - incomeA) / incomeA) * 100))}%
                  </span>
                )}
              </div>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-xs text-red-600 font-medium mb-1">הוצאות</p>
              <div className="flex items-end gap-3">
                <div>
                  <p className="text-xs text-gray-400">{labelA}</p>
                  <p className="font-bold text-red-700">{fmt(expenseA)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">{labelB}</p>
                  <p className="font-bold text-red-700">{fmt(expenseB)}</p>
                </div>
                {expenseA > 0 && (
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full mr-auto ${expenseB <= expenseA ? "bg-green-200 text-green-800" : "bg-red-100 text-red-700"}`}>
                    {expenseB <= expenseA ? "▼" : "▲"} {Math.abs(Math.round(((expenseB - expenseA) / expenseA) * 100))}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Grouped bar chart for expenses */}
          {chartRows.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-2">השוואת הוצאות לפי קטגוריה</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartRows} layout="vertical" margin={{ right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => `₪${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#6b7280" }} axisLine={false} tickLine={false} width={80} />
                  <ReTooltip
                    formatter={(val: number) => [fmt(val), ""]}
                    contentStyle={{ fontSize: 11, direction: "rtl", borderRadius: 8, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey={labelA} fill="#60a5fa" radius={[0, 3, 3, 0]} barSize={8} />
                  <Bar dataKey={labelB} fill="#f97316" radius={[0, 3, 3, 0]} barSize={8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Comparison table */}
          <div>
            <p className="text-xs text-gray-500 font-semibold mb-2">פירוט לפי קטגוריה</p>
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm" dir="rtl">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">קטגוריה</th>
                    <th className="text-center px-3 py-2.5 font-medium text-xs">
                      <span className="flex items-center justify-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                        {labelA}
                      </span>
                    </th>
                    <th className="text-center px-3 py-2.5 font-medium text-xs">
                      <span className="flex items-center justify-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                        {labelB}
                      </span>
                    </th>
                    <th className="text-center px-3 py-2.5 font-medium text-gray-500 text-xs">שינוי</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((r) => {
                    const typeStyle = TYPE_STYLE[r.category_type] ?? TYPE_STYLE["uncategorized"]!;
                    const isExpense = r.category_type === "expense";
                    const good = isExpense ? r.delta < 0 : r.delta > 0;
                    return (
                      <tr key={r.category_id ?? "__none__"} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeStyle.bg} ${typeStyle.text}`}>
                              {typeStyle.label}
                            </span>
                            <span className="text-gray-700 font-medium text-xs">{r.category_name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono text-xs text-blue-600">
                          {r.a > 0 ? fmt(r.a) : <span className="text-gray-200">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono text-xs text-orange-500">
                          {r.b > 0 ? fmt(r.b) : <span className="text-gray-200">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {r.delta !== 0 && (
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${good ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {r.delta > 0 ? "▲" : "▼"}
                              {r.deltaPct !== null ? ` ${Math.abs(r.deltaPct)}%` : ` ${fmt(Math.abs(r.delta))}`}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
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
  const [showCompare, setShowCompare] = useState(false);

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
      rows.push(['סה"כ הכנסות', "", ...data.months.map(() => ""), data.income_total]);
      rows.push(['סה"כ הוצאות', "", ...data.months.map(() => ""), data.expense_total]);
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
          <p className="text-sm text-gray-500 mt-0.5">לחץ על קטגוריה לפירוט תנועות וגרף חודשי</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Compare months */}
          <button
            onClick={() => setShowCompare(true)}
            disabled={!data || data.months.length < 2}
            title="השוואת חודשים"
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 disabled:opacity-30 transition-colors"
          >
            <Scale className="w-4 h-4" />
            השוואה
          </button>

          {/* Pie toggle */}
          <button
            onClick={() => setShowPie((v) => !v)}
            title={showPie ? "הסתר פילוח" : "הצג פילוח"}
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
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">›</button>
            <span className="font-bold text-gray-800 w-14 text-center">{year}</span>
            <button onClick={() => setYear((y) => y + 1)}
              disabled={year >= currentYear}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600 disabled:opacity-30">‹</button>
          </div>

          {/* Month selector */}
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value={0}>כל השנה</option>
            {MONTH_NAMES.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
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

      {/* Month comparison modal */}
      {showCompare && data && data.months.length >= 2 && (
        <MonthComparePanel
          lines={data.lines}
          months={data.months}
          year={year}
          onClose={() => setShowCompare(false)}
        />
      )}

      {data && !loading && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-600">סה&quot;כ הכנסות</span>
                {data.prev_income_total > 0 && <DeltaBadge curr={data.income_total} prev={data.prev_income_total} />}
              </div>
              <p className="text-3xl font-bold text-green-700">{fmt(data.income_total)}</p>
              {data.prev_income_total > 0 && (
                <p className="text-xs text-green-500 mt-1">{year - 1}: {fmt(data.prev_income_total)}</p>
              )}
            </div>

            <div className="bg-red-50 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-5 h-5 text-red-500" />
                <span className="text-sm font-medium text-red-600">סה&quot;כ הוצאות</span>
                {data.prev_expense_total > 0 && <DeltaBadge curr={data.expense_total} prev={data.prev_expense_total} />}
              </div>
              <p className="text-3xl font-bold text-red-700">{fmt(data.expense_total)}</p>
              {data.prev_expense_total > 0 && (
                <p className="text-xs text-red-500 mt-1">{year - 1}: {fmt(data.prev_expense_total)}</p>
              )}
            </div>

            <div className={`rounded-2xl p-5 ${data.net >= 0 ? "bg-blue-50" : "bg-orange-50"}`}>
              <div className="flex items-center gap-2 mb-1">
                <Minus className={`w-5 h-5 ${data.net >= 0 ? "text-blue-500" : "text-orange-500"}`} />
                <span className={`text-sm font-medium ${data.net >= 0 ? "text-blue-600" : "text-orange-600"}`}>רווח נקי</span>
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

          {/* Classification % */}
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
              <Link href="/dashboard/finance/categories" className="text-xs text-blue-600 hover:underline font-medium shrink-0">
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
              {showPie ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Top5Expenses lines={data.lines} />
                  <ExpensePie lines={data.lines} />
                </div>
              ) : (
                <Top5Expenses lines={data.lines} />
              )}

              <div className="space-y-4">
                {(["income", "expense", "transfer", "uncategorized", "ignore"] as const).map((type) => (
                  <PnlSection
                    key={type}
                    lines={data.lines}
                    months={data.months}
                    type={type}
                    year={year}
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
