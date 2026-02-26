"use client";

import { useMemo, useState } from "react";
import { Plus, X, TrendingUp, TrendingDown, Eye } from "lucide-react";
import { clsx } from "clsx";
import type {
  DbExpenseEntry,
  DbExpenseCategory,
  DbSupplier,
  DbRevenueEntry,
  ExpenseCategoryParentType,
} from "@/types/expenses";
import { PARENT_TYPE_LABELS } from "@/types/expenses";

interface Props {
  entries: DbExpenseEntry[];
  categories: DbExpenseCategory[];
  suppliers: DbSupplier[];
  revenue: DbRevenueEntry[];
  year: number;
  month?: number;
  onSaveRevenue: (data: {
    month: number;
    year: number;
    category?: string;
    amount: number;
    description?: string;
  }) => Promise<boolean>;
  onDeleteRevenue: (id: string) => Promise<boolean>;
}

type ViewMode = "yearly" | "compare";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const MONTH_SHORT = MONTHS.map((m) =>
  new Date(2000, m - 1).toLocaleString("he-IL", { month: "short" }),
);
const MONTH_LONG = MONTHS.map((m) =>
  new Date(2000, m - 1).toLocaleString("he-IL", { month: "long" }),
);

interface MonthlyPnl {
  revenue: number;
  costOfGoods: number;
  grossProfit: number;
  operating: number;
  operatingProfit: number;
  finance: number;
  other: number;
  netProfit: number;
  byCategory: Map<string, number>;
}

