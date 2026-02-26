"use client";

import { useState } from "react";
import { clsx } from "clsx";
import type { YearlyPnl, DbCustomGroup, MonthlyPnl } from "@/types/accounting";
import { PARENT_SECTION_LABELS, PARENT_SECTION_ORDER } from "@/types/accounting";

interface Props {
  yearlyPnl: YearlyPnl | null;
  customGroups: DbCustomGroup[];
  year: number;
  onGroupClick?: (groupId: string, month?: number) => void;
  onAmountClick?: (accountId: string, month?: number) => void;
}

type ViewMode = "yearly" | "compare";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const MONTH_SHORT = ["ינו","פבר","מרץ","אפר","מאי","יוני","יולי","אוג","ספט","אוק","נוב","דצמ"];

function fmt(val: number): string {
  if (val === 0) return "";
  const abs = Math.abs(val);
  if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000)    return `${(val / 1_000).toFixed(0)}K`;
  if (abs >= 1_000)     return `${(val / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 }).format(val);
}

function fmtFull(val: number): string {
  return new Intl.NumberFormat("he-IL", {
    style: "currency", currency: "ILS", maximumFractionDigits: 0,
  }).format(val);
}

function pctOfRev(val: number, rev: number): string {
  if (rev === 0) return "—";
  return `${Math.abs((val / rev) * 100).toFixed(1)}%`;
}

// ── Section color bands ──────────────────────────────────────
const SECTION_STYLES: Partial<Record<string, { bg: string; text: string; border: string }>> & { other: { bg: string; text: string; border: string } } = {
  cost_of_goods: { bg: "bg-red-50/60",    text: "text-red-800",    border: "border-red-100" },
  operating:     { bg: "bg-orange-50/60", text: "text-orange-800", border: "border-orange-100" },
  admin:         { bg: "bg-purple-50/60", text: "text-purple-800", border: "border-purple-100" },
  finance:       { bg: "bg-blue-50/60",   text: "text-blue-800",   border: "border-blue-100" },
  other:         { bg: "bg-gray-50/60",   text: "text-gray-700",   border: "border-gray-100" },
};

export default function PnlTableTab({
  yearlyPnl, customGroups, year,
  onGroupClick, onAmountClick,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("yearly");
  const [compareA, setCompareA] = useState(1);
  const [compareB, setCompareB] = useState(Math.min(new Date().getMonth() + 1, 12));
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    cost_of_goods: true, operating: true,
  });

  const toggleSection = (sec: string) => {
    setExpandedSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  if (!yearlyPnl) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
        <div className="text-5xl">📊</div>
        <p className="text-base font-medium text-gray-500">אין נתונים לשנת {year}</p>
        <p className="text-sm">העלה קובץ כרטסת בטאב &quot;קבצים&quot;</p>
      </div>
    );
  }

  const revTotal = yearlyPnl.total.revenue;
  const groupsBySection = new Map<string, DbCustomGroup[]>();
  for (const g of customGroups) {
    const list = groupsBySection.get(g.parent_section) ?? [];
    list.push(g);
    groupsBySection.set(g.parent_section, list);
  }

  const MONTH_LONG = MONTHS.map((m) =>
    new Date(2000, m - 1).toLocaleString("he-IL", { month: "long" }),
  );

  const getVal = (fn: (m: MonthlyPnl) => number, month: number) =>
    fn(yearlyPnl.months[month - 1]!);
  const getTot = (fn: (m: MonthlyPnl) => number) => fn(yearlyPnl.total);

  // ── Yearly view rows ─────────────────────────────────────────

  if (viewMode === "compare") {
    const mA = yearlyPnl.months[compareA - 1]!;
    const mB = yearlyPnl.months[compareB - 1]!;

    const rows: Array<{
      label: string; indent?: boolean; section?: boolean; subtotal?: boolean; final?: boolean;
      isExpense?: boolean; getA: (m: MonthlyPnl) => number; getB: (m: MonthlyPnl) => number;
    }> = [
      { label: "הכנסות", section: true, getA: m => m.revenue, getB: m => m.revenue },
    ];

    for (const sec of PARENT_SECTION_ORDER) {
      const sectionLabel = `(-) ${PARENT_SECTION_LABELS[sec]}`;
      rows.push({ label: sectionLabel, section: true, isExpense: true, getA: m => m.bySection[sec], getB: m => m.bySection[sec] });
      const groups = (groupsBySection.get(sec) ?? []).filter(
        g => (yearlyPnl.total.byGroup.get(g.id) ?? 0) !== 0
      );
      for (const g of groups) {
        rows.push({
          label: g.name, indent: true, isExpense: true,
          getA: m => m.byGroup.get(g.id) ?? 0,
          getB: m => m.byGroup.get(g.id) ?? 0,
        });
      }
      if (sec === "cost_of_goods") {
        rows.push({ label: "= רווח גולמי", subtotal: true, getA: m => m.grossProfit, getB: m => m.grossProfit });
      }
    }
    rows.push({ label: "= רווח תפעולי", subtotal: true, getA: m => m.operatingProfit, getB: m => m.operatingProfit });
    rows.push({ label: "= רווח נקי", final: true, getA: m => m.netProfit, getB: m => m.netProfit });

    return (
      <div className="space-y-4" dir="rtl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex bg-gray-100 rounded-xl p-0.5">
            {(["yearly", "compare"] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={clsx("px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                  viewMode === m ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}>
                {m === "yearly" ? "שנתי" : "השוואת חודשים"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <select value={compareA} onChange={e => setCompareA(+e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-sm font-medium focus:ring-2 focus:ring-primary-300">
              {MONTHS.map(m => <option key={m} value={m}>{MONTH_LONG[m-1]}</option>)}
            </select>
            <span className="text-gray-400 font-bold">מול</span>
            <select value={compareB} onChange={e => setCompareB(+e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-sm font-medium focus:ring-2 focus:ring-primary-300">
              {MONTHS.map(m => <option key={m} value={m}>{MONTH_LONG[m-1]}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gradient-to-l from-gray-50 to-gray-100 border-b border-gray-200">
                <th className="text-right py-3 px-4 font-bold text-gray-700 min-w-[200px]">סעיף</th>
                <th className="text-center py-3 px-4 font-bold text-primary-700 min-w-[120px] bg-primary-50/40">{MONTH_LONG[compareA-1]}</th>
                <th className="text-center py-3 px-4 font-bold text-primary-700 min-w-[120px] bg-primary-50/40">{MONTH_LONG[compareB-1]}</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600 min-w-[110px]">הפרש</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600 min-w-[80px]">% שינוי</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const vA = row.getA(mA), vB = row.getB(mB);
                const diff = vB - vA;
                const pct = vA !== 0 ? ((vB - vA) / Math.abs(vA)) * 100 : null;
                const isGood = row.isExpense ? diff < 0 : diff > 0;
                const isBad = row.isExpense ? diff > 0 : diff < 0;
                return (
                  <tr key={i} className={clsx("border-b border-gray-50 transition-colors",
                    row.final && "bg-gradient-to-l from-emerald-50/40 to-blue-50/40",
                    row.subtotal && !row.final && "bg-gray-50",
                  )}>
                    <td className={clsx("py-2.5 px-4",
                      row.indent ? "pl-8 text-gray-500" :
                      row.final ? "font-bold text-gray-900" :
                      row.subtotal ? "font-bold text-gray-800" :
                      row.section ? "font-semibold text-gray-700" : "text-gray-500"
                    )}>
                      {row.label}
                    </td>
                    {[vA, vB].map((v, j) => (
                      <td key={j} className={clsx("py-2.5 px-4 text-center tabular-nums bg-primary-50/20",
                        row.final || row.subtotal ? "font-bold" : "",
                        row.final ? (v >= 0 ? "text-emerald-700" : "text-red-600") :
                        row.isExpense ? "text-red-700" : "text-gray-800",
                      )}>
                        {v !== 0 ? fmtFull(v) : "—"}
                      </td>
                    ))}
                    <td className={clsx("py-2.5 px-4 text-center tabular-nums font-medium",
                      isGood ? "text-emerald-600" : isBad ? "text-red-600" : "text-gray-400",
                    )}>
                      {diff !== 0 ? `${diff > 0 ? "+" : ""}${fmtFull(diff)}` : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {pct !== null && Math.abs(pct) < 1000 ? (
                        <span className={clsx("inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold",
                          isGood ? "bg-emerald-100 text-emerald-700" :
                          isBad ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600",
                        )}>
                          {pct > 0 ? "▲" : "▼"}{Math.abs(pct).toFixed(0)}%
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

  // ── Yearly view ──────────────────────────────────────────────
  return (
    <div className="space-y-4" dir="rtl">
      {/* Mode switcher */}
      <div className="flex bg-gray-100 rounded-xl p-0.5 w-fit">
        {(["yearly", "compare"] as const).map(m => (
          <button key={m} onClick={() => setViewMode(m)}
            className={clsx("px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              viewMode === m ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}>
            {m === "yearly" ? "שנתי" : "השוואת חודשים"}
          </button>
        ))}
      </div>

      {/* Scrollable table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-[11px] border-collapse" style={{ minWidth: "900px" }}>
            {/* Sticky header */}
            <thead>
              <tr className="bg-gradient-to-l from-slate-700 to-slate-800 text-white">
                <th className="text-right py-3 px-4 font-bold text-sm sticky right-0 bg-slate-800 z-20 min-w-[180px] border-b-2 border-slate-600">
                  סעיף
                </th>
                {MONTHS.map(m => (
                  <th key={m} className="text-center py-3 px-1 font-semibold min-w-[58px] border-b-2 border-slate-600">
                    {MONTH_SHORT[m - 1]}
                  </th>
                ))}
                <th className="text-center py-3 px-3 font-bold min-w-[90px] bg-slate-900 border-b-2 border-slate-600">
                  סה&quot;כ
                </th>
                <th className="text-center py-3 px-2 font-semibold min-w-[52px] text-slate-300 border-b-2 border-slate-600">
                  %
                </th>
              </tr>
            </thead>
            <tbody>

              {/* ── Revenue row ── */}
              <tr className="bg-gradient-to-l from-emerald-50 to-teal-50 border-b-2 border-emerald-200">
                <td className="py-3 px-4 font-bold text-emerald-800 text-sm sticky right-0 bg-gradient-to-l from-emerald-50 to-teal-50 z-10">
                  הכנסות
                </td>
                {MONTHS.map(m => (
                  <td key={m} className="py-3 px-1.5 text-center tabular-nums font-semibold text-emerald-700 cursor-pointer hover:text-emerald-500 transition-colors"
                    onClick={() => onAmountClick?.("revenue", m)}>
                    {getVal(md => md.revenue, m) !== 0 ? fmt(getVal(md => md.revenue, m)) : <span className="text-gray-200">—</span>}
                  </td>
                ))}
                <td className="py-3 px-3 text-center tabular-nums font-bold text-emerald-800 bg-emerald-100">
                  {getTot(md => md.revenue) !== 0 ? fmtFull(getTot(md => md.revenue)) : "—"}
                </td>
                <td className="py-3 px-2 text-center text-[10px] text-emerald-600 font-semibold bg-emerald-50">
                  100%
                </td>
              </tr>

              {/* ── Expense sections ── */}
              {PARENT_SECTION_ORDER.map(section => {
                const groups = (groupsBySection.get(section) ?? []).filter(
                  g => (yearlyPnl.total.byGroup.get(g.id) ?? 0) !== 0
                );
                const sectionTotal = yearlyPnl.total.bySection[section];
                if (sectionTotal === 0 && groups.length === 0) return null;
                const expanded = !!expandedSections[section];
                const ss = (SECTION_STYLES[section] ?? SECTION_STYLES["other"])!;

                return (
                  <tbody key={section}>
                    {/* Section header */}
                    <tr className={clsx("border-b cursor-pointer hover:brightness-95 transition-all", ss.bg, ss.border)}
                      onClick={() => toggleSection(section)}>
                      <td className={clsx("py-2.5 px-4 font-semibold text-[12px] sticky right-0 z-10 flex items-center gap-1.5", ss.text, ss.bg)}>
                        <span className="text-[10px]">{expanded ? "▾" : "▸"}</span>
                        <span>(-) {PARENT_SECTION_LABELS[section]}</span>
                      </td>
                      {MONTHS.map(m => (
                        <td key={m} className={clsx("py-2.5 px-1.5 text-center tabular-nums font-medium", ss.text)}>
                          {getVal(md => md.bySection[section], m) !== 0
                            ? fmt(getVal(md => md.bySection[section], m))
                            : <span className="text-gray-200 opacity-50">—</span>}
                        </td>
                      ))}
                      <td className={clsx("py-2.5 px-3 text-center tabular-nums font-bold", ss.text, "brightness-90", ss.bg)}>
                        {sectionTotal !== 0 ? fmtFull(sectionTotal) : "—"}
                      </td>
                      <td className={clsx("py-2.5 px-2 text-center text-[10px] font-semibold", ss.text)}>
                        {pctOfRev(Math.abs(sectionTotal), revTotal)}
                      </td>
                    </tr>

                    {/* Group rows */}
                    {expanded && groups.map(g => (
                      <tr key={g.id}
                        className="border-b border-gray-50 hover:bg-gray-50/80 cursor-pointer transition-colors"
                        onClick={() => onGroupClick?.(g.id)}>
                        <td className="py-2 px-4 pl-10 text-gray-600 sticky right-0 bg-white z-10 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: g.color }} />
                          <span className="text-[11px]">{g.name}</span>
                        </td>
                        {MONTHS.map(m => {
                          const v = getVal(md => md.byGroup.get(g.id) ?? 0, m);
                          return (
                            <td key={m} className="py-2 px-1.5 text-center tabular-nums text-gray-600 hover:text-primary-600 transition-colors"
                              onClick={e => { e.stopPropagation(); onGroupClick?.(g.id, m); }}>
                              {v !== 0 ? fmt(v) : <span className="text-gray-100">—</span>}
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 text-center tabular-nums font-semibold text-red-700 bg-gray-50">
                          {(yearlyPnl.total.byGroup.get(g.id) ?? 0) !== 0
                            ? fmtFull(yearlyPnl.total.byGroup.get(g.id) ?? 0) : "—"}
                        </td>
                        <td className="py-2 px-2 text-center text-[10px] text-gray-400 bg-gray-50">
                          {pctOfRev(Math.abs(yearlyPnl.total.byGroup.get(g.id) ?? 0), revTotal)}
                        </td>
                      </tr>
                    ))}

                    {/* Subtotal after cost_of_goods */}
                    {section === "cost_of_goods" && (
                      <tr className="border-b-2 border-emerald-300 bg-gradient-to-l from-emerald-50 to-teal-50">
                        <td className="py-3 px-4 font-bold text-emerald-800 text-sm sticky right-0 bg-gradient-to-l from-emerald-50 to-teal-50 z-10">
                          = רווח גולמי
                        </td>
                        {MONTHS.map(m => {
                          const v = getVal(md => md.grossProfit, m);
                          return (
                            <td key={m} className={clsx("py-3 px-1.5 text-center tabular-nums font-bold",
                              v >= 0 ? "text-emerald-700" : "text-red-600")}>
                              {v !== 0 ? fmt(v) : <span className="text-gray-200">—</span>}
                            </td>
                          );
                        })}
                        <td className={clsx("py-3 px-3 text-center tabular-nums font-bold text-sm bg-emerald-100",
                          getTot(md => md.grossProfit) >= 0 ? "text-emerald-800" : "text-red-700")}>
                          {fmtFull(getTot(md => md.grossProfit))}
                        </td>
                        <td className="py-3 px-2 text-center text-[10px] font-bold text-emerald-700 bg-emerald-50">
                          {pctOfRev(getTot(md => md.grossProfit), revTotal)}
                        </td>
                      </tr>
                    )}

                    {/* Subtotal after operating + admin */}
                    {section === "admin" && (
                      <tr className="border-b-2 border-blue-300 bg-gradient-to-l from-blue-50 to-indigo-50">
                        <td className="py-3 px-4 font-bold text-blue-800 text-sm sticky right-0 bg-gradient-to-l from-blue-50 to-indigo-50 z-10">
                          = רווח תפעולי
                        </td>
                        {MONTHS.map(m => {
                          const v = getVal(md => md.operatingProfit, m);
                          return (
                            <td key={m} className={clsx("py-3 px-1.5 text-center tabular-nums font-bold",
                              v >= 0 ? "text-blue-700" : "text-red-600")}>
                              {v !== 0 ? fmt(v) : <span className="text-gray-200">—</span>}
                            </td>
                          );
                        })}
                        <td className={clsx("py-3 px-3 text-center tabular-nums font-bold text-sm bg-blue-100",
                          getTot(md => md.operatingProfit) >= 0 ? "text-blue-800" : "text-red-700")}>
                          {fmtFull(getTot(md => md.operatingProfit))}
                        </td>
                        <td className="py-3 px-2 text-center text-[10px] font-bold text-blue-700 bg-blue-50">
                          {pctOfRev(getTot(md => md.operatingProfit), revTotal)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                );
              })}

              {/* ── Net profit ── */}
              <tr className="bg-gradient-to-l from-slate-800 to-slate-900 border-t-2 border-slate-600">
                <td className="py-4 px-4 font-bold text-white text-sm sticky right-0 bg-gradient-to-l from-slate-800 to-slate-900 z-10">
                  = רווח נקי
                </td>
                {MONTHS.map(m => {
                  const v = getVal(md => md.netProfit, m);
                  return (
                    <td key={m} className={clsx("py-4 px-1.5 text-center tabular-nums font-bold",
                      v >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {v !== 0 ? fmt(v) : <span className="text-slate-600">—</span>}
                    </td>
                  );
                })}
                <td className={clsx("py-4 px-3 text-center tabular-nums font-bold text-sm",
                  getTot(md => md.netProfit) >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {fmtFull(getTot(md => md.netProfit))}
                </td>
                <td className={clsx("py-4 px-2 text-center text-[10px] font-bold",
                  getTot(md => md.netProfit) >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {pctOfRev(getTot(md => md.netProfit), revTotal)}
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      {/* YoY badge row */}
      <div className="flex items-center gap-2 text-xs text-gray-400 px-1">
        <span className="w-3 h-0.5 bg-emerald-400 rounded inline-block" />
        <span>לחץ על שורת קבוצה לפירוט חשבונות</span>
        <span className="mx-2">·</span>
        <span className="w-3 h-0.5 bg-blue-400 rounded inline-block" />
        <span>לחץ על ערך חודשי לסינון</span>
      </div>
    </div>
  );
}
