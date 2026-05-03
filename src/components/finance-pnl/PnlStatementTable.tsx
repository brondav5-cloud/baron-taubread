"use client";

import { ChevronDown, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import type { CategoryTransactionGroup } from "@/app/api/finance/pnl/category/route";
import { BLOCK_KIND_LABELS } from "./constants";
import { fmtCurrency, fmtSignedCurrency, monthLabel, pct } from "./format";
import {
  pnlDisplayMonths,
} from "./layout-utils";
import type { PnlStatementView } from "./types";

interface Props {
  view: PnlStatementView;
  year: number;
  month: number;
  onOpenTransaction: (txId: string) => void;
  compareMonths: string[];
}

interface SupplierRollupRow {
  key: string;
  supplierName: string;
  total: number;
  txCount: number;
  latestDate: string;
  openTxId: string;
  monthlyTotals: Record<string, number>;
  groups: CategoryTransactionGroup[];
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

export default function PnlStatementTable({ view, year, month, onOpenTransaction, compareMonths }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(view.blocks.map((b) => b.id)));
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loadingCategoryIds, setLoadingCategoryIds] = useState<Set<string>>(new Set());
  const [groupsByCategory, setGroupsByCategory] = useState<Record<string, CategoryTransactionGroup[]>>({});
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set());
  const months = view.months;
  const displayMonths = pnlDisplayMonths(compareMonths, months);

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

  // Category drill-down data depends on the selected period/layout.
  // Clear cached rows when period/layout changes so totals are never mixed
  // between different month/year selections.
  useEffect(() => {
    setExpandedCategories(new Set());
    setLoadingCategoryIds(new Set());
    setExpandedSuppliers(new Set());
    setGroupsByCategory({});
  }, [year, month, view]);

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
      const periodParam = month > 0 ? `&month=${month}` : "";
      const res = await fetch(`/api/finance/pnl/category?year=${year}&categoryId=${categoryId}${periodParam}`);
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

  function groupedBySupplier(categoryId: string): SupplierRollupRow[] {
    const rows = groupsByCategory[categoryId] ?? [];
    const compareSet = new Set(displayMonths);
    const bySupplier = new Map<string, SupplierRollupRow>();

    for (const row of rows) {
      const monthKey = row.date.slice(0, 7);
      if (compareSet.size > 0 && !compareSet.has(monthKey)) continue;

      const supplierName =
        row.supplier_name?.trim() ||
        row.description?.trim() ||
        "ללא שם ספק";
      const key = supplierName.toLowerCase().replace(/\s+/g, " ");

      const current = bySupplier.get(key);
      if (!current) {
        bySupplier.set(key, {
          key,
          supplierName,
          total: row.amount,
          txCount: row.count,
          latestDate: row.date,
          openTxId: row.open_tx_id,
          monthlyTotals: { [monthKey]: row.amount },
          groups: [row],
        });
        continue;
      }

      current.total += row.amount;
      current.txCount += row.count;
      current.groups.push(row);
      current.monthlyTotals[monthKey] = (current.monthlyTotals[monthKey] ?? 0) + row.amount;
      if (row.date > current.latestDate) {
        current.latestDate = row.date;
        current.openTxId = row.open_tx_id;
      }
    }

    return Array.from(bySupplier.values()).sort(
      (a, b) => Math.abs(b.total) - Math.abs(a.total),
    );
  }

  function categoryMonthlyTotalsFromGroups(categoryId: string): Record<string, number> | null {
    if (!(categoryId in groupsByCategory)) return null;
    const rows = groupsByCategory[categoryId] ?? [];
    const totals: Record<string, number> = {};
    for (const monthKey of displayMonths) totals[monthKey] = 0;
    for (const row of rows) {
      const monthKey = row.date.slice(0, 7);
      if (!(monthKey in totals)) continue;
      totals[monthKey] = (totals[monthKey] ?? 0) + row.amount;
    }
    return totals;
  }

  function monthlyForCategory(category: PnlStatementView["blocks"][number]["categories"][number]): Record<string, number> {
    return categoryMonthlyTotalsFromGroups(category.id) ?? category.monthly;
  }

  function blockMonthTotal(block: PnlStatementView["blocks"][number], monthKey: string): number {
    return block.categories.reduce((sum, category) => sum + (monthlyForCategory(category)[monthKey] ?? 0), 0);
  }

  function blockPeriodTotal(block: PnlStatementView["blocks"][number]): number {
    return displayMonths.reduce((sum, monthKey) => sum + blockMonthTotal(block, monthKey), 0);
  }

  function toggleSupplierDetails(categoryId: string, supplierKey: string) {
    const key = `${categoryId}::${supplierKey}`;
    setExpandedSuppliers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const revenueTotalForPeriod = useMemo(
    () => view.blocks
      .filter((block) => block.kind === "income")
      .reduce(
        (sum, block) =>
          sum + displayMonths.reduce(
            (monthSum, monthKey) =>
              monthSum + block.categories.reduce((catSum, category) => {
                if (!(category.id in groupsByCategory)) {
                  return catSum + (category.monthly[monthKey] ?? 0);
                }
                const groupedRows = groupsByCategory[category.id] ?? [];
                const groupedTotal = groupedRows.reduce(
                  (rowSum, row) => (row.date.slice(0, 7) === monthKey ? rowSum + row.amount : rowSum),
                  0,
                );
                return catSum + groupedTotal;
              }, 0),
            0,
          ),
        0,
      ),
    [view.blocks, displayMonths, groupsByCategory],
  );

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
              {displayMonths.map((month) => (
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
                    {displayMonths.map((month) => (
                      <td key={month} className="text-center px-2 py-2 tabular-nums text-gray-700">
                        {fmtCurrency(blockMonthTotal(block, month))}
                      </td>
                    ))}
                    <td className="text-center px-3 py-2 font-bold tabular-nums text-gray-900">{fmtCurrency(blockPeriodTotal(block))}</td>
                    <td className="text-center px-2 py-2 text-xs text-gray-600">{pct(blockPeriodTotal(block), revenueTotalForPeriod)}</td>
                  </tr>

                  {isExpanded && block.categories.map((row) => (
                    <Fragment key={row.id}>
                      {(() => {
                        const totalsFromGroups = categoryMonthlyTotalsFromGroups(row.id);
                        const monthlyForDisplay = totalsFromGroups ?? row.monthly;
                        const totalForDisplay = displayMonths.reduce(
                          (sum, monthKey) => sum + (monthlyForDisplay[monthKey] ?? 0),
                          0,
                        );
                        return (
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
                        {displayMonths.map((month) => (
                          <td key={month} className="text-center px-2 py-2 tabular-nums text-gray-600">
                            {fmtCurrency(monthlyForDisplay[month] ?? 0)}
                          </td>
                        ))}
                        <td className="text-center px-3 py-2 font-medium tabular-nums text-gray-800">{fmtCurrency(totalForDisplay)}</td>
                        <td className="text-center px-2 py-2 text-xs text-gray-500">{pct(totalForDisplay, revenueTotalForPeriod)}</td>
                      </tr>
                        );
                      })()}

                      {expandedCategories.has(row.id) && (
                        <tr className="border-b border-gray-100 bg-slate-50/60">
                          <td className="px-4 py-3" colSpan={displayMonths.length + 3}>
                            {loadingCategoryIds.has(row.id) ? (
                              <div className="py-4 text-gray-400 flex items-center gap-2 justify-center text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                טוען תנועות...
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {(() => {
                                  const supplierRows = groupedBySupplier(row.id);
                                  const innerMonths = displayMonths;
                                  return (
                                    <>
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <p className="text-xs text-gray-500">
                                    פירוט מאוחד לפי ספק. כל ספק מופיע פעם אחת, עם פירוק סכומים לפי החודשים שנבחרו להשוואה.
                                  </p>
                                  <p className="text-[11px] text-gray-400">
                                    חודשים: {innerMonths.map(monthLabel).join(" · ")}
                                  </p>
                                </div>

                                {supplierRows.length === 0 ? (
                                  <p className="text-xs text-gray-400 text-center py-2">אין תנועות להצגה</p>
                                ) : (
                                  <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-lg bg-white">
                                    <div className="grid gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50 text-[11px] text-gray-500 font-semibold"
                                      style={{ gridTemplateColumns: `minmax(180px,2fr) repeat(${innerMonths.length}, minmax(84px,1fr)) minmax(96px,1fr) minmax(70px,auto)` }}>
                                      <span>ספק</span>
                                      {innerMonths.map((m) => (
                                        <span key={`${row.id}-${m}`} className="text-center">{monthLabel(m)}</span>
                                      ))}
                                      <span className="text-center">סה״כ</span>
                                      <span className="text-center">תנועות</span>
                                    </div>
                                    {supplierRows.map((supplier) => {
                                      const supplierExpandKey = `${row.id}::${supplier.key}`;
                                      const isSupplierExpanded = expandedSuppliers.has(supplierExpandKey);
                                      return (
                                        <div key={supplier.key} className="border-b last:border-b-0 border-gray-50">
                                          <button
                                            type="button"
                                            onClick={() => toggleSupplierDetails(row.id, supplier.key)}
                                            className="w-full grid gap-2 px-3 py-2 hover:bg-blue-50/60 transition-colors group text-right"
                                            style={{ gridTemplateColumns: `minmax(180px,2fr) repeat(${innerMonths.length}, minmax(84px,1fr)) minmax(96px,1fr) minmax(70px,auto)` }}
                                          >
                                            <div className="min-w-0">
                                              <p className="text-sm text-gray-700 truncate group-hover:text-blue-700">{supplier.supplierName}</p>
                                              <p className="text-[11px] text-gray-400 truncate">עדכון אחרון: {supplier.latestDate.slice(5).split("-").reverse().join("/")}</p>
                                            </div>
                                            {innerMonths.map((m) => (
                                              <span key={`${supplier.key}-${m}`} className="text-center font-mono text-xs text-gray-600">{fmtCurrency(supplier.monthlyTotals[m] ?? 0)}</span>
                                            ))}
                                            <span className="font-mono text-sm font-semibold text-gray-700 text-center">{fmtCurrency(supplier.total)}</span>
                                            <span className="text-center text-[11px] text-gray-500 inline-flex items-center justify-center gap-1">
                                              {supplier.txCount}
                                              {isSupplierExpanded ? <ChevronDown className="w-3.5 h-3.5 text-blue-400" /> : <ChevronRight className="w-3.5 h-3.5 text-blue-400" />}
                                            </span>
                                          </button>
                                          {isSupplierExpanded && (
                                            <div className="px-3 pb-2 space-y-1.5 bg-blue-50/30">
                                              {supplier.groups
                                                .slice()
                                                .sort((a, b) => b.date.localeCompare(a.date))
                                                .map((group) => (
                                                  <button
                                                    key={group.representative_id}
                                                    type="button"
                                                    onClick={() => onOpenTransaction(group.open_tx_id)}
                                                    className="w-full flex items-center justify-between rounded-md border border-blue-100 bg-white px-2.5 py-1.5 text-xs hover:bg-blue-50"
                                                  >
                                                    <span className="text-gray-700 truncate">{group.date} · {group.description || supplier.supplierName}</span>
                                                    <span className="inline-flex items-center gap-2 shrink-0">
                                                      <span className="text-gray-500">{group.count} תנועות</span>
                                                      <span className="font-mono font-semibold text-gray-700">{fmtCurrency(group.amount)}</span>
                                                      <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                                                    </span>
                                                  </button>
                                                ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                    </>
                                  );
                                })()}
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
              value={displayMonths.reduce((sum, month) => {
                const revenue = view.blocks
                  .filter((b) => b.kind === "income")
                  .reduce((s, b) => s + blockMonthTotal(b, month), 0);
                const cogs = costBlocks.reduce((s, b) => s + blockMonthTotal(b, month), 0);
                return sum + (revenue - cogs);
              }, 0)}
              months={displayMonths}
              revenueTotal={revenueTotalForPeriod}
              calcByMonth={(month) => {
                const revenue = view.blocks
                  .filter((b) => b.kind === "income")
                  .reduce((s, b) => s + blockMonthTotal(b, month), 0);
                const cogs = costBlocks.reduce((s, b) => s + blockMonthTotal(b, month), 0);
                return revenue - cogs;
              }}
              className="bg-emerald-50 border-y border-emerald-200 text-emerald-800"
            />
            <SubtotalRow
              title="= רווח תפעולי"
              value={displayMonths.reduce((sum, month) => {
                const revenue = view.blocks
                  .filter((b) => b.kind === "income")
                  .reduce((s, b) => s + blockMonthTotal(b, month), 0);
                const gross = revenue - costBlocks.reduce((s, b) => s + blockMonthTotal(b, month), 0);
                return sum + (gross - operatingBlocks.reduce((s, b) => s + blockMonthTotal(b, month), 0));
              }, 0)}
              months={displayMonths}
              revenueTotal={revenueTotalForPeriod}
              calcByMonth={(month) => {
                const revenue = view.blocks
                  .filter((b) => b.kind === "income")
                  .reduce((s, b) => s + blockMonthTotal(b, month), 0);
                const gross = revenue - costBlocks.reduce((s, b) => s + blockMonthTotal(b, month), 0);
                return gross - operatingBlocks.reduce((s, b) => s + blockMonthTotal(b, month), 0);
              }}
              className="bg-blue-50 border-y border-blue-200 text-blue-800"
            />
            <SubtotalRow
              title="= רווח נקי"
              value={displayMonths.reduce((sum, month) => {
                const revenue = view.blocks
                  .filter((b) => b.kind === "income")
                  .reduce((s, b) => s + blockMonthTotal(b, month), 0);
                const gross = revenue - costBlocks.reduce((s, b) => s + blockMonthTotal(b, month), 0);
                const operating = gross - operatingBlocks.reduce((s, b) => s + blockMonthTotal(b, month), 0);
                return sum + (operating - financeOtherBlocks.reduce((s, b) => s + blockMonthTotal(b, month), 0));
              }, 0)}
              months={displayMonths}
              revenueTotal={revenueTotalForPeriod}
              calcByMonth={(month) => {
                const revenue = view.blocks
                  .filter((b) => b.kind === "income")
                  .reduce((s, b) => s + blockMonthTotal(b, month), 0);
                const gross = revenue - costBlocks.reduce((s, b) => s + blockMonthTotal(b, month), 0);
                const operating = gross - operatingBlocks.reduce((s, b) => s + blockMonthTotal(b, month), 0);
                return operating - financeOtherBlocks.reduce((s, b) => s + blockMonthTotal(b, month), 0);
              }}
              className="bg-slate-900 text-white border-t-2 border-slate-700"
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}
