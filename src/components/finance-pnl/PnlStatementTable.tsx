"use client";

import { ChevronDown, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CategoryTransactionGroup } from "@/app/api/finance/pnl/category/route";
import { BLOCK_KIND_LABELS } from "./constants";
import { fmtCurrency, fmtSignedCurrency, monthLabel, pct } from "./format";
import type { PnlStatementBlock, PnlStatementView } from "./types";

interface Props {
  view: PnlStatementView;
  year: number;
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

export default function PnlStatementTable({ view, year }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(view.blocks.map((b) => b.id)));
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loadingCategoryIds, setLoadingCategoryIds] = useState<Set<string>>(new Set());
  const [groupsByCategory, setGroupsByCategory] = useState<Record<string, CategoryTransactionGroup[]>>({});
  const [monthFilterByCategory, setMonthFilterByCategory] = useState<Record<string, string | null>>({});
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

  async function openCategory(categoryId: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });

    if (groupsByCategory[categoryId]) return;
    setLoadingCategoryIds((prev) => new Set(prev).add(categoryId));
    try {
      const res = await fetch(`/api/finance/pnl/category?year=${year}&categoryId=${categoryId}`);
      if (!res.ok) throw new Error("failed loading category groups");
      const data = await res.json() as { groups?: CategoryTransactionGroup[] };
      setGroupsByCategory((prev) => ({ ...prev, [categoryId]: data.groups ?? [] }));
    } catch {
      setGroupsByCategory((prev) => ({ ...prev, [categoryId]: [] }));
    } finally {
      setLoadingCategoryIds((prev) => {
        const next = new Set(prev);
        next.delete(categoryId);
        return next;
      });
    }
  }

  function filteredGroups(categoryId: string): CategoryTransactionGroup[] {
    const groups = groupsByCategory[categoryId] ?? [];
    const month = monthFilterByCategory[categoryId];
    if (!month) return groups;
    return groups.filter((group) => group.date.slice(0, 7) === month);
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
                    <Fragment key={row.id}>
                      <tr
                        className="border-b border-gray-100 hover:bg-blue-50/40 cursor-pointer"
                        onClick={() => { void openCategory(row.id); }}
                      >
                        <td className="sticky right-0 bg-white py-2 px-4 text-gray-700" style={{ paddingRight: "28px" }}>
                          <span className="inline-flex items-center gap-1">
                            {expandedCategories.has(row.id)
                              ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                              : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                            {row.name}
                          </span>
                        </td>
                        {months.map((month) => (
                          <td key={month} className="text-center px-2 py-2 tabular-nums text-gray-600">
                            {fmtCurrency(row.monthly[month] ?? 0)}
                          </td>
                        ))}
                        <td className="text-center px-3 py-2 font-medium tabular-nums text-gray-800">{fmtCurrency(row.total)}</td>
                        <td className="text-center px-2 py-2 text-xs text-gray-500">{pct(row.total, view.revenueTotal)}</td>
                      </tr>

                      {expandedCategories.has(row.id) && (
                        <tr className="border-b border-gray-100 bg-slate-50/60">
                          <td className="px-4 py-3" colSpan={months.length + 3}>
                            {loadingCategoryIds.has(row.id) ? (
                              <div className="py-4 text-gray-400 flex items-center gap-2 justify-center text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                טוען תנועות...
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <p className="text-xs text-gray-500">
                                    פירוט תנועות של הסעיף. לחיצה על תנועה פותחת כרטיס תנועה עם היסטוריה לכל התקופות.
                                  </p>
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <button
                                      className={`text-[11px] px-2 py-0.5 rounded-full border ${!monthFilterByCategory[row.id] ? "bg-gray-700 text-white border-gray-700" : "border-gray-200 text-gray-600"}`}
                                      onClick={() => setMonthFilterByCategory((prev) => ({ ...prev, [row.id]: null }))}
                                    >
                                      הכל
                                    </button>
                                    {months.map((month) => (
                                      <button
                                        key={month}
                                        className={`text-[11px] px-2 py-0.5 rounded-full border ${monthFilterByCategory[row.id] === month ? "bg-gray-700 text-white border-gray-700" : "border-gray-200 text-gray-600"}`}
                                        onClick={() => setMonthFilterByCategory((prev) => ({
                                          ...prev,
                                          [row.id]: prev[row.id] === month ? null : month,
                                        }))}
                                      >
                                        {monthLabel(month)}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {filteredGroups(row.id).length === 0 ? (
                                  <p className="text-xs text-gray-400 text-center py-2">אין תנועות להצגה</p>
                                ) : (
                                  <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-lg bg-white divide-y divide-gray-50">
                                    {filteredGroups(row.id).map((group) => (
                                      <Link
                                        key={group.representative_id}
                                        href={`/dashboard/finance?tx=${group.open_tx_id}`}
                                        className="flex items-center gap-3 px-3 py-2 hover:bg-blue-50/60 transition-colors group"
                                      >
                                        <span className="text-xs text-gray-400 font-mono w-12 shrink-0">
                                          {group.date.slice(5).split("-").reverse().join("/")}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm text-gray-700 truncate">
                                            {group.supplier_name ?? group.description}
                                          </p>
                                          <p className="text-[11px] text-gray-400 truncate">
                                            {group.reference ? `אסמכתא #${group.reference}` : "ללא אסמכתא"}
                                            {group.count > 1 ? ` · ${group.count} תנועות` : ""}
                                          </p>
                                        </div>
                                        <span className="font-mono text-sm font-semibold text-gray-700">
                                          {fmtCurrency(group.amount)}
                                        </span>
                                        <ExternalLink className="w-3.5 h-3.5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </Link>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
