"use client";

import { useMemo, useState } from "react";
import { GitCompare, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { clsx } from "clsx";
import type {
  DbExpenseEntry,
  DbExpenseCategory,
  DbSupplier,
  DbRevenueEntry,
} from "@/types/expenses";

interface Props {
  entries: DbExpenseEntry[];
  categories: DbExpenseCategory[];
  suppliers: DbSupplier[];
  revenue: DbRevenueEntry[];
  year: number;
}

type CompareMode = "month_vs_month" | "year_vs_year" | "category_trend";

const MONTH_NAMES = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i).toLocaleString("he-IL", { month: "long" }),
);

export default function ComparisonTab({
  entries,
  categories,
  suppliers,
  revenue,
  year,
}: Props) {
  const [mode, setMode] = useState<CompareMode>("month_vs_month");
  const [monthA, setMonthA] = useState(Math.max(new Date().getMonth(), 1));
  const [monthB, setMonthB] = useState(Math.max(new Date().getMonth() + 1, 1));
  const [compareYear, setCompareYear] = useState(year - 1);

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

  // Monthly aggregation helper
  const getMonthData = (
    targetYear: number,
    targetMonth: number,
  ) => {
    const monthEntries = entries.filter(
      (e) => e.year === targetYear && e.month === targetMonth,
    );
    const monthRevenue = revenue.filter(
      (r) => r.year === targetYear && r.month === targetMonth,
    );

    const totalExpenses = monthEntries.reduce(
      (sum, e) => sum + ((Number(e.debits) || 0) - (Number(e.credits) || 0)),
      0,
    );
    const totalRevenue = monthRevenue.reduce(
      (sum, r) => sum + Number(r.amount),
      0,
    );

    const byCategory = new Map<string, number>();
    for (const e of monthEntries) {
      const sup = supplierMap.get(e.supplier_id);
      const cat = sup?.category_id ? categoryMap.get(sup.category_id) : null;
      const catName = cat?.name || "ללא קטגוריה";
      byCategory.set(catName, (byCategory.get(catName) || 0) + ((Number(e.debits) || 0) - (Number(e.credits) || 0)));
    }

    return { totalExpenses, totalRevenue, netProfit: totalRevenue - totalExpenses, byCategory };
  };

  // Month vs Month
  const monthComparison = useMemo(() => {
    if (mode !== "month_vs_month") return null;
    const a = getMonthData(year, monthA);
    const b = getMonthData(year, monthB);
    return { a, b };
  }, [mode, year, monthA, monthB, entries, revenue]);

  // Year vs Year
  const yearComparison = useMemo(() => {
    if (mode !== "year_vs_year") return null;
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const currentData = months.map((m) => getMonthData(year, m));
    const compareData = months.map((m) => getMonthData(compareYear, m));

    const currentTotal = currentData.reduce((s, d) => s + d.totalExpenses, 0);
    const compareTotal = compareData.reduce((s, d) => s + d.totalExpenses, 0);
    const currentRevTotal = currentData.reduce((s, d) => s + d.totalRevenue, 0);
    const compareRevTotal = compareData.reduce((s, d) => s + d.totalRevenue, 0);

    return {
      months,
      currentData,
      compareData,
      currentTotal,
      compareTotal,
      currentRevTotal,
      compareRevTotal,
    };
  }, [mode, year, compareYear, entries, revenue]);

  // Category trend (all months in year)
  const categoryTrend = useMemo(() => {
    if (mode !== "category_trend") return null;
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const catNames = new Set<string>();

    const data = months.map((m) => {
      const md = getMonthData(year, m);
      md.byCategory.forEach((_, key) => catNames.add(key));
      return { month: m, ...md };
    });

    return { months, data, catNames: Array.from(catNames) };
  }, [mode, year, entries, revenue]);

  if (entries.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <GitCompare className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-lg">אין נתונים להשוואה</p>
        <p className="text-sm mt-1">העלה דוחות הוצאות כדי לראות ניתוחים</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mode selector */}
      <div className="flex flex-wrap gap-2">
        {([
          { id: "month_vs_month", label: "חודש מול חודש" },
          { id: "year_vs_year", label: "שנה מול שנה" },
          { id: "category_trend", label: "מגמת קטגוריות" },
        ] as const).map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
              mode === m.id
                ? "bg-primary-100 text-primary-700 shadow-sm"
                : "bg-gray-50 text-gray-500 hover:bg-gray-100",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Month vs Month */}
      {mode === "month_vs_month" && monthComparison && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 justify-center">
            <select
              value={monthA}
              onChange={(e) => setMonthA(Number(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i} value={i + 1}>{name}</option>
              ))}
            </select>
            <ArrowRight className="w-5 h-5 text-gray-400 rotate-180" />
            <select
              value={monthB}
              onChange={(e) => setMonthB(Number(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <CompareCard
              label="הוצאות"
              valueA={monthComparison.a.totalExpenses}
              valueB={monthComparison.b.totalExpenses}
              labelA={MONTH_NAMES[monthA - 1] ?? ""}
              labelB={MONTH_NAMES[monthB - 1] ?? ""}
              invertColors
            />
            <CompareCard
              label="הכנסות"
              valueA={monthComparison.a.totalRevenue}
              valueB={monthComparison.b.totalRevenue}
              labelA={MONTH_NAMES[monthA - 1] ?? ""}
              labelB={MONTH_NAMES[monthB - 1] ?? ""}
            />
            <CompareCard
              label="רווח נקי"
              valueA={monthComparison.a.netProfit}
              valueB={monthComparison.b.netProfit}
              labelA={MONTH_NAMES[monthA - 1] ?? ""}
              labelB={MONTH_NAMES[monthB - 1] ?? ""}
            />
          </div>

          {/* Category breakdown comparison */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">השוואה לפי קטגוריה</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400">
                  <th className="text-right py-2 px-4">קטגוריה</th>
                  <th className="text-left py-2 px-4">{MONTH_NAMES[monthA - 1] ?? ""}</th>
                  <th className="text-left py-2 px-4">{MONTH_NAMES[monthB - 1] ?? ""}</th>
                  <th className="text-left py-2 px-4">הפרש</th>
                  <th className="text-left py-2 px-4">% שינוי</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const allCats = new Set<string>();
                  monthComparison.a.byCategory.forEach((_, k) => allCats.add(k));
                  monthComparison.b.byCategory.forEach((_, k) => allCats.add(k));
                  return Array.from(allCats).map((cat) => {
                    const valA = monthComparison.a.byCategory.get(cat) || 0;
                    const valB = monthComparison.b.byCategory.get(cat) || 0;
                    const diff = valB - valA;
                    const pct = valA !== 0 ? ((valB - valA) / Math.abs(valA)) * 100 : 0;
                    return (
                      <tr key={cat} className="border-b border-gray-50">
                        <td className="py-2 px-4 text-gray-700">{cat}</td>
                        <td className="py-2 px-4 text-left">{formatCurrency(valA)}</td>
                        <td className="py-2 px-4 text-left">{formatCurrency(valB)}</td>
                        <td className={clsx("py-2 px-4 text-left font-medium", diff > 0 ? "text-red-600" : diff < 0 ? "text-green-600" : "text-gray-400")}>
                          {diff > 0 ? "+" : ""}{formatCurrency(diff)}
                        </td>
                        <td className="py-2 px-4 text-left">
                          <ChangeIndicator value={pct} />
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Year vs Year */}
      {mode === "year_vs_year" && yearComparison && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 justify-center">
            <span className="text-sm font-medium text-gray-700">{year}</span>
            <ArrowRight className="w-5 h-5 text-gray-400 rotate-180" />
            <select
              value={compareYear}
              onChange={(e) => setCompareYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
            >
              {Array.from({ length: 5 }, (_, i) => year - 1 - i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <CompareCard
              label="סה&quot;כ הוצאות"
              valueA={yearComparison.compareTotal}
              valueB={yearComparison.currentTotal}
              labelA={String(compareYear)}
              labelB={String(year)}
              invertColors
            />
            <CompareCard
              label="סה&quot;כ הכנסות"
              valueA={yearComparison.compareRevTotal}
              valueB={yearComparison.currentRevTotal}
              labelA={String(compareYear)}
              labelB={String(year)}
            />
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">השוואה חודשית</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400">
                  <th className="text-right py-2 px-4">חודש</th>
                  <th className="text-left py-2 px-4">{compareYear}</th>
                  <th className="text-left py-2 px-4">{year}</th>
                  <th className="text-left py-2 px-4">הפרש</th>
                  <th className="text-left py-2 px-4">% שינוי</th>
                </tr>
              </thead>
              <tbody>
                {yearComparison.months.map((m, i) => {
                  const prev = yearComparison.compareData[i]?.totalExpenses ?? 0;
                  const curr = yearComparison.currentData[i]?.totalExpenses ?? 0;
                  const diff = curr - prev;
                  const pct = prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : 0;
                  return (
                    <tr key={m} className="border-b border-gray-50">
                      <td className="py-2 px-4 text-gray-700">{MONTH_NAMES[m - 1] ?? ""}</td>
                      <td className="py-2 px-4 text-left">{formatCurrency(prev)}</td>
                      <td className="py-2 px-4 text-left">{formatCurrency(curr)}</td>
                      <td className={clsx("py-2 px-4 text-left font-medium", diff > 0 ? "text-red-600" : diff < 0 ? "text-green-600" : "text-gray-400")}>
                        {diff > 0 ? "+" : ""}{formatCurrency(diff)}
                      </td>
                      <td className="py-2 px-4 text-left">
                        <ChangeIndicator value={pct} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Category Trend */}
      {mode === "category_trend" && categoryTrend && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 text-center">
            מגמת הוצאות לפי קטגוריה — {year}
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-2 px-3 font-semibold text-gray-500 sticky right-0 bg-white">
                    קטגוריה
                  </th>
                  {categoryTrend.months.map((m) => (
                    <th key={m} className="text-center py-2 px-2 font-semibold text-gray-500">
                      {(MONTH_NAMES[m - 1] ?? "").slice(0, 3)}
                    </th>
                  ))}
                  <th className="text-left py-2 px-3 font-bold text-gray-700">סה&quot;כ</th>
                </tr>
              </thead>
              <tbody>
                {categoryTrend.catNames.map((catName) => {
                  const monthValues = categoryTrend.months.map(
                    (m) => categoryTrend.data[m - 1]?.byCategory.get(catName) ?? 0,
                  );
                  const total = monthValues.reduce((s, v) => s + v, 0);
                  const maxVal = Math.max(...monthValues, 1);

                  return (
                    <tr key={catName} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-700 font-medium sticky right-0 bg-white">
                        {catName}
                      </td>
                      {monthValues.map((val, i) => (
                        <td key={i} className="py-2 px-2 text-center">
                          {val > 0 ? (
                            <div className="relative">
                              <div
                                className="mx-auto h-1.5 bg-primary-200 rounded-full"
                                style={{
                                  width: `${Math.max((val / maxVal) * 100, 10)}%`,
                                }}
                              />
                              <span className="text-[10px] text-gray-500 mt-0.5 block">
                                {(val / 1000).toFixed(0)}k
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      ))}
                      <td className="py-2 px-3 text-left font-bold text-gray-900">
                        {formatCurrency(total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function CompareCard({
  label,
  valueA,
  valueB,
  labelA,
  labelB,
  invertColors,
}: {
  label: string;
  valueA: number;
  valueB: number;
  labelA: string;
  labelB: string;
  invertColors?: boolean;
}) {
  const diff = valueB - valueA;
  const pct = valueA !== 0 ? ((valueB - valueA) / Math.abs(valueA)) * 100 : 0;
  const isIncrease = diff > 0;
  const isGood = invertColors ? !isIncrease : isIncrease;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <div className="flex justify-between items-end">
        <div>
          <p className="text-xs text-gray-400">{labelA}</p>
          <p className="text-sm font-medium text-gray-600">{formatCurrency(valueA)}</p>
        </div>
        <div className="text-center">
          <ChangeIndicator value={pct} large />
        </div>
        <div className="text-left">
          <p className="text-xs text-gray-400">{labelB}</p>
          <p className="text-sm font-bold text-gray-900">{formatCurrency(valueB)}</p>
        </div>
      </div>
      <div className="mt-2 text-center">
        <span
          className={clsx(
            "text-xs font-medium",
            isGood ? "text-green-600" : diff !== 0 ? "text-red-600" : "text-gray-400",
          )}
        >
          {diff > 0 ? "+" : ""}
          {formatCurrency(diff)}
        </span>
      </div>
    </div>
  );
}

function ChangeIndicator({ value, large }: { value: number; large?: boolean }) {
  if (Math.abs(value) < 0.1) {
    return (
      <span className={clsx("text-gray-400 flex items-center gap-1", large ? "text-sm" : "text-xs")}>
        <Minus className="w-3 h-3" /> 0%
      </span>
    );
  }
  const isUp = value > 0;
  return (
    <span
      className={clsx(
        "flex items-center gap-0.5 font-medium",
        large ? "text-sm" : "text-xs",
        isUp ? "text-red-600" : "text-green-600",
      )}
    >
      {isUp ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      {isUp ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(val);
}
