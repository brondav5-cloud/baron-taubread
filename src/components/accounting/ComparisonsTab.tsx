"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Plus, X } from "lucide-react";
import { clsx } from "clsx";
import type { YearlyPnl, DbCustomGroup, MonthlyPnl } from "@/types/accounting";
import { PARENT_SECTION_LABELS, PARENT_SECTION_ORDER } from "@/types/accounting";

interface Props {
  yearlyPnl: YearlyPnl | null;
  prevYearlyPnl: YearlyPnl | null;
  customGroups: DbCustomGroup[];
  year: number;
}

type CompareMode = "yoy" | "months";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const MONTH_LONG = MONTHS.map((m) =>
  new Date(2000, m - 1).toLocaleString("he-IL", { month: "long" }),
);

function fmtC(val: number): string {
  return new Intl.NumberFormat("he-IL", {
    style: "currency", currency: "ILS", maximumFractionDigits: 0,
  }).format(val);
}

// ── Column period selector ────────────────────────────────────

interface Period {
  id: string;
  year: number;
  month: number | null; // null = full year
}

const PERIOD_HEADER_BG = [
  "bg-blue-50",
  "bg-violet-50",
  "bg-orange-50",
  "bg-teal-50",
];
const PERIOD_TEXT = [
  "text-blue-700",
  "text-violet-700",
  "text-orange-700",
  "text-teal-700",
];

function periodLabel(p: Period): string {
  if (p.month === null) return `${p.year} (שנתי)`;
  return `${MONTH_LONG[p.month - 1]} ${p.year}`;
}

function getPeriodData(p: Period, currentYear: number, yearlyPnl: YearlyPnl, prevYearlyPnl: YearlyPnl | null): MonthlyPnl | null {
  const pnl = p.year === currentYear ? yearlyPnl : prevYearlyPnl;
  if (!pnl) return null;
  if (p.month === null) return pnl.total;
  return pnl.months[p.month - 1] ?? null;
}

// ── CompRow ──────────────────────────────────────────────────

interface CompRowProps {
  label: string;
  values: (number | null)[];
  isSection?: boolean;
  isSubtotal?: boolean;
  isFinal?: boolean;
  isExpense?: boolean;
  isBold?: boolean;
  indent?: boolean;
  baseIdx?: number; // which column is "base" for diff calculation
}

