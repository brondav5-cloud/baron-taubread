"use client";

import { useState } from "react";
// Chevron icons available but used inline as text chars for RTL compatibility
import { clsx } from "clsx";
import type {
  YearlyPnl, DbCustomGroup, MonthlyPnl,
} from "@/types/accounting";
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

function fmtK(val: number): string {
  const abs = Math.abs(val);
  if (abs === 0) return "";
  if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${(val / 1_000).toFixed(0)}K`;
  if (abs >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(val);
}

function fmtC(val: number): string {
  return new Intl.NumberFormat("he-IL", {
    style: "currency", currency: "ILS", maximumFractionDigits: 0,
  }).format(val);
}

function pctStr(val: number, revenue: number): string {
  if (revenue === 0) return "-";
  return `${((val / revenue) * 100).toFixed(1)}%`;
}

// Single P&L row
function PnlRow({
  label, indent = 0, isSection = false, isSubtotal = false, isFinal = false,
  isExpense = false, getValue, yearlyPnl, viewMode, compareA, compareB,
  onClick,
}: {
  label: string;
  indent?: number;
  isSection?: boolean;
  isSubtotal?: boolean;
  isFinal?: boolean;
  isExpense?: boolean;
  getValue: (md: MonthlyPnl) => number;
  yearlyPnl: YearlyPnl;
  viewMode: ViewMode;
  compareA: number;
  compareB: number;
  onClick?: (month?: number) => void;
}) {
  const totalVal = getValue(yearlyPnl.total);
  const revTotal = yearlyPnl.total.revenue;

  const baseRowCls = clsx(
    "border-b border-gray-50 transition-colors",
    isFinal && "bg-gradient-to-l from-blue-50/30 to-green-50/30",
    isSubtotal && !isFinal && "bg-gray-50/70",
    onClick && "cursor-pointer hover:bg-blue-50/30",
  );

  const labelCls = clsx(
    "py-2.5 sticky right-0 z-10",
    indent === 0 ? "px-4" : `pl-4 pr-${4 + indent * 4}`,
    isFinal ? "font-bold text-gray-900 bg-gradient-to-l from-blue-50/30 to-green-50/30" :
    isSubtotal ? "font-bold text-gray-800 bg-gray-50/70" :
    isSection ? "font-semibold text-gray-700 bg-white" :
    "text-gray-500 bg-white",
    indent > 0 && "text-[12px]",
  );

  if (viewMode === "yearly") {
    return (
      <tr className={baseRowCls} onClick={() => onClick?.()}>
        <td className={labelCls} style={{ paddingRight: `${16 + indent * 16}px` }}>{label}</td>
        {MONTHS.map((m) => {
          const val = getValue(yearlyPnl.months[m - 1]!);
          return (
            <td
              key={m}
              className={clsx("py-2 px-2 text-center tabular-nums text-xs",
                isFinal && "bg-gradient-to-l from-blue-50/30 to-green-50/30",
                isSubtotal && !isFinal && "bg-gray-50/70",
                onClick && "hover:underline"
              )}
              onClick={(e) => { e.stopPropagation(); onClick?.(m); }}
            >
              {val !== 0 ? (
                <span className={clsx(
                  isFinal || isSubtotal ? `font-bold ${val >= 0 ? "text-green-700" : "text-red-600"}` :
                  isSection ? "font-semibold text-gray-700" :
                  isExpense ? "text-red-600" : "text-gray-600",
                )}>
                  {fmtK(val)}
                </span>
              ) : <span className="text-gray-200">—</span>}
            </td>
          );
        })}
        {/* Total column */}
        <td className={clsx("py-2 px-3 text-center tabular-nums bg-gray-100 font-medium text-xs",
          isFinal || isSubtotal ? "font-bold" : isSection ? "font-semibold" : "",
        )}>
          <span className={clsx(
            isFinal || isSubtotal ? totalVal >= 0 ? "text-green-700" : "text-red-600" :
            isExpense ? "text-red-700" : "text-gray-900",
          )}>
            {totalVal !== 0 ? fmtC(totalVal) : "—"}
          </span>
        </td>
        {/* % of revenue */}
        <td className="py-2 px-3 text-center tabular-nums bg-gray-50 text-[10px] text-gray-500">
          {totalVal !== 0 && !isSubtotal ? pctStr(Math.abs(totalVal), revTotal) : ""}
        </td>
      </tr>
    );
  }

  // Compare mode
  const valA = getValue(yearlyPnl.months[compareA - 1]!);
  const valB = getValue(yearlyPnl.months[compareB - 1]!);
  const diff = valB - valA;
  const pct = valA !== 0 ? ((valB - valA) / Math.abs(valA)) * 100 : 0;

  return (
    <tr className={baseRowCls}>
      <td className={labelCls}>{label}</td>
      <td className="py-2 px-4 text-center tabular-nums text-xs bg-blue-50/20 font-medium">
        {valA !== 0 ? fmtC(valA) : "—"}
      </td>
      <td className="py-2 px-4 text-center tabular-nums text-xs bg-blue-50/20 font-medium">
        {valB !== 0 ? fmtC(valB) : "—"}
      </td>
      <td className="py-2 px-4 text-center tabular-nums text-xs">
        {diff !== 0 ? (
          <span className={clsx("font-medium", isExpense
            ? diff > 0 ? "text-red-600" : "text-green-600"
            : diff > 0 ? "text-green-600" : "text-red-600"
          )}>
            {diff > 0 ? "+" : ""}{fmtC(diff)}
          </span>
        ) : "—"}
      </td>
      <td className="py-2 px-4 text-center text-xs">
        {valA !== 0 && diff !== 0 ? (
          <span className={clsx(
            "inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded-md",
            isExpense
              ? pct > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
              : pct > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
          )}>
            {pct > 0 ? "▲" : "▼"}{Math.abs(pct).toFixed(1)}%
          </span>
        ) : "—"}
      </td>
    </tr>
  );
}

// Section header with expand/collapse — used inline via PnlRow onClick

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
      <div className="text-center py-16 text-gray-400">
        <p className="text-sm">אין נתונים לשנת {year}.</p>
      </div>
    );
  }

  const groupsBySection = new Map<string, DbCustomGroup[]>();
  for (const g of customGroups) {
    const list = groupsBySection.get(g.parent_section) ?? [];
    list.push(g);
    groupsBySection.set(g.parent_section, list);
  }

  const MONTH_LONG = MONTHS.map((m) =>
    new Date(2000, m - 1).toLocaleString("he-IL", { month: "long" }),
  );

  return (
    <div className="space-y-4" dir="rtl">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex bg-gray-100 rounded-xl p-0.5">
          {(["yearly", "compare"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                viewMode === mode ? "bg-white text-gray-900 shadow-sm" : "text-gray-500",
              )}
            >
              {mode === "yearly" ? "שנתי" : "השוואת חודשים"}
            </button>
          ))}
        </div>

        {viewMode === "compare" && (
          <div className="flex items-center gap-3">
            <select value={compareA} onChange={(e) => setCompareA(Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white">
              {MONTHS.map((m) => <option key={m} value={m}>{MONTH_LONG[m - 1]}</option>)}
            </select>
            <span className="text-gray-400">⟷</span>
            <select value={compareB} onChange={(e) => setCompareB(Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white">
              {MONTHS.map((m) => <option key={m} value={m}>{MONTH_LONG[m - 1]}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              {viewMode === "yearly" ? (
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-right py-3 px-4 font-bold text-gray-700 sticky right-0 bg-gray-50 z-10 min-w-[180px]">
                    סעיף
                  </th>
                  {MONTHS.map((m) => (
                    <th key={m} className="text-center py-3 px-2 font-semibold text-gray-500 min-w-[72px]">
                      {MONTH_SHORT[m - 1]}
                    </th>
                  ))}
                  <th className="text-center py-3 px-3 font-bold text-gray-900 bg-gray-100 min-w-[90px]">סה&quot;כ</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-500 bg-gray-50 min-w-[60px]">%</th>
                </tr>
              ) : (
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-right py-3 px-4 font-bold text-gray-700 min-w-[180px]">סעיף</th>
                  <th className="text-center py-3 px-4 font-semibold text-primary-700 min-w-[100px] bg-blue-50/30">{MONTH_LONG[compareA - 1]}</th>
                  <th className="text-center py-3 px-4 font-semibold text-primary-700 min-w-[100px] bg-blue-50/30">{MONTH_LONG[compareB - 1]}</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600 min-w-[90px]">הפרש</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600 min-w-[70px]">% שינוי</th>
                </tr>
              )}
            </thead>
            <tbody>
              {/* Revenue */}
              <PnlRow label="הכנסות" isSection getValue={(md) => md.revenue}
                yearlyPnl={yearlyPnl} viewMode={viewMode} compareA={compareA} compareB={compareB}
                onClick={(m) => onAmountClick?.("revenue", m)} />

              {/* Expense sections */}
              {PARENT_SECTION_ORDER.map((section) => {
                const groups = (groupsBySection.get(section) ?? []).filter(
                  (g) => (yearlyPnl.total.byGroup.get(g.id) ?? 0) > 0,
                );
                const sectionTotal = yearlyPnl.total.bySection[section];
                if (sectionTotal === 0 && groups.length === 0) return null;

                const expanded = !!expandedSections[section];

                return (
                  <tbody key={section}>
                    {/* Section header row */}
                    <PnlRow
                      label={`${expanded ? "▾" : "▸"} (-) ${PARENT_SECTION_LABELS[section]}`}
                      isSection
                      isExpense
                      getValue={(md) => md.bySection[section]}
                      yearlyPnl={yearlyPnl}
                      viewMode={viewMode}
                      compareA={compareA}
                      compareB={compareB}
                      onClick={() => toggleSection(section)}
                    />

                    {/* Group rows */}
                    {expanded && groups.map((g) => (
                      <PnlRow
                        key={g.id}
                        label={`▸ ${g.name}`}
                        indent={1}
                        isExpense
                        getValue={(md) => md.byGroup.get(g.id) ?? 0}
                        yearlyPnl={yearlyPnl}
                        viewMode={viewMode}
                        compareA={compareA}
                        compareB={compareB}
                        onClick={(m) => onGroupClick?.(g.id, m)}
                      />
                    ))}

                    {/* Subtotal after cost_of_goods */}
                    {section === "cost_of_goods" && (
                      <PnlRow label="= רווח גולמי" isSubtotal
                        getValue={(md) => md.grossProfit}
                        yearlyPnl={yearlyPnl} viewMode={viewMode} compareA={compareA} compareB={compareB}
                      />
                    )}

                    {/* Subtotal after operating */}
                    {section === "operating" && (
                      <PnlRow label="= רווח תפעולי" isSubtotal
                        getValue={(md) => md.operatingProfit}
                        yearlyPnl={yearlyPnl} viewMode={viewMode} compareA={compareA} compareB={compareB}
                      />
                    )}
                  </tbody>
                );
              })}

              {/* Net profit */}
              <PnlRow
                label="= רווח נקי"
                isSubtotal
                isFinal
                getValue={(md) => md.netProfit}
                yearlyPnl={yearlyPnl}
                viewMode={viewMode}
                compareA={compareA}
                compareB={compareB}
              />

              {/* % net margin row */}
              {viewMode === "yearly" && (
                <tr className="border-t border-gray-200 bg-gray-50/50">
                  <td className="py-2 px-4 text-gray-500 font-medium text-[11px] sticky right-0 bg-gray-50/50">
                    % רווח נקי מהכנסות
                  </td>
                  {MONTHS.map((m) => {
                    const md = yearlyPnl.months[m - 1]!;
                    const pct = md.revenue > 0 ? (md.netProfit / md.revenue) * 100 : 0;
                    return (
                      <td key={m} className="py-2 px-2 text-center">
                        <span className={clsx("text-[10px] font-bold",
                          pct > 0 ? "text-green-600" : pct < 0 ? "text-red-500" : "text-gray-400",
                        )}>
                          {md.revenue > 0 ? `${pct.toFixed(1)}%` : "—"}
                        </span>
                      </td>
                    );
                  })}
                  <td className="py-2 px-3 text-center bg-gray-100">
                    <span className={clsx("text-[11px] font-bold",
                      yearlyPnl.total.revenue > 0 && yearlyPnl.total.netProfit >= 0 ? "text-green-700" : "text-red-600",
                    )}>
                      {yearlyPnl.total.revenue > 0
                        ? `${((yearlyPnl.total.netProfit / yearlyPnl.total.revenue) * 100).toFixed(1)}%`
                        : "—"}
                    </span>
                  </td>
                  <td className="bg-gray-50" />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-gray-400 text-left">
        לחץ על שם קבוצה לפירוט חשבונות · לחץ על סכום לצפייה בתנועות
      </p>
    </div>
  );
}
