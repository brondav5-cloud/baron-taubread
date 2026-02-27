"use client";

import React, { useState, useMemo } from "react";
import { clsx } from "clsx";
import type { YearlyPnl, DbCustomGroup, MonthlyPnl } from "@/types/accounting";
import { PARENT_SECTION_LABELS, PARENT_SECTION_ORDER } from "@/types/accounting";
import {
  type ViewMode,
  MONTHS, MONTH_LONG,
  fmtFull,
  ViewModeToggle,
} from "./pnlHelpers";

interface Props {
  yearlyPnl: YearlyPnl;
  customGroups: DbCustomGroup[];
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
}

function PnlCompareView({
  yearlyPnl, customGroups, viewMode, onViewModeChange,
}: Props) {
  const [compareA, setCompareA] = useState(1);
  const [compareB, setCompareB] = useState(Math.min(new Date().getMonth() + 1, 12));

  const groupsBySection = useMemo(() => {
    const map = new Map<string, DbCustomGroup[]>();
    for (const g of customGroups) {
      const list = map.get(g.parent_section) ?? [];
      list.push(g);
      map.set(g.parent_section, list);
    }
    return map;
  }, [customGroups]);

  const mA = yearlyPnl.months[compareA - 1]!;
  const mB = yearlyPnl.months[compareB - 1]!;

  const rows: Array<{
    label: string; indent?: boolean; section?: boolean; subtotal?: boolean; final?: boolean;
    isExpense?: boolean; getA: (m: MonthlyPnl) => number; getB: (m: MonthlyPnl) => number;
  }> = [
    { label: "הכנסות", section: true, getA: m => m.revenue, getB: m => m.revenue },
  ];

  for (const sec of PARENT_SECTION_ORDER) {
    rows.push({ label: `(-) ${PARENT_SECTION_LABELS[sec]}`, section: true, isExpense: true, getA: m => m.bySection[sec], getB: m => m.bySection[sec] });
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
    if (sec === "cost_of_goods") rows.push({ label: "= רווח גולמי", subtotal: true, getA: m => m.grossProfit, getB: m => m.grossProfit });
    if (sec === "admin") rows.push({ label: "= רווח תפעולי", subtotal: true, getA: m => m.operatingProfit, getB: m => m.operatingProfit });
  }
  rows.push({ label: "= רווח נקי", final: true, getA: m => m.netProfit, getB: m => m.netProfit });

  return (
    <div className="space-y-4" dir="rtl">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <ViewModeToggle viewMode={viewMode} onChange={onViewModeChange} />
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
        <div className="overflow-x-auto" dir="rtl">
          <table className="w-full text-xs border-collapse" style={{ minWidth: "520px" }}>
            <thead>
              <tr className="bg-gradient-to-l from-slate-700 to-slate-800 text-white">
                <th className="sticky right-0 z-20 bg-slate-800 text-right py-3 px-4 font-bold text-sm min-w-[220px] shadow-[inset_-1px_0_0_#475569]">סעיף</th>
                <th className="text-center py-3 px-4 font-bold min-w-[130px] bg-blue-900/40">{MONTH_LONG[compareA-1]}</th>
                <th className="text-center py-3 px-4 font-bold min-w-[130px] bg-violet-900/40">{MONTH_LONG[compareB-1]}</th>
                <th className="text-center py-3 px-4 font-semibold min-w-[110px]">הפרש</th>
                <th className="text-center py-3 px-4 font-semibold min-w-[80px]">% שינוי</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const vA = row.getA(mA), vB = row.getB(mB);
                const diff = vB - vA;
                const pct = vA !== 0 ? ((vB - vA) / Math.abs(vA)) * 100 : null;
                const isGood = row.isExpense ? diff < 0 : diff > 0;
                const isBad = row.isExpense ? diff > 0 : diff < 0;
                const stickyBg = row.final ? "bg-slate-800" : row.subtotal ? "bg-gray-50" : "bg-white";
                return (
                  <tr key={i} className={clsx("border-b border-gray-50",
                    row.final && "bg-slate-800",
                    row.subtotal && !row.final && "bg-gray-50",
                  )}>
                    <td className={clsx("py-2.5 px-4 sticky right-0 z-10 shadow-[inset_-1px_0_0_#e5e7eb]", stickyBg,
                      row.indent ? "text-gray-500 text-[11px]" :
                      row.final ? "font-bold text-white text-sm" :
                      row.subtotal ? "font-bold text-gray-800" :
                      row.section ? "font-semibold text-gray-700" : "text-gray-500",
                    )}>
                      {row.label}
                    </td>
                    {[vA, vB].map((v, j) => (
                      <td key={j} className={clsx("py-2.5 px-4 text-center tabular-nums",
                        j === 0 ? "bg-blue-50/40" : "bg-violet-50/40",
                        row.final || row.subtotal ? "font-bold" : "",
                        row.final ? (v >= 0 ? "text-emerald-400" : "text-red-400") :
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
    </div>
  );
}

export default React.memo(PnlCompareView);
