"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { BLOCK_KIND_LABELS } from "./constants";
import { fmtCurrency, fmtSignedCurrency, monthLabel, pct } from "./format";
import type { PnlStatementBlock, PnlStatementView } from "./types";

interface Props {
  view: PnlStatementView;
}

function subtotalByMonth(blocks: PnlStatementBlock[], month: string): number {
  let sum = 0;
  for (const block of blocks) {
    for (const row of block.categories) {
      sum += row.monthly[month] ?? 0;
    }
  }
  return sum;
}

function SubtotalRow({
  title,
  value,
  months,
  calcByMonth,
  revenueTotal,
  className,
}: {
  title: string;
  value: number;
  months: string[];
  calcByMonth: (month: string) => number;
  revenueTotal: number;
  className: string;
}) {
  return (
    <tr className={className}>
      <td className="py-2.5 px-4 font-bold sticky right-0 bg-inherit">{title}</td>
      {months.map((month) => (
        <td key={month} className="text-center px-2 py-2.5 font-semibold tabular-nums">
          {fmtSignedCurrency(calcByMonth(month))}
        </td>
      ))}
      <td className="text-center px-3 py-2.5 font-bold tabular-nums">{fmtSignedCurrency(value)}</td>
      <td className="text-center px-2 py-2.5 text-[11px] font-semibold">{pct(value, revenueTotal)}</td>
    </tr>
  );
}

export default function PnlStatementTable({ view }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(view.blocks.map((b) => b.id)));
  const months = view.months;

  useEffect(() => {
    // Preserve user choices but auto-open any new blocks.
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const block of view.blocks) {
        if (!next.has(block.id)) next.add(block.id);
      }
      return next;
    });
  }, [view.blocks]);

  const costBlocks = useMemo(
    () => view.blocks.filter((b) => b.kind === "cost_of_goods"),
    [view.blocks],
  );
  const operatingBlocks = useMemo(
    () => view.blocks.filter((b) => b.kind === "operating" || b.kind === "admin"),
    [view.blocks],
  );
  const financeOtherBlocks = useMemo(
    () => view.blocks.filter((b) => b.kind === "finance" || b.kind === "other"),
    [view.blocks],
  );

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-100 text-xs text-gray-500 bg-gray-50">
        לחץ על שורת סעיף כדי לפתוח/לסגור את הקטגוריות שמרכיבות אותו.
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse" dir="rtl">
          <thead>
            <tr className="bg-gradient-to-l from-slate-700 to-slate-800 text-white">
              <th className="sticky right-0 bg-slate-800 text-right py-3 px-4 min-w-[230px]">סעיף</th>
              {months.map((month) => (
                <th key={month} className="text-center py-3 px-2 min-w-[82px]">{monthLabel(month)}</th>
              ))}
              <th className="text-center py-3 px-3 min-w-[100px] bg-slate-900">סה״כ</th>
              <th className="text-center py-3 px-2 min-w-[70px]">%</th>
            </tr>
          </thead>
          <tbody>
            {view.blocks.map((block) => {
              const isExpanded = expanded.has(block.id);
              return (
                <Fragment key={block.id}>
                  <tr
                    className="bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100/70 transition-colors"
                    onClick={() => toggle(block.id)}
                  >
                    <td className="sticky right-0 bg-gray-50 py-2 px-4 font-semibold text-gray-800">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(block.id);
                        }}
                        className="inline-flex items-center gap-1.5"
                      >
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        {block.name}
                        <span className="text-[10px] text-gray-500 bg-gray-200 rounded-full px-1.5 py-0.5">
                          {BLOCK_KIND_LABELS[block.kind]}
                        </span>
                      </button>
                    </td>
                    {months.map((month) => (
                      <td key={month} className="text-center px-2 py-2 tabular-nums text-gray-700">
                        {fmtCurrency(subtotalByMonth([block], month))}
                      </td>
                    ))}
                    <td className="text-center px-3 py-2 font-bold tabular-nums text-gray-900">{fmtCurrency(block.total)}</td>
                    <td className="text-center px-2 py-2 text-xs text-gray-600">{pct(block.total, view.revenueTotal)}</td>
                  </tr>

                  {isExpanded && block.categories.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-blue-50/30">
                      <td className="sticky right-0 bg-white py-2 px-4 text-gray-700" style={{ paddingRight: "28px" }}>
                        {row.name}
                      </td>
                      {months.map((month) => (
                        <td key={month} className="text-center px-2 py-2 tabular-nums text-gray-600">
                          {fmtCurrency(row.monthly[month] ?? 0)}
                        </td>
                      ))}
                      <td className="text-center px-3 py-2 font-medium tabular-nums text-gray-800">{fmtCurrency(row.total)}</td>
                      <td className="text-center px-2 py-2 text-xs text-gray-500">{pct(row.total, view.revenueTotal)}</td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}

            <SubtotalRow
              title="= רווח גולמי"
              value={view.grossProfit}
              months={months}
              revenueTotal={view.revenueTotal}
              calcByMonth={(month) => {
                const revenue = subtotalByMonth(view.blocks.filter((b) => b.kind === "income"), month);
                const cogs = subtotalByMonth(costBlocks, month);
                return revenue - cogs;
              }}
              className="bg-emerald-50 border-y border-emerald-200 text-emerald-800"
            />
            <SubtotalRow
              title="= רווח תפעולי"
              value={view.operatingProfit}
              months={months}
              revenueTotal={view.revenueTotal}
              calcByMonth={(month) => {
                const gross = subtotalByMonth(view.blocks.filter((b) => b.kind === "income"), month) - subtotalByMonth(costBlocks, month);
                return gross - subtotalByMonth(operatingBlocks, month);
              }}
              className="bg-blue-50 border-y border-blue-200 text-blue-800"
            />
            <SubtotalRow
              title="= רווח נקי"
              value={view.netProfit}
              months={months}
              revenueTotal={view.revenueTotal}
              calcByMonth={(month) => {
                const gross = subtotalByMonth(view.blocks.filter((b) => b.kind === "income"), month) - subtotalByMonth(costBlocks, month);
                const operating = gross - subtotalByMonth(operatingBlocks, month);
                return operating - subtotalByMonth(financeOtherBlocks, month);
              }}
              className="bg-slate-900 text-white border-t-2 border-slate-700"
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}