export default function PnlReportTab({
  entries,
  categories,
  suppliers,
  revenue,
  year,
  month,
  onSaveRevenue,
  onDeleteRevenue,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("yearly");
  const [compareMonthA, setCompareMonthA] = useState(1);
  const [compareMonthB, setCompareMonthB] = useState(
    Math.min(new Date().getMonth() + 1, 12),
  );
  const [showRevenueForm, setShowRevenueForm] = useState(false);
  const [revMonth, setRevMonth] = useState(month || new Date().getMonth() + 1);
  const [revYear, setRevYear] = useState(year);
  const [revAmount, setRevAmount] = useState("");
  const [revCategory] = useState("sales");
  const [revDescription, setRevDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const supplierMap = useMemo(() => {
    const m = new Map<string, DbSupplier>();
    for (const s of suppliers) m.set(s.id, s);
    return m;
  }, [suppliers]);

  const categoryMap = useMemo(() => {
    const m = new Map<string, DbExpenseCategory>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  // Build all unique category names grouped by parent type
  const categoryRows = useMemo(() => {
    const seen = new Map<string, { name: string; parentType: ExpenseCategoryParentType }>();
    for (const entry of entries) {
      const supplier = supplierMap.get(entry.supplier_id);
      const catId = supplier?.category_id;
      const cat = catId ? categoryMap.get(catId) : null;
      const catName = cat?.name || "ללא קטגוריה";
      const parentType = cat?.parent_type || "other";
      if (!seen.has(catName)) {
        seen.set(catName, { name: catName, parentType });
      }
    }
    return Array.from(seen.values());
  }, [entries, supplierMap, categoryMap]);

  // Monthly P&L data
  const monthlyData = useMemo((): MonthlyPnl[] => {
    return MONTHS.map((m) => {
      const monthEntries = entries.filter((e) => e.month === m && e.year === year);
      const monthRevenue = revenue.filter(
        (r) => r.month === m && r.year === year,
      );

      const rev = monthRevenue.reduce((s, r) => s + Number(r.amount), 0);
      const byCategory = new Map<string, number>();
      const byParent: Record<ExpenseCategoryParentType, number> = {
        cost_of_goods: 0,
        operating: 0,
        finance: 0,
        other: 0,
      };

      for (const entry of monthEntries) {
        const supplier = supplierMap.get(entry.supplier_id);
        const catId = supplier?.category_id;
        const cat = catId ? categoryMap.get(catId) : null;
        const catName = cat?.name || "ללא קטגוריה";
        const parentType = cat?.parent_type || "other";
        const amount = (Number(entry.debits) || 0) - (Number(entry.credits) || 0);

        byCategory.set(catName, (byCategory.get(catName) || 0) + amount);
        byParent[parentType] += amount;
      }

      const grossProfit = rev - byParent.cost_of_goods;
      const operatingProfit = grossProfit - byParent.operating;
      const netProfit = operatingProfit - byParent.finance - byParent.other;

      return {
        revenue: rev,
        costOfGoods: byParent.cost_of_goods,
        grossProfit,
        operating: byParent.operating,
        operatingProfit,
        finance: byParent.finance,
        other: byParent.other,
        netProfit,
        byCategory,
      };
    });
  }, [entries, revenue, year, supplierMap, categoryMap]);

  // Totals for the year
  const yearTotal = useMemo((): MonthlyPnl => {
    const totals: MonthlyPnl = {
      revenue: 0, costOfGoods: 0, grossProfit: 0, operating: 0,
      operatingProfit: 0, finance: 0, other: 0, netProfit: 0,
      byCategory: new Map(),
    };
    for (const md of monthlyData) {
      totals.revenue += md.revenue;
      totals.costOfGoods += md.costOfGoods;
      totals.grossProfit += md.grossProfit;
      totals.operating += md.operating;
      totals.operatingProfit += md.operatingProfit;
      totals.finance += md.finance;
      totals.other += md.other;
      totals.netProfit += md.netProfit;
      md.byCategory.forEach((val, key) => {
        totals.byCategory.set(key, (totals.byCategory.get(key) || 0) + val);
      });
    }
    return totals;
  }, [monthlyData]);

  const handleSaveRevenue = async () => {
    if (!revAmount) return;
    setSaving(true);
    await onSaveRevenue({
      month: revMonth,
      year: revYear,
      category: revCategory,
      amount: parseFloat(revAmount),
      description: revDescription || undefined,
    });
    setSaving(false);
    setShowRevenueForm(false);
    setRevAmount("");
    setRevDescription("");
  };

  const getCellVal = (md: MonthlyPnl, catName: string) =>
    md.byCategory.get(catName) || 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            דוח רווח והפסד — {year}
          </h2>
          <p className="text-sm text-gray-500">
            {entries.length} רשומות הוצאות · {revenue.length} רשומות הכנסה
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode("yearly")}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                viewMode === "yearly"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500",
              )}
            >
              <Eye className="w-3.5 h-3.5 inline ml-1" />
              שנתי
            </button>
            <button
              onClick={() => setViewMode("compare")}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                viewMode === "compare"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500",
              )}
            >
              השוואת חודשים
            </button>
          </div>
          <button
            onClick={() => setShowRevenueForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-xl text-xs font-medium hover:bg-green-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            הכנסה
          </button>
        </div>
      </div>

      {/* Revenue Form */}
      {showRevenueForm && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-green-900">הוספת הכנסה</h3>
            <button onClick={() => setShowRevenueForm(false)}>
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">חודש</label>
              <select
                value={revMonth}
                onChange={(e) => setRevMonth(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{MONTH_LONG[m - 1]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">שנה</label>
              <select
                value={revYear}
                onChange={(e) => setRevYear(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(
                  (y) => (<option key={y} value={y}>{y}</option>),
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">סכום (&#8362;)</label>
              <input
                type="number"
                value={revAmount}
                onChange={(e) => setRevAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">תיאור</label>
              <input
                type="text"
                value={revDescription}
                onChange={(e) => setRevDescription(e.target.value)}
                placeholder="מכירות, אחר..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <button
              onClick={handleSaveRevenue}
              disabled={!revAmount || saving}
              className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "שומר..." : "שמור"}
            </button>
          </div>
        </div>
      )}

      {/* Compare mode selector */}
      {viewMode === "compare" && (
        <div className="flex items-center justify-center gap-4 bg-gray-50 rounded-xl p-3">
          <select
            value={compareMonthA}
            onChange={(e) => setCompareMonthA(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white font-medium"
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>{MONTH_LONG[m - 1]}</option>
            ))}
          </select>
          <span className="text-gray-400 font-bold">⟷</span>
          <select
            value={compareMonthB}
            onChange={(e) => setCompareMonthB(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white font-medium"
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>{MONTH_LONG[m - 1]}</option>
            ))}
          </select>
        </div>
      )}

      {/* P&L Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              {viewMode === "yearly" ? (
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-right py-3 px-4 font-bold text-gray-700 sticky right-0 bg-gray-50 z-10 min-w-[160px]">
                    סעיף
                  </th>
                  {MONTHS.map((m) => (
                    <th
                      key={m}
                      className="text-center py-3 px-2 font-semibold text-gray-500 min-w-[80px]"
                    >
                      {MONTH_SHORT[m - 1]}
                    </th>
                  ))}
                  <th className="text-center py-3 px-3 font-bold text-gray-900 bg-gray-100 min-w-[95px]">
                    סה&quot;כ
                  </th>
                </tr>
              ) : (
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-right py-3 px-4 font-bold text-gray-700 min-w-[160px]">
                    סעיף
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-primary-700 min-w-[100px] bg-primary-50">
                    {MONTH_LONG[compareMonthA - 1]}
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-primary-700 min-w-[100px] bg-primary-50">
                    {MONTH_LONG[compareMonthB - 1]}
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600 min-w-[90px]">
                    הפרש
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600 min-w-[70px]">
                    % שינוי
                  </th>
                </tr>
              )}
            </thead>
            <tbody>
              {/* REVENUE */}
              <PnlTableRow
                label="הכנסות"
                isSection
                sectionColor="bg-green-50"
                textColor="text-green-800"
                monthlyData={monthlyData}
                yearTotal={yearTotal}
                getValue={(md) => md.revenue}
                viewMode={viewMode}
                compareA={compareMonthA}
                compareB={compareMonthB}
              />

              {/* COST OF GOODS */}
              <PnlTableRow
                label={`(-) ${PARENT_TYPE_LABELS.cost_of_goods}`}
                isSection
                monthlyData={monthlyData}
                yearTotal={yearTotal}
                getValue={(md) => md.costOfGoods}
                viewMode={viewMode}
                compareA={compareMonthA}
                compareB={compareMonthB}
                isExpense
              />
              {categoryRows
                .filter((c) => c.parentType === "cost_of_goods")
                .map((c) => (
                  <PnlTableRow
                    key={c.name}
                    label={c.name}
                    monthlyData={monthlyData}
                    yearTotal={yearTotal}
                    getValue={(md) => getCellVal(md, c.name)}
                    viewMode={viewMode}
                    compareA={compareMonthA}
                    compareB={compareMonthB}
                    isExpense
                    indent
                  />
                ))}

              {/* GROSS PROFIT */}
              <PnlTableRow
                label="= רווח גולמי"
                isSubtotal
                sectionColor="bg-blue-50"
                textColor="text-blue-900"
                monthlyData={monthlyData}
                yearTotal={yearTotal}
                getValue={(md) => md.grossProfit}
                viewMode={viewMode}
                compareA={compareMonthA}
                compareB={compareMonthB}
              />

              {/* OPERATING EXPENSES */}
              <PnlTableRow
                label={`(-) ${PARENT_TYPE_LABELS.operating}`}
                isSection
                monthlyData={monthlyData}
                yearTotal={yearTotal}
                getValue={(md) => md.operating}
                viewMode={viewMode}
                compareA={compareMonthA}
                compareB={compareMonthB}
                isExpense
              />
              {categoryRows
                .filter((c) => c.parentType === "operating")
                .map((c) => (
                  <PnlTableRow
                    key={c.name}
                    label={c.name}
                    monthlyData={monthlyData}
                    yearTotal={yearTotal}
                    getValue={(md) => getCellVal(md, c.name)}
                    viewMode={viewMode}
                    compareA={compareMonthA}
                    compareB={compareMonthB}
                    isExpense
                    indent
                  />
                ))}

              {/* OPERATING PROFIT */}
              <PnlTableRow
                label="= רווח תפעולי"
                isSubtotal
                sectionColor="bg-blue-50"
                textColor="text-blue-900"
                monthlyData={monthlyData}
                yearTotal={yearTotal}
                getValue={(md) => md.operatingProfit}
                viewMode={viewMode}
                compareA={compareMonthA}
                compareB={compareMonthB}
              />

              {/* FINANCE */}
              {yearTotal.finance > 0 && (
                <>
                  <PnlTableRow
                    label={`(-) ${PARENT_TYPE_LABELS.finance}`}
                    isSection
                    monthlyData={monthlyData}
                    yearTotal={yearTotal}
                    getValue={(md) => md.finance}
                    viewMode={viewMode}
                    compareA={compareMonthA}
                    compareB={compareMonthB}
                    isExpense
                  />
                  {categoryRows
                    .filter((c) => c.parentType === "finance")
                    .map((c) => (
                      <PnlTableRow
                        key={c.name}
                        label={c.name}
                        monthlyData={monthlyData}
                        yearTotal={yearTotal}
                        getValue={(md) => getCellVal(md, c.name)}
                        viewMode={viewMode}
                        compareA={compareMonthA}
                        compareB={compareMonthB}
                        isExpense
                        indent
                      />
                    ))}
                </>
              )}

              {/* OTHER */}
              {yearTotal.other > 0 && (
                <>
                  <PnlTableRow
                    label={`(-) ${PARENT_TYPE_LABELS.other}`}
                    isSection
                    monthlyData={monthlyData}
                    yearTotal={yearTotal}
                    getValue={(md) => md.other}
                    viewMode={viewMode}
                    compareA={compareMonthA}
                    compareB={compareMonthB}
                    isExpense
                  />
                  {categoryRows
                    .filter((c) => c.parentType === "other")
                    .map((c) => (
                      <PnlTableRow
                        key={c.name}
                        label={c.name}
                        monthlyData={monthlyData}
                        yearTotal={yearTotal}
                        getValue={(md) => getCellVal(md, c.name)}
                        viewMode={viewMode}
                        compareA={compareMonthA}
                        compareB={compareMonthB}
                        isExpense
                        indent
                      />
                    ))}
                </>
              )}

              {/* NET PROFIT */}
              <PnlTableRow
                label="= רווח נקי"
                isSubtotal
                isFinal
                sectionColor="bg-gradient-to-l from-primary-50 to-green-50"
                textColor="text-gray-900"
                monthlyData={monthlyData}
                yearTotal={yearTotal}
                getValue={(md) => md.netProfit}
                viewMode={viewMode}
                compareA={compareMonthA}
                compareB={compareMonthB}
              />

              {/* % NET MARGIN */}
              <tr className="border-t border-gray-200 bg-gray-50/50">
                <td className="py-2 px-4 text-gray-500 font-medium text-[11px]">
                  % רווח נקי מהכנסות
                </td>
                {viewMode === "yearly" ? (
                  <>
                    {MONTHS.map((m) => {
                      const md = monthlyData[m - 1]!;
                      const pct = md.revenue > 0 ? (md.netProfit / md.revenue) * 100 : 0;
                      return (
                        <td key={m} className="py-2 px-2 text-center">
                          <span
                            className={clsx(
                              "text-[10px] font-bold",
                              pct > 0 ? "text-green-600" : pct < 0 ? "text-red-500" : "text-gray-400",
                            )}
                          >
                            {md.revenue > 0 ? `${pct.toFixed(1)}%` : "-"}
                          </span>
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-center bg-gray-100">
                      <span
                        className={clsx(
                          "text-[11px] font-bold",
                          yearTotal.revenue > 0 && yearTotal.netProfit >= 0
                            ? "text-green-700"
                            : "text-red-600",
                        )}
                      >
                        {yearTotal.revenue > 0
                          ? `${((yearTotal.netProfit / yearTotal.revenue) * 100).toFixed(1)}%`
                          : "-"}
                      </span>
                    </td>
                  </>
                ) : (
                  <CompareMarginCells
                    monthlyData={monthlyData}
                    compareA={compareMonthA}
                    compareB={compareMonthB}
                  />
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue list */}
      {revenue.length > 0 && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <h3 className="text-xs font-bold text-green-800 mb-2">הכנסות שהוזנו</h3>
          <div className="space-y-1">
            {revenue.map((r) => (
              <div key={r.id} className="flex justify-between items-center text-xs text-green-700">
                <span>
                  {MONTH_LONG[r.month - 1]} {r.year} — {r.description || r.category}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{fmtC(Number(r.amount))}</span>
                  <button
                    onClick={() => onDeleteRevenue(r.id)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// PnlTableRow - renders one row in the P&L table
// ============================================

interface RowProps {
  label: string;
  isSection?: boolean;
  isSubtotal?: boolean;
  isFinal?: boolean;
  sectionColor?: string;
  textColor?: string;
  isExpense?: boolean;
  indent?: boolean;
  monthlyData: MonthlyPnl[];
  yearTotal: MonthlyPnl;
  getValue: (md: MonthlyPnl) => number;
  viewMode: ViewMode;
  compareA: number;
  compareB: number;
}

function PnlTableRow({
  label,
  isSection,
  isSubtotal,
  isFinal,
  sectionColor,
  textColor,
  isExpense,
  indent,
  monthlyData,
  yearTotal,
  getValue,
  viewMode,
  compareA,
  compareB,
}: RowProps) {
  const totalVal = getValue(yearTotal);

  if (viewMode === "yearly") {
    return (
      <tr
        className={clsx(
          "border-b border-gray-50 transition-colors",
          isSubtotal && sectionColor,
          isFinal && sectionColor,
          !isSection && !isSubtotal && "hover:bg-gray-50/50",
        )}
      >
        <td
          className={clsx(
            "py-2 px-4 sticky right-0 z-10",
            isSubtotal || isFinal
              ? `font-bold ${textColor || "text-gray-900"} ${sectionColor || "bg-white"}`
              : isSection
                ? `font-semibold text-gray-700 ${sectionColor || "bg-white"}`
                : indent
                  ? "pr-8 text-gray-500 bg-white"
                  : "text-gray-600 bg-white",
          )}
        >
          {label}
        </td>
        {MONTHS.map((m) => {
          const val = getValue(monthlyData[m - 1]!);
          return (
            <td key={m} className={clsx("py-2 px-2 text-center tabular-nums", isSubtotal && sectionColor, isFinal && sectionColor)}>
              {val !== 0 ? (
                <span
                  className={clsx(
                    isSubtotal || isFinal
                      ? `font-bold ${val >= 0 ? "text-green-700" : "text-red-600"}`
                      : isSection
                        ? "font-semibold text-gray-700"
                        : isExpense
                          ? "text-red-600"
                          : "text-gray-700",
                  )}
                >
                  {fmtK(val)}
                </span>
              ) : (
                <span className="text-gray-300">-</span>
              )}
            </td>
          );
        })}
        <td
          className={clsx(
            "py-2 px-3 text-center tabular-nums bg-gray-100",
            isSubtotal || isFinal ? "font-bold" : isSection ? "font-semibold" : "font-medium",
          )}
        >
          <span
            className={clsx(
              isSubtotal || isFinal
                ? totalVal >= 0 ? "text-green-700" : "text-red-600"
                : isExpense
                  ? "text-red-700"
                  : "text-gray-900",
            )}
          >
            {totalVal !== 0 ? fmtC(totalVal) : "-"}
          </span>
        </td>
      </tr>
    );
  }

  // Compare mode
  const valA = getValue(monthlyData[compareA - 1]!);
  const valB = getValue(monthlyData[compareB - 1]!);
  const diff = valB - valA;
  const pctChange = valA !== 0 ? ((valB - valA) / Math.abs(valA)) * 100 : 0;

  return (
    <tr
      className={clsx(
        "border-b border-gray-50",
        isSubtotal && sectionColor,
        isFinal && sectionColor,
      )}
    >
      <td
        className={clsx(
          "py-2.5 px-4",
          isSubtotal || isFinal
            ? `font-bold ${textColor || "text-gray-900"}`
            : isSection
              ? "font-semibold text-gray-700"
              : indent
                ? "pr-8 text-gray-500"
                : "text-gray-600",
        )}
      >
        {label}
      </td>
      <td className="py-2.5 px-4 text-center tabular-nums bg-primary-50/30">
        <span
          className={clsx(
            isSubtotal || isFinal ? "font-bold" : isSection ? "font-semibold" : "",
            isSubtotal && (valA >= 0 ? "text-green-700" : "text-red-600"),
          )}
        >
          {valA !== 0 ? fmtC(valA) : "-"}
        </span>
      </td>
      <td className="py-2.5 px-4 text-center tabular-nums bg-primary-50/30">
        <span
          className={clsx(
            isSubtotal || isFinal ? "font-bold" : isSection ? "font-semibold" : "",
            isSubtotal && (valB >= 0 ? "text-green-700" : "text-red-600"),
          )}
        >
          {valB !== 0 ? fmtC(valB) : "-"}
        </span>
      </td>
      <td className="py-2.5 px-4 text-center tabular-nums">
        {diff !== 0 ? (
          <span
            className={clsx(
              "font-medium",
              isExpense
                ? diff > 0 ? "text-red-600" : "text-green-600"
                : diff > 0 ? "text-green-600" : "text-red-600",
            )}
          >
            {diff > 0 ? "+" : ""}
            {fmtC(diff)}
          </span>
        ) : (
          <span className="text-gray-300">-</span>
        )}
      </td>
      <td className="py-2.5 px-4 text-center">
        {valA !== 0 && diff !== 0 ? (
          <span
            className={clsx(
              "inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-md",
              isExpense
                ? pctChange > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                : pctChange > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
            )}
          >
            {pctChange > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {pctChange > 0 ? "+" : ""}
            {pctChange.toFixed(1)}%
          </span>
        ) : (
          <span className="text-gray-300">-</span>
        )}
      </td>
    </tr>
  );
}

function CompareMarginCells({
  monthlyData,
  compareA,
  compareB,
}: {
  monthlyData: MonthlyPnl[];
  compareA: number;
  compareB: number;
}) {
  const mdA = monthlyData[compareA - 1]!;
  const mdB = monthlyData[compareB - 1]!;
  const pctA = mdA.revenue > 0 ? (mdA.netProfit / mdA.revenue) * 100 : 0;
  const pctB = mdB.revenue > 0 ? (mdB.netProfit / mdB.revenue) * 100 : 0;
  const diff = pctB - pctA;

  return (
    <>
      <td className="py-2 px-4 text-center bg-primary-50/30">
        <span className={clsx("text-[11px] font-bold", pctA >= 0 ? "text-green-600" : "text-red-600")}>
          {mdA.revenue > 0 ? `${pctA.toFixed(1)}%` : "-"}
        </span>
      </td>
      <td className="py-2 px-4 text-center bg-primary-50/30">
        <span className={clsx("text-[11px] font-bold", pctB >= 0 ? "text-green-600" : "text-red-600")}>
          {mdB.revenue > 0 ? `${pctB.toFixed(1)}%` : "-"}
        </span>
      </td>
      <td className="py-2 px-4 text-center">
        <span className={clsx("text-[11px] font-bold", diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-400")}>
          {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
        </span>
      </td>
      <td />
    </>
  );
}

function fmtC(val: number): string {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(val);
}

function fmtK(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (abs >= 10000) return `${(val / 1000).toFixed(0)}K`;
  if (abs >= 1000) return `${(val / 1000).toFixed(1)}K`;
  return fmtC(val);
}
