"use client";

import React, { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, Plus, X } from "lucide-react";
import { clsx } from "clsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { YearlyPnl, DbCustomGroup, MonthlyPnl } from "@/types/accounting";
import { PARENT_SECTION_LABELS, PARENT_SECTION_ORDER } from "@/types/accounting";

interface Props {
  yearlyPnl: YearlyPnl | null;
  prevYearlyPnl: YearlyPnl | null;
  customGroups: DbCustomGroup[];
  year: number;
}

type CompareMode = "yoy" | "months" | "quarterly";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const MONTH_LONG = MONTHS.map((m) =>
  new Date(2000, m - 1).toLocaleString("he-IL", { month: "long" }),
);

function fmtC(val: number): string {
  return new Intl.NumberFormat("he-IL", {
    style: "currency", currency: "ILS", maximumFractionDigits: 0,
  }).format(val);
}

function fmtM(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1_000_000) return `₪${(val / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `₪${(val / 1_000).toFixed(0)}K`;
  return fmtC(val);
}

function getHeatmapColor(value: number, avg: number, stdDev: number): string {
  if (stdDev === 0 || value === 0) return "";
  const z = (value - avg) / stdDev;
  if (z > 1.5) return "bg-green-500 text-white";
  if (z > 0.5) return "bg-green-200 text-green-900";
  if (z > -0.5) return "";
  if (z > -1.5) return "bg-red-200 text-red-900";
  return "bg-red-500 text-white";
}

// ── Period selector ───────────────────────────────────────────

interface Period {
  id: string;
  year: number;
  /** null = full year, otherwise start month (1-12) */
  monthFrom: number | null;
  /** null = same as monthFrom (single month) or full year */
  monthTo: number | null;
}

const PERIOD_COLORS = ["#3B82F6", "#8B5CF6", "#F97316", "#14B8A6"];

function periodLabel(p: Period): string {
  if (p.monthFrom === null) return `${p.year} (שנתי)`;
  const from = MONTH_LONG[p.monthFrom - 1] ?? "";
  const to = p.monthTo !== null && p.monthTo !== p.monthFrom
    ? MONTH_LONG[p.monthTo - 1]
    : null;
  if (to) return `${from}–${to} ${p.year}`;
  return `${from} ${p.year}`;
}

/** Sum monthly P&L data for a range of months */
function sumMonths(pnl: YearlyPnl, from: number, to: number): MonthlyPnl {
  const result: MonthlyPnl = {
    month: 0,
    revenue: 0,
    bySection: { cost_of_goods: 0, operating: 0, admin: 0, finance: 0, other: 0 },
    byGroup: new Map(),
    byAccount: new Map(),
    grossProfit: 0, operatingProfit: 0, adminTotal: 0, financeTotal: 0, otherTotal: 0, netProfit: 0,
  };
  for (let m = from; m <= to; m++) {
    const md = pnl.months[m - 1];
    if (!md) continue;
    result.revenue += md.revenue;
    for (const sec of ["cost_of_goods", "operating", "admin", "finance", "other"] as const) {
      result.bySection[sec] += md.bySection[sec];
    }
    md.byGroup.forEach((v, k) => result.byGroup.set(k, (result.byGroup.get(k) ?? 0) + v));
    md.byAccount.forEach((v, k) => result.byAccount.set(k, (result.byAccount.get(k) ?? 0) + v));
  }
  result.grossProfit = result.revenue - result.bySection.cost_of_goods;
  result.operatingProfit = result.grossProfit - result.bySection.operating;
  result.adminTotal = result.bySection.admin;
  result.financeTotal = result.bySection.finance;
  result.otherTotal = result.bySection.other;
  result.netProfit = result.operatingProfit - result.adminTotal - result.financeTotal - result.otherTotal;
  return result;
}

function getPeriodData(p: Period, currentYear: number, yearlyPnl: YearlyPnl, prevYearlyPnl: YearlyPnl | null): MonthlyPnl | null {
  const pnl = p.year === currentYear ? yearlyPnl : prevYearlyPnl;
  if (!pnl) return null;
  if (p.monthFrom === null) return pnl.total;
  const to = p.monthTo ?? p.monthFrom;
  if (to === p.monthFrom) return pnl.months[p.monthFrom - 1] ?? null;
  return sumMonths(pnl, p.monthFrom, to);
}

// ── CompRow ───────────────────────────────────────────────────

function CompRow({ label, values, isSection, isSubtotal, isFinal, isExpense, isBold, indent, baseIdx = 0 }: {
  label: string; values: (number | null)[]; isSection?: boolean;
  isSubtotal?: boolean; isFinal?: boolean; isExpense?: boolean;
  isBold?: boolean; indent?: boolean; baseIdx?: number;
}) {
  const base = values[baseIdx] ?? 0;
  const stickyBg = isFinal ? "bg-slate-800" : isSubtotal ? "bg-gray-50" : "bg-white";

  return (
    <tr className={clsx("border-b border-gray-50",
      isFinal && "bg-slate-800",
      isSubtotal && !isFinal && "bg-gray-50",
    )}>
      <td className={clsx("py-2.5 px-4 sticky right-0 z-10 shadow-[inset_-1px_0_0_#e5e7eb]", stickyBg,
        isFinal ? "font-bold text-white text-sm" :
        isSubtotal ? "font-bold text-gray-800" :
        isSection || isBold ? "font-semibold text-gray-700" :
        indent ? "text-gray-500 text-[11px]" : "text-gray-600",
      )} style={indent ? { paddingRight: "28px" } : undefined}>
        {label}
      </td>
      {values.map((v, i) => {
        if (v === null) return (
          <td key={i} className="py-2.5 px-3 text-center text-gray-300 text-xs min-w-[110px]">—</td>
        );
        const diff = i !== baseIdx ? v - base : null;
        const pct = diff !== null && base !== 0 ? (diff / Math.abs(base)) * 100 : null;
        const isGood = isExpense ? (diff !== null ? diff < 0 : false) : (diff !== null ? diff > 0 : v > 0);
        const isBadVal = isExpense ? (diff !== null ? diff > 0 : false) : (diff !== null ? diff < 0 : v < 0);

        return (
          <td key={i} className={clsx("py-2.5 px-3 text-center tabular-nums min-w-[110px]")}
            style={{ background: PERIOD_COLORS[i] ? `${PERIOD_COLORS[i]}10` : undefined }}>
            <div className="space-y-0.5">
              <div className={clsx("text-xs font-medium",
                isFinal || isSubtotal ? (v >= 0 ? "text-emerald-700 font-bold" : "text-red-600 font-bold") :
                isFinal ? (v >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold") :
                isExpense ? "text-red-600" : "text-gray-800",
              )}>
                {v !== 0 ? fmtC(v) : "—"}
              </div>
              {diff !== null && diff !== 0 && (
                <div className="flex items-center justify-center gap-0.5">
                  <span className={clsx("inline-flex items-center gap-0.5 text-[10px] font-bold px-1 py-0.5 rounded",
                    isGood ? "bg-emerald-100 text-emerald-700" :
                    isBadVal ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500",
                  )}>
                    {diff > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : diff < 0 ? <TrendingDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                    {pct !== null && Math.abs(pct) < 1000 ? `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%` : ""}
                  </span>
                </div>
              )}
            </div>
          </td>
        );
      })}
    </tr>
  );
}

// ── YoY Table ─────────────────────────────────────────────────

function YoyTable({ yearlyPnl, prevYearlyPnl, customGroups, year }: {
  yearlyPnl: YearlyPnl; prevYearlyPnl: YearlyPnl | null; customGroups: DbCustomGroup[]; year: number;
}) {
  const curr = yearlyPnl.total;
  const prev = prevYearlyPnl?.total;
  const prevYear = year - 1;

  const groupsBySection = useMemo(() => {
    const map = new Map<string, DbCustomGroup[]>();
    for (const g of customGroups) {
      const list = map.get(g.parent_section) ?? [];
      list.push(g);
      map.set(g.parent_section, list);
    }
    return map;
  }, [customGroups]);

  // Bar chart data
  const barData = PARENT_SECTION_ORDER
    .filter(sec => curr.bySection[sec] > 0 || (prev?.bySection[sec] ?? 0) > 0)
    .map(sec => ({
      name: PARENT_SECTION_LABELS[sec].replace("הוצאות ", "הוצ' "),
      [year]: curr.bySection[sec],
      [prevYear]: prev?.bySection[sec] ?? 0,
    }));

  return (
    <div className="space-y-5">
      {/* Visual bar chart */}
      {prev && barData.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h4 className="text-xs font-semibold text-gray-700 mb-4">השוואה ויזואלית לפי סעיפים</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9CA3AF" }} />
              <YAxis tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 9 }} width={45} />
              <Tooltip formatter={(v: number) => [fmtM(v), ""]} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey={prevYear} fill="#CBD5E1" radius={[3, 3, 0, 0]} name={String(prevYear)} />
              <Bar dataKey={year} fill="#3B82F6" radius={[3, 3, 0, 0]} name={String(year)} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto" dir="rtl">
          <table className="text-xs border-collapse" style={{ minWidth: "520px" }}>
            <thead>
              <tr className="bg-gradient-to-l from-slate-700 to-slate-800 text-white">
                <th className="text-right py-3 px-4 font-bold text-sm sticky right-0 bg-slate-800 z-20 min-w-[200px] shadow-[inset_-1px_0_0_#475569]">סעיף</th>
                <th className="text-center py-3 px-4 font-semibold min-w-[130px]" style={{ background: `${PERIOD_COLORS[0]}30` }}>{prevYear}</th>
                <th className="text-center py-3 px-4 font-bold min-w-[130px]" style={{ background: `${PERIOD_COLORS[1]}30` }}>{year} (נוכחי)</th>
              </tr>
            </thead>
            <tbody>
              <CompRow label="הכנסות נטו" values={[prev?.revenue ?? null, curr.revenue]} isBold baseIdx={0} />
              {PARENT_SECTION_ORDER.map(sec => {
                const cv = curr.bySection[sec];
                const pv = prev?.bySection[sec] ?? 0;
                if (cv === 0 && pv === 0) return null;
                const groups = (groupsBySection.get(sec) ?? []).filter(
                  g => (curr.byGroup.get(g.id) ?? 0) > 0 || (prev?.byGroup.get(g.id) ?? 0) > 0,
                );
                return (
                  <React.Fragment key={sec}>
                    <CompRow label={`(-) ${PARENT_SECTION_LABELS[sec]}`}
                      values={[pv !== 0 ? pv : null, cv]} isSection isExpense baseIdx={0} />
                    {groups.map(g => (
                      <CompRow key={g.id} label={`  ▸ ${g.name}`} isExpense indent baseIdx={0}
                        values={[(prev?.byGroup.get(g.id) ?? 0) !== 0 ? prev!.byGroup.get(g.id)! : null, curr.byGroup.get(g.id) ?? 0]} />
                    ))}
                    {sec === "cost_of_goods" && (
                      <CompRow label="= רווח גולמי" values={[prev?.grossProfit ?? null, curr.grossProfit]} isSubtotal baseIdx={0} />
                    )}
                    {sec === "admin" && (
                      <CompRow label="= רווח תפעולי" values={[prev?.operatingProfit ?? null, curr.operatingProfit]} isSubtotal baseIdx={0} />
                    )}
                  </React.Fragment>
                );
              })}
              <CompRow label="= רווח נקי" values={[prev?.netProfit ?? null, curr.netProfit]} isSubtotal isFinal baseIdx={0} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Quarterly Table ───────────────────────────────────────────

function QuarterlyTable({ yearlyPnl, prevYearlyPnl }: {
  yearlyPnl: YearlyPnl; prevYearlyPnl: YearlyPnl | null; customGroups?: DbCustomGroup[]; year?: number;
}) {
  // Aggregate months into quarters
  const getQuarter = (pnl: YearlyPnl, q: number): MonthlyPnl => {
    const months = [q * 3 - 2, q * 3 - 1, q * 3]; // 1-indexed months
    const result: MonthlyPnl = {
      month: q,
      revenue: 0,
      bySection: { cost_of_goods: 0, operating: 0, admin: 0, finance: 0, other: 0 },
      byGroup: new Map(),
      byAccount: new Map(),
      grossProfit: 0, operatingProfit: 0, adminTotal: 0, financeTotal: 0, otherTotal: 0, netProfit: 0,
    };
    for (const m of months) {
      const md = pnl.months[m - 1];
      if (!md) continue;
      result.revenue += md.revenue;
      for (const sec of PARENT_SECTION_ORDER) result.bySection[sec] += md.bySection[sec];
      md.byGroup.forEach((v, k) => result.byGroup.set(k, (result.byGroup.get(k) ?? 0) + v));
    }
    result.grossProfit = result.revenue - result.bySection.cost_of_goods;
    result.operatingProfit = result.grossProfit - result.bySection.operating;
    result.adminTotal = result.bySection.admin;
    result.financeTotal = result.bySection.finance;
    result.otherTotal = result.bySection.other;
    result.netProfit = result.operatingProfit - result.adminTotal - result.financeTotal - result.otherTotal;
    return result;
  };

  const quarters = [1, 2, 3, 4].map(q => getQuarter(yearlyPnl, q));
  const prevQuarters = prevYearlyPnl ? [1, 2, 3, 4].map(q => getQuarter(prevYearlyPnl, q)) : null;

  const getColor = (curr: number, prev: number | null, isExpense: boolean) => {
    if (prev === null || prev === 0) return "";
    const pct = ((curr - prev) / Math.abs(prev)) * 100;
    if (isExpense) {
      if (pct > 15) return "bg-red-100";
      if (pct < -10) return "bg-green-100";
    } else {
      if (pct > 10) return "bg-green-100";
      if (pct < -10) return "bg-red-100";
    }
    return "";
  };

  const rows: Array<{
    label: string; getVal: (m: MonthlyPnl) => number;
    isExpense?: boolean; isBold?: boolean; isResult?: boolean;
  }> = [
    { label: "הכנסות נטו", getVal: m => m.revenue, isBold: true },
    ...PARENT_SECTION_ORDER.map(sec => ({
      label: `(-) ${PARENT_SECTION_LABELS[sec]}`, getVal: (m: MonthlyPnl) => m.bySection[sec], isExpense: true,
    })),
    { label: "= רווח גולמי", getVal: m => m.grossProfit, isResult: true, isBold: true },
    { label: "= רווח תפעולי", getVal: m => m.operatingProfit, isResult: true, isBold: true },
    { label: "= רווח נקי", getVal: m => m.netProfit, isResult: true, isBold: true },
  ];

  const QUARTER_LABELS = ["Q1 (ינו-מרץ)", "Q2 (אפר-יוני)", "Q3 (יול-ספט)", "Q4 (אוק-דצמ)"];
  const QUARTER_COLORS = ["#3B82F6", "#8B5CF6", "#F97316", "#10B981"];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto" dir="rtl">
        <table className="text-xs border-collapse" style={{ minWidth: "700px" }}>
          <thead>
            <tr className="bg-gradient-to-l from-slate-700 to-slate-800 text-white">
              <th className="text-right py-3 px-4 font-bold text-sm sticky right-0 bg-slate-800 z-20 min-w-[200px] shadow-[inset_-1px_0_0_#475569]">סעיף</th>
              {QUARTER_LABELS.map((q, i) => (
                <th key={q} className="text-center py-3 px-3 font-semibold min-w-[110px]"
                  style={{ background: `${QUARTER_COLORS[i]}30` }}>
                  {q}
                </th>
              ))}
              <th className="text-center py-3 px-3 font-bold min-w-[100px] bg-slate-900">טרנד</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const vals = quarters.map(q => row.getVal(q));
              const prevVals = prevQuarters ? prevQuarters.map(q => row.getVal(q)) : null;
              

              // Trend: compare Q4 vs Q1
              const trendPct = vals[0] !== 0 ? ((vals[3]! - vals[0]!) / Math.abs(vals[0]!)) * 100 : null;

              return (
                <tr key={ri} className={clsx("border-b border-gray-50",
                  row.isResult && !row.label.includes("נקי") && "bg-gray-50",
                  row.label.includes("נקי") && "bg-slate-800",
                )}>
                  <td className={clsx("py-2.5 px-4 sticky right-0 z-10 shadow-[inset_-1px_0_0_#e5e7eb]",
                    row.label.includes("נקי") ? "bg-slate-800 text-white font-bold text-sm" :
                    row.isResult ? "bg-gray-50 font-bold text-gray-800" :
                    row.isBold ? "bg-white font-semibold text-gray-800" : "bg-white text-gray-600",
                  )}>
                    {row.label}
                  </td>
                  {vals.map((v, qi) => {
                    const pv = prevVals ? prevVals[qi] ?? null : null;
                    const bg = getColor(v, pv, !!row.isExpense);
                    return (
                      <td key={qi} className={clsx("py-2.5 px-3 text-center tabular-nums", bg,
                        row.label.includes("נקי") ? (v >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold") :
                        row.isResult ? (v >= 0 ? "text-emerald-700 font-bold" : "text-red-600 font-bold") :
                        row.isExpense ? "text-red-600" : "text-gray-800",
                      )}>
                        {fmtM(v)}
                      </td>
                    );
                  })}
                  <td className="py-2.5 px-3 text-center">
                    {trendPct !== null ? (
                      <span className={clsx("text-[11px] font-bold",
                        row.isExpense ? (trendPct > 0 ? "text-red-500" : "text-green-600") :
                        (trendPct > 0 ? "text-green-600" : "text-red-500"),
                      )}>
                        {trendPct > 5 ? "▲" : trendPct < -5 ? "▼" : "═"}
                        {Math.abs(trendPct) > 5 ? ` ${Math.abs(trendPct).toFixed(0)}%` : ""}
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Heatmap Table ─────────────────────────────────────────────

function HeatmapTable({ yearlyPnl }: { yearlyPnl: YearlyPnl }) {
  const MONTH_SHORT = ["ינו","פבר","מרץ","אפר","מאי","יוני","יולי","אוג","ספט","אוק","נוב","דצמ"];

  const metrics = [
    { label: "הכנסות", getVal: (m: MonthlyPnl) => m.revenue, isExpense: false },
    { label: "עלות המכר", getVal: (m: MonthlyPnl) => m.bySection.cost_of_goods, isExpense: true },
    { label: "רווח גולמי", getVal: (m: MonthlyPnl) => m.grossProfit, isExpense: false },
    { label: "הוצ' תפעול", getVal: (m: MonthlyPnl) => m.bySection.operating, isExpense: true },
    { label: "רווח נקי", getVal: (m: MonthlyPnl) => m.netProfit, isExpense: false },
  ];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <h4 className="text-xs font-semibold text-gray-700 mb-3">מפת חום חודשית — חריגות מהממוצע</h4>
      <div className="overflow-x-auto" dir="rtl">
        <table className="text-[11px] border-collapse w-full">
          <thead>
            <tr>
              <th className="text-right py-2 px-3 font-semibold text-gray-600 min-w-[120px]">מדד</th>
              {MONTH_SHORT.map(m => (
                <th key={m} className="text-center py-2 px-1.5 font-medium text-gray-500 min-w-[52px]">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map(({ label, getVal, isExpense }) => {
              const vals = yearlyPnl.months.map(m => getVal(m));
              const nonZero = vals.filter(v => v !== 0);
              const avg = nonZero.length > 0 ? nonZero.reduce((s, v) => s + v, 0) / nonZero.length : 0;
              const variance = nonZero.length > 0 ? nonZero.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / nonZero.length : 0;
              const stdDev = Math.sqrt(variance);

              return (
                <tr key={label} className="border-t border-gray-50">
                  <td className="py-2 px-3 font-medium text-gray-700">{label}</td>
                  {vals.map((v, mi) => {
                    const colorClass = isExpense
                      ? getHeatmapColor(-v, -avg, stdDev)
                      : getHeatmapColor(v, avg, stdDev);
                    return (
                      <td key={mi} className={clsx("py-2 px-1 text-center tabular-nums rounded transition-colors", colorClass)}>
                        {v !== 0 ? (Math.abs(v) >= 1_000_000
                          ? `${(v / 1_000_000).toFixed(1)}M`
                          : Math.abs(v) >= 1_000
                          ? `${(v / 1_000).toFixed(0)}K`
                          : String(Math.round(v))) : "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-gray-400 mt-2">
        🟩 מעל ממוצע · ⬜ סביב ממוצע · 🟥 מתחת לממוצע (מבוסס על סטיית תקן)
      </p>
    </div>
  );
}

// ── Flexible Multi-Period Comparison ─────────────────────────

function FlexComparison({ yearlyPnl, prevYearlyPnl, customGroups, year }: {
  yearlyPnl: YearlyPnl; prevYearlyPnl: YearlyPnl | null; customGroups: DbCustomGroup[]; year: number;
}) {
  const prevYear = year - 1;
  const [periods, setPeriods] = useState<Period[]>([
    { id: "a", year, monthFrom: 1, monthTo: 3 },
    { id: "b", year: prevYearlyPnl ? prevYear : year, monthFrom: 1, monthTo: 3 },
  ]);

  const addPeriod = () => {
    if (periods.length >= 4) return;
    const last = periods[periods.length - 1];
    setPeriods(prev => [...prev, {
      id: crypto.randomUUID(),
      year: last?.year ?? year,
      monthFrom: last?.monthFrom ?? 1,
      monthTo: last?.monthTo ?? 3,
    }]);
  };

  const removePeriod = (id: string) => {
    if (periods.length <= 2) return;
    setPeriods(prev => prev.filter(p => p.id !== id));
  };

  const updatePeriod = (id: string, patch: Partial<Period>) => {
    setPeriods(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, ...patch };
      // Ensure monthTo >= monthFrom when both are set
      if (updated.monthFrom !== null && updated.monthTo !== null && updated.monthTo < updated.monthFrom) {
        updated.monthTo = updated.monthFrom;
      }
      return updated;
    }));
  };

  const availableYears = [year, ...(prevYearlyPnl ? [prevYear] : [])];
  const groupsBySection = useMemo(() => {
    const map = new Map<string, DbCustomGroup[]>();
    for (const g of customGroups) {
      const list = map.get(g.parent_section) ?? [];
      list.push(g);
      map.set(g.parent_section, list);
    }
    return map;
  }, [customGroups]);

  const periodData = periods.map(p => getPeriodData(p, year, yearlyPnl, prevYearlyPnl));

  return (
    <div className="space-y-4">
      {/* Period selectors */}
      <div className="flex flex-wrap gap-3 items-start">
        {periods.map((p, i) => (
          <div key={p.id}
            className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm flex-wrap">
            <div className="w-3 h-3 rounded-full shrink-0"
              style={{ background: PERIOD_COLORS[i] ?? "#6B7280" }} />

            {/* Year */}
            <select value={p.year} onChange={e => updatePeriod(p.id, { year: +e.target.value })}
              className="text-xs font-semibold border-0 bg-transparent focus:ring-0 text-gray-800 cursor-pointer">
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            {/* Month From */}
            <select value={p.monthFrom ?? "full"}
              onChange={e => {
                const v = e.target.value === "full" ? null : +e.target.value;
                updatePeriod(p.id, { monthFrom: v, monthTo: v });
              }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:ring-1 focus:ring-primary-300">
              <option value="full">שנתי</option>
              {MONTHS.map(m => <option key={m} value={m}>{MONTH_LONG[m - 1]}</option>)}
            </select>

            {/* Month To (only when monthFrom is set) */}
            {p.monthFrom !== null && (
              <>
                <span className="text-gray-400 text-xs">עד</span>
                <select value={p.monthTo ?? p.monthFrom}
                  onChange={e => updatePeriod(p.id, { monthTo: +e.target.value })}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:ring-1 focus:ring-primary-300">
                  {MONTHS.filter(m => m >= (p.monthFrom ?? 1)).map(m => (
                    <option key={m} value={m}>{MONTH_LONG[m - 1]}</option>
                  ))}
                </select>
              </>
            )}

            {periods.length > 2 && (
              <button onClick={() => removePeriod(p.id)} className="text-gray-300 hover:text-red-400 transition-colors mr-1">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        {periods.length < 4 && (
          <button onClick={addPeriod}
            className="flex items-center gap-1.5 px-3 py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-primary-300 hover:text-primary-600 transition-colors">
            <Plus className="w-3.5 h-3.5" /> הוסף תקופה
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto" dir="rtl">
          <table className="text-xs border-collapse" style={{ minWidth: `${340 + periods.length * 130}px` }}>
            <thead>
              <tr className="bg-gradient-to-l from-slate-700 to-slate-800 text-white">
                <th className="text-right py-3 px-4 font-bold text-sm sticky right-0 bg-slate-800 z-20 min-w-[200px] shadow-[inset_-1px_0_0_#475569]">סעיף</th>
                {periods.map((p, i) => (
                  <th key={p.id} className="text-center py-3 px-4 font-semibold min-w-[120px]"
                    style={{ background: `${PERIOD_COLORS[i]}30` }}>
                    <div>{periodLabel(p)}</div>
                    {i > 0 && <div className="text-[10px] font-normal opacity-70">מול {periodLabel(periods[0]!)}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <CompRow label="הכנסות נטו" isBold baseIdx={0} values={periodData.map(d => d?.revenue ?? null)} />
              {PARENT_SECTION_ORDER.map(sec => {
                const hasAny = periodData.some(d => (d?.bySection[sec] ?? 0) !== 0);
                if (!hasAny) return null;
                const groups = (groupsBySection.get(sec) ?? []).filter(
                  g => periodData.some(d => (d?.byGroup.get(g.id) ?? 0) !== 0)
                );
                return (
                  <React.Fragment key={sec}>
                    <CompRow label={`(-) ${PARENT_SECTION_LABELS[sec]}`} isSection isExpense baseIdx={0}
                      values={periodData.map(d => d?.bySection[sec] ?? null)} />
                    {groups.map(g => (
                      <CompRow key={g.id} label={`  ▸ ${g.name}`} isExpense indent baseIdx={0}
                        values={periodData.map(d => d?.byGroup.get(g.id) ?? null)} />
                    ))}
                    {sec === "cost_of_goods" && (
                      <CompRow label="= רווח גולמי" isSubtotal baseIdx={0} values={periodData.map(d => d?.grossProfit ?? null)} />
                    )}
                    {sec === "admin" && (
                      <CompRow label="= רווח תפעולי" isSubtotal baseIdx={0} values={periodData.map(d => d?.operatingProfit ?? null)} />
                    )}
                  </React.Fragment>
                );
              })}
              <CompRow label="= רווח נקי" isSubtotal isFinal baseIdx={0} values={periodData.map(d => d?.netProfit ?? null)} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export default function ComparisonsTab({ yearlyPnl, prevYearlyPnl, customGroups, year }: Props) {
  const [mode, setMode] = useState<CompareMode>("yoy");

  if (!yearlyPnl) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
        <div className="text-5xl">📊</div>
        <p className="text-base font-medium text-gray-500">אין נתונים לשנת {year}</p>
        <p className="text-sm">העלה קובץ כרטסת בטאב &quot;קבצים&quot;</p>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex gap-1 bg-gray-100 rounded-xl p-0.5 w-fit">
        {([
          { id: "yoy", label: `📊 ${year} מול ${year - 1}` },
          { id: "months", label: "📅 תקופות גמישות" },
          { id: "quarterly", label: "🗂 רבעונים" },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setMode(t.id)}
            className={clsx("px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              mode === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700",
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {mode === "yoy" && (
        prevYearlyPnl ? (
          <div className="space-y-5">
            <YoyTable yearlyPnl={yearlyPnl} prevYearlyPnl={prevYearlyPnl} customGroups={customGroups} year={year} />
            <HeatmapTable yearlyPnl={yearlyPnl} />
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-2xl text-gray-400">
            <div className="text-4xl mb-3">📁</div>
            <p className="text-sm font-medium text-gray-500">אין נתונים לשנת {year - 1}</p>
            <p className="text-xs mt-1">העלה קובץ כרטסת עבור {year - 1}</p>
          </div>
        )
      )}

      {mode === "months" && (
        <FlexComparison yearlyPnl={yearlyPnl} prevYearlyPnl={prevYearlyPnl} customGroups={customGroups} year={year} />
      )}

      {mode === "quarterly" && (
        <div className="space-y-5">
          <QuarterlyTable yearlyPnl={yearlyPnl} prevYearlyPnl={prevYearlyPnl} customGroups={customGroups} year={year} />
          <HeatmapTable yearlyPnl={yearlyPnl} />
        </div>
      )}
    </div>
  );
}