function CompRow({ label, values, isSection, isSubtotal, isFinal, isExpense, isBold, indent, baseIdx = 0 }: CompRowProps) {
  const base = values[baseIdx] ?? 0;
  return (
    <tr className={clsx("border-b border-gray-50 transition-colors hover:bg-gray-50/50",
      isFinal && "bg-gradient-to-l from-slate-50/60 to-emerald-50/40",
      isSubtotal && !isFinal && "bg-gray-50/70",
    )}>
      <td className={clsx("py-2.5 px-4 sticky right-0 z-10 bg-inherit",
        isFinal ? "font-bold text-gray-900 text-sm bg-white" :
        isSubtotal ? "font-bold text-gray-800 bg-white" :
        isSection || isBold ? "font-semibold text-gray-700" :
        indent ? "text-gray-500 text-[11px] bg-white" : "text-gray-600 bg-white",
      )} style={indent ? { paddingRight: "24px" } : undefined}>
        {label}
      </td>
      {values.map((v, i) => {
        if (v === null) return (
          <td key={i} className="py-2.5 px-3 text-center text-gray-300 text-xs min-w-[110px]">—</td>
        );
        const diff = i !== baseIdx ? v - base : null;
        const pct = diff !== null && base !== 0 ? (diff / Math.abs(base)) * 100 : null;
        const isGood = isExpense ? (diff !== null ? diff < 0 : false) : (diff !== null ? diff > 0 : v > 0);
        const isBad = isExpense ? (diff !== null ? diff > 0 : false) : (diff !== null ? diff < 0 : v < 0);
        return (
          <td key={i} className={clsx("py-2.5 px-3 text-center tabular-nums min-w-[110px]",
            PERIOD_HEADER_BG[i] || "bg-white",
          )}>
            <div className="space-y-0.5">
              <div className={clsx("text-xs font-medium",
                isFinal || isSubtotal ? (v >= 0 ? "text-emerald-700 font-bold" : "text-red-600 font-bold") :
                isExpense ? "text-red-600" : "text-gray-800",
              )}>
                {v !== 0 ? fmtC(v) : "—"}
              </div>
              {diff !== null && diff !== 0 && (
                <div className="flex items-center justify-center gap-0.5">
                  <span className={clsx("inline-flex items-center gap-0.5 text-[10px] font-bold px-1 py-0.5 rounded",
                    isGood ? "bg-emerald-100 text-emerald-700" :
                    isBad ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500",
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

// ── YoY Table ────────────────────────────────────────────────

function YoyTable({ yearlyPnl, prevYearlyPnl, customGroups, year }: {
  yearlyPnl: YearlyPnl;
  prevYearlyPnl: YearlyPnl | null;
  customGroups: DbCustomGroup[];
  year: number;
}) {
  const curr = yearlyPnl.total;
  const prev = prevYearlyPnl?.total;
  const prevYear = year - 1;

  const groupsBySection = new Map<string, DbCustomGroup[]>();
  for (const g of customGroups) {
    const list = groupsBySection.get(g.parent_section) ?? [];
    list.push(g);
    groupsBySection.set(g.parent_section, list);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse" style={{ minWidth: "520px" }}>
          <thead>
            <tr className="bg-gradient-to-l from-slate-700 to-slate-800 text-white">
              <th className="text-right py-3 px-4 font-bold text-sm sticky right-0 bg-slate-800 z-20 min-w-[180px]">סעיף</th>
              <th className={clsx("text-center py-3 px-4 font-semibold min-w-[120px]", PERIOD_HEADER_BG[0], PERIOD_TEXT[0])}>
                {prevYear}
              </th>
              <th className={clsx("text-center py-3 px-4 font-bold min-w-[120px]", PERIOD_HEADER_BG[1], PERIOD_TEXT[1])}>
                {year} (נוכחי)
              </th>
            </tr>
          </thead>
          <tbody>
            <CompRow label="הכנסות נטו" values={[prev?.revenue ?? null, curr.revenue]} isBold baseIdx={0} />
            {PARENT_SECTION_ORDER.map((sec) => {
              const currVal = curr.bySection[sec];
              const prevVal = prev?.bySection[sec] ?? 0;
              if (currVal === 0 && prevVal === 0) return null;
              const groups = (groupsBySection.get(sec) ?? []).filter(
                g => (curr.byGroup.get(g.id) ?? 0) > 0 || (prev?.byGroup.get(g.id) ?? 0) > 0,
              );
              return (
                <tbody key={sec}>
                  <CompRow label={`(-) ${PARENT_SECTION_LABELS[sec]}`}
                    values={[prevVal !== 0 ? prevVal : null, currVal]} isSection isExpense baseIdx={0} />
                  {groups.map((g) => (
                    <CompRow key={g.id} label={`  ▸ ${g.name}`} isExpense indent baseIdx={0}
                      values={[(prev?.byGroup.get(g.id) ?? 0) !== 0 ? (prev?.byGroup.get(g.id) ?? 0) : null,
                               curr.byGroup.get(g.id) ?? 0]} />
                  ))}
                  {sec === "cost_of_goods" && (
                    <CompRow label="= רווח גולמי" values={[prev?.grossProfit ?? null, curr.grossProfit]} isSubtotal baseIdx={0} />
                  )}
                  {sec === "admin" && (
                    <CompRow label="= רווח תפעולי" values={[prev?.operatingProfit ?? null, curr.operatingProfit]} isSubtotal baseIdx={0} />
                  )}
                </tbody>
              );
            })}
            <CompRow label="= רווח נקי" values={[prev?.netProfit ?? null, curr.netProfit]} isSubtotal isFinal baseIdx={0} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Flexible Multi-Period Comparison ────────────────────────────

function FlexComparison({ yearlyPnl, prevYearlyPnl, customGroups, year }: {
  yearlyPnl: YearlyPnl;
  prevYearlyPnl: YearlyPnl | null;
  customGroups: DbCustomGroup[];
  year: number;
}) {
  const prevYear = year - 1;

  const [periods, setPeriods] = useState<Period[]>([
    { id: "a", year, month: 1 },
    { id: "b", year, month: 2 },
  ]);

  const addPeriod = () => {
    if (periods.length >= 4) return;
    const nextMonth = (periods[periods.length - 1]?.month ?? 0) + 1;
    setPeriods(prev => [...prev, {
      id: crypto.randomUUID(),
      year,
      month: nextMonth <= 12 ? nextMonth : null,
    }]);
  };

  const removePeriod = (id: string) => {
    if (periods.length <= 2) return;
    setPeriods(prev => prev.filter(p => p.id !== id));
  };

  const updatePeriod = (id: string, field: keyof Period, value: number | null) => {
    setPeriods(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const availableYears = [year, ...(prevYearlyPnl ? [prevYear] : [])];

  const groupsBySection = new Map<string, DbCustomGroup[]>();
  for (const g of customGroups) {
    const list = groupsBySection.get(g.parent_section) ?? [];
    list.push(g);
    groupsBySection.set(g.parent_section, list);
  }

  const periodData = periods.map(p => getPeriodData(p, year, yearlyPnl, prevYearlyPnl));

  return (
    <div className="space-y-4">
      {/* Period pickers */}
      <div className="flex flex-wrap gap-3 items-start">
        {periods.map((p, i) => (
          <div key={p.id}
            className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
            <div className={clsx("w-3 h-3 rounded-full shrink-0", ["bg-blue-500","bg-violet-500","bg-orange-500","bg-teal-500"][i])} />
            <select value={p.year}
              onChange={e => updatePeriod(p.id, "year", +e.target.value)}
              className="text-xs font-semibold border-0 bg-transparent focus:ring-0 pr-0 text-gray-800 cursor-pointer">
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={p.month ?? "full"}
              onChange={e => updatePeriod(p.id, "month", e.target.value === "full" ? null : +e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:ring-1 focus:ring-primary-300">
              <option value="full">שנתי</option>
              {MONTHS.map(m => <option key={m} value={m}>{MONTH_LONG[m - 1]}</option>)}
            </select>
            {periods.length > 2 && (
              <button onClick={() => removePeriod(p.id)}
                className="text-gray-300 hover:text-red-400 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        {periods.length < 4 && (
          <button onClick={addPeriod}
            className="flex items-center gap-1.5 px-3 py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-primary-300 hover:text-primary-600 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            הוסף תקופה
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse" style={{ minWidth: `${340 + periods.length * 130}px` }}>
            <thead>
              <tr className="bg-gradient-to-l from-slate-700 to-slate-800 text-white">
                <th className="text-right py-3 px-4 font-bold text-sm sticky right-0 bg-slate-800 z-20 min-w-[180px]">סעיף</th>
                {periods.map((p, i) => (
                  <th key={p.id} className={clsx("text-center py-3 px-4 font-semibold min-w-[120px]", PERIOD_HEADER_BG[i], PERIOD_TEXT[i])}>
                    <div>{periodLabel(p)}</div>
                    {i > 0 && <div className="text-[10px] font-normal opacity-70">מול {periodLabel(periods[0]!)}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <CompRow label="הכנסות נטו" isBold baseIdx={0}
                values={periodData.map(d => d?.revenue ?? null)} />

              {PARENT_SECTION_ORDER.map((sec) => {
                const hasAny = periodData.some(d => (d?.bySection[sec] ?? 0) !== 0);
                if (!hasAny) return null;
                const groups = (groupsBySection.get(sec) ?? []).filter(
                  g => periodData.some(d => (d?.byGroup.get(g.id) ?? 0) !== 0)
                );
                return (
                  <tbody key={sec}>
                    <CompRow label={`(-) ${PARENT_SECTION_LABELS[sec]}`} isSection isExpense baseIdx={0}
                      values={periodData.map(d => d?.bySection[sec] ?? null)} />
                    {groups.map(g => (
                      <CompRow key={g.id} label={`  ▸ ${g.name}`} isExpense indent baseIdx={0}
                        values={periodData.map(d => d?.byGroup.get(g.id) ?? null)} />
                    ))}
                    {sec === "cost_of_goods" && (
                      <CompRow label="= רווח גולמי" isSubtotal baseIdx={0}
                        values={periodData.map(d => d?.grossProfit ?? null)} />
                    )}
                    {sec === "admin" && (
                      <CompRow label="= רווח תפעולי" isSubtotal baseIdx={0}
                        values={periodData.map(d => d?.operatingProfit ?? null)} />
                    )}
                  </tbody>
                );
              })}

              <CompRow label="= רווח נקי" isSubtotal isFinal baseIdx={0}
                values={periodData.map(d => d?.netProfit ?? null)} />
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400 px-1">
        * חיצי האחוז מראים שינוי ביחס לתקופה הראשונה (הכחולה)
      </p>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

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
    <div className="space-y-4" dir="rtl">
      <div className="flex gap-1 bg-gray-100 rounded-xl p-0.5 w-fit">
        <button onClick={() => setMode("yoy")}
          className={clsx("px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors",
            mode === "yoy" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700",
          )}>
          השוואה שנתית {year} מול {year - 1}
        </button>
        <button onClick={() => setMode("months")}
          className={clsx("px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors",
            mode === "months" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700",
          )}>
          השוואת תקופות גמישה
        </button>
      </div>

      {mode === "yoy" ? (
        prevYearlyPnl ? (
          <YoyTable yearlyPnl={yearlyPnl} prevYearlyPnl={prevYearlyPnl} customGroups={customGroups} year={year} />
        ) : (
          <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-2xl text-gray-400">
            <div className="text-4xl mb-3">📁</div>
            <p className="text-sm font-medium text-gray-500">אין נתונים לשנת {year - 1}</p>
            <p className="text-xs mt-1">העלה קובץ כרטסת עבור {year - 1} לקבלת השוואה שנתית</p>
          </div>
        )
      ) : (
        <FlexComparison
          yearlyPnl={yearlyPnl}
          prevYearlyPnl={prevYearlyPnl}
          customGroups={customGroups}
          year={year}
        />
      )}
    </div>
  );
}
