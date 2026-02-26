"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { clsx } from "clsx";
import type { YearlyPnl, DbCustomGroup } from "@/types/accounting";
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

function DiffCell({
  curr, prev, isExpense = false,
}: { curr: number; prev: number; isExpense?: boolean }) {
  if (prev === 0 && curr === 0) return <td className="py-2 px-3 text-center text-gray-300 text-xs">—</td>;

  const diff = curr - prev;
  const pct = prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : null;
  const isGood = isExpense ? diff < 0 : diff > 0;
  const isBad = isExpense ? diff > 0 : diff < 0;

  return (
    <td className="py-2 px-3 text-center text-xs">
      <div className="space-y-0.5">
        <div className={clsx("font-medium tabular-nums",
          isGood ? "text-green-600" : isBad ? "text-red-600" : "text-gray-500",
        )}>
          {diff > 0 ? "+" : ""}{fmtC(diff)}
        </div>
        {pct !== null && (
          <div className={clsx(
            "inline-flex items-center gap-0.5 text-[10px] font-bold px-1 py-0.5 rounded",
            isGood ? "bg-green-100 text-green-700" :
            isBad ? "bg-red-100 text-red-700" :
            "bg-gray-100 text-gray-500",
          )}>
            {pct > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : pct < 0 ? <TrendingDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
            {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
          </div>
        )}
      </div>
    </td>
  );
}

// ── YoY Table ────────────────────────────────────────────────

function YoyTable({
  yearlyPnl, prevYearlyPnl, customGroups, year,
}: {
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
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-right py-3 px-4 font-bold text-gray-700 min-w-[200px]">סעיף</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-600 min-w-[110px] bg-blue-50/30">{prevYear}</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-900 min-w-[110px]">{year}</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-600 min-w-[100px]">הפרש / %</th>
            </tr>
          </thead>
          <tbody>
            {/* Revenue */}
            <CompRow label="הכנסות נטו" curr={curr.revenue} prev={prev?.revenue ?? 0}
              isSection isBold />

            {/* Sections */}
            {PARENT_SECTION_ORDER.map((sec) => {
              const currVal = curr.bySection[sec];
              const prevVal = prev?.bySection[sec] ?? 0;
              if (currVal === 0 && prevVal === 0) return null;

              const groups = (groupsBySection.get(sec) ?? []).filter(
                g => (curr.byGroup.get(g.id) ?? 0) > 0 || (prev?.byGroup.get(g.id) ?? 0) > 0,
              );

              return (
                <tbody key={sec}>
                  <CompRow label={`(-) ${PARENT_SECTION_LABELS[sec]}`} curr={currVal} prev={prevVal}
                    isSection isExpense />
                  {groups.map((g) => (
                    <CompRow key={g.id} label={`  ▸ ${g.name}`} isExpense indent
                      curr={curr.byGroup.get(g.id) ?? 0}
                      prev={prev?.byGroup.get(g.id) ?? 0} />
                  ))}
                  {sec === "cost_of_goods" && (
                    <CompRow label="= רווח גולמי" curr={curr.grossProfit} prev={prev?.grossProfit ?? 0}
                      isSubtotal />
                  )}
                  {sec === "operating" && (
                    <CompRow label="= רווח תפעולי" curr={curr.operatingProfit} prev={prev?.operatingProfit ?? 0}
                      isSubtotal />
                  )}
                </tbody>
              );
            })}

            {/* Net profit */}
            <CompRow label="= רווח נקי" curr={curr.netProfit} prev={prev?.netProfit ?? 0} isSubtotal isFinal />

            {/* Margin */}
            <tr className="bg-gray-50 border-t border-gray-200">
              <td className="py-2 px-4 text-gray-500 text-[11px]">% רווח נקי</td>
              <td className="py-2 px-4 text-center bg-blue-50/30">
                <span className={clsx("text-[10px] font-bold", (prev?.revenue ?? 0) > 0 ? "text-gray-700" : "text-gray-300")}>
                  {(prev?.revenue ?? 0) > 0 ? `${(((prev?.netProfit ?? 0) / (prev?.revenue ?? 1)) * 100).toFixed(1)}%` : "—"}
                </span>
              </td>
              <td className="py-2 px-4 text-center">
                <span className={clsx("text-[10px] font-bold", curr.revenue > 0 ? "text-gray-700" : "text-gray-300")}>
                  {curr.revenue > 0 ? `${((curr.netProfit / curr.revenue) * 100).toFixed(1)}%` : "—"}
                </span>
              </td>
              <td className="py-2 px-4 text-center">
                {curr.revenue > 0 && (prev?.revenue ?? 0) > 0 ? (
                  <span className={clsx("text-[10px] font-bold",
                    curr.netProfit / curr.revenue > (prev?.netProfit ?? 0) / (prev?.revenue ?? 1)
                      ? "text-green-600" : "text-red-600",
                  )}>
                    {(((curr.netProfit / curr.revenue) - ((prev?.netProfit ?? 0) / (prev?.revenue ?? 1))) * 100).toFixed(1)}נ&quot;נ
                  </span>
                ) : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompRow({
  label, curr, prev, isSection, isSubtotal, isFinal, isExpense, isBold, indent,
}: {
  label: string; curr: number; prev: number;
  isSection?: boolean; isSubtotal?: boolean; isFinal?: boolean;
  isExpense?: boolean; isBold?: boolean; indent?: boolean;
}) {
  return (
    <tr className={clsx("border-b border-gray-50",
      isFinal && "bg-gradient-to-l from-blue-50/20 to-green-50/20",
      isSubtotal && !isFinal && "bg-gray-50/70",
    )}>
      <td className={clsx("py-2 px-4",
        isFinal ? "font-bold text-gray-900" :
        isSubtotal ? "font-bold text-gray-800" :
        isSection || isBold ? "font-semibold text-gray-700" :
        indent ? "text-gray-500 text-[11px]" : "text-gray-600",
      )}
        style={indent ? { paddingRight: 24 } : undefined}
      >
        {label}
      </td>
      <td className="py-2 px-4 text-center tabular-nums bg-blue-50/20 text-xs text-gray-600">
        {prev !== 0 ? fmtC(prev) : "—"}
      </td>
      <td className="py-2 px-4 text-center tabular-nums text-xs">
        <span className={clsx(
          isFinal || isSubtotal ? `font-bold ${curr >= 0 ? "text-green-700" : "text-red-600"}` :
          isExpense ? "text-red-600" : "text-gray-800",
        )}>
          {curr !== 0 ? fmtC(curr) : "—"}
        </span>
      </td>
      <DiffCell curr={curr} prev={prev} isExpense={isExpense} />
    </tr>
  );
}

// ── Month vs Month ───────────────────────────────────────────

function MonthCompTable({
  yearlyPnl, customGroups,
}: {
  yearlyPnl: YearlyPnl;
  customGroups: DbCustomGroup[];
}) {
  const [monthA, setMonthA] = useState(1);
  const [monthB, setMonthB] = useState(Math.min(new Date().getMonth() + 1, 12));

  const mdA = yearlyPnl.months[monthA - 1]!;
  const mdB = yearlyPnl.months[monthB - 1]!;

  const groupsBySection = new Map<string, DbCustomGroup[]>();
  for (const g of customGroups) {
    const list = groupsBySection.get(g.parent_section) ?? [];
    list.push(g);
    groupsBySection.set(g.parent_section, list);
  }

  return (
    <div className="space-y-4">
      {/* Selectors */}
      <div className="flex items-center justify-center gap-4 bg-gray-50 rounded-xl p-3">
        <select value={monthA} onChange={(e) => setMonthA(Number(e.target.value))}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white font-medium">
          {MONTHS.map((m) => <option key={m} value={m}>{MONTH_LONG[m - 1]}</option>)}
        </select>
        <span className="text-gray-400 font-bold text-lg">⟷</span>
        <select value={monthB} onChange={(e) => setMonthB(Number(e.target.value))}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white font-medium">
          {MONTHS.map((m) => <option key={m} value={m}>{MONTH_LONG[m - 1]}</option>)}
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-right py-3 px-4 font-bold text-gray-700 min-w-[200px]">סעיף</th>
                <th className="text-center py-3 px-4 font-semibold text-primary-700 min-w-[110px] bg-primary-50/30">{MONTH_LONG[monthA - 1]}</th>
                <th className="text-center py-3 px-4 font-semibold text-primary-700 min-w-[110px] bg-primary-50/30">{MONTH_LONG[monthB - 1]}</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600 min-w-[100px]">הפרש / %</th>
              </tr>
            </thead>
            <tbody>
              <CompRow label="הכנסות" curr={mdB.revenue} prev={mdA.revenue} isSection isBold />

              {PARENT_SECTION_ORDER.map((sec) => {
                const a = mdA.bySection[sec];
                const b = mdB.bySection[sec];
                if (a === 0 && b === 0) return null;

                const groups = (groupsBySection.get(sec) ?? []).filter(
                  g => (mdA.byGroup.get(g.id) ?? 0) > 0 || (mdB.byGroup.get(g.id) ?? 0) > 0,
                );

                return (
                  <tbody key={sec}>
                    <CompRow label={`(-) ${PARENT_SECTION_LABELS[sec]}`} curr={b} prev={a} isSection isExpense />
                    {groups.map((g) => (
                      <CompRow key={g.id} label={`  ▸ ${g.name}`} isExpense indent
                        curr={mdB.byGroup.get(g.id) ?? 0} prev={mdA.byGroup.get(g.id) ?? 0} />
                    ))}
                    {sec === "cost_of_goods" && (
                      <CompRow label="= רווח גולמי" curr={mdB.grossProfit} prev={mdA.grossProfit} isSubtotal />
                    )}
                    {sec === "operating" && (
                      <CompRow label="= רווח תפעולי" curr={mdB.operatingProfit} prev={mdA.operatingProfit} isSubtotal />
                    )}
                  </tbody>
                );
              })}

              <CompRow label="= רווח נקי" curr={mdB.netProfit} prev={mdA.netProfit} isSubtotal isFinal />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

export default function ComparisonsTab({ yearlyPnl, prevYearlyPnl, customGroups, year }: Props) {
  const [mode, setMode] = useState<CompareMode>("yoy");

  if (!yearlyPnl) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-sm">אין נתונים לשנת {year}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex gap-1 bg-gray-100 rounded-xl p-0.5 w-fit">
        <button onClick={() => setMode("yoy")}
          className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
            mode === "yoy" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500",
          )}>
          השוואה שנתית ({year} מול {year - 1})
        </button>
        <button onClick={() => setMode("months")}
          className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
            mode === "months" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500",
          )}>
          השוואת חודשים
        </button>
      </div>

      {mode === "yoy" ? (
        prevYearlyPnl ? (
          <YoyTable yearlyPnl={yearlyPnl} prevYearlyPnl={prevYearlyPnl} customGroups={customGroups} year={year} />
        ) : (
          <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-2xl text-gray-400">
            <p className="text-sm">אין נתונים לשנת {year - 1}.</p>
            <p className="text-xs mt-1">העלה קובץ כרטסת עבור {year - 1} לקבלת השוואה שנתית</p>
          </div>
        )
      ) : (
        <MonthCompTable yearlyPnl={yearlyPnl} customGroups={customGroups} />
      )}
    </div>
  );
}
