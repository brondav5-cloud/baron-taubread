"use client";

import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { clsx } from "clsx";
import type { DbExpenseEntry, DbExpenseCategory, DbSupplier } from "@/types/expenses";
import { PARENT_TYPE_LABELS } from "@/types/expenses";

interface Props {
  entries: DbExpenseEntry[];
  categories: DbExpenseCategory[];
  suppliers: DbSupplier[];
  year: number;
  month?: number;
}

interface CategorySummary {
  category: DbExpenseCategory | null;
  totalDebits: number;
  totalCredits: number;
  net: number;
  supplierCount: number;
  entries: DbExpenseEntry[];
}

export default function ExpenseReportTab({
  entries,
  categories,
  suppliers,
  year,
  month,
}: Props) {
  const [viewMode, setViewMode] = useState<"category" | "monthly" | "supplier">(
    "category",
  );
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

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

  // Summary by category
  const byCategorySummary = useMemo((): CategorySummary[] => {
    const map = new Map<string, CategorySummary>();

    for (const entry of entries) {
      const supplier = supplierMap.get(entry.supplier_id);
      const catId = supplier?.category_id || "uncategorized";
      const cat = catId !== "uncategorized" ? categoryMap.get(catId) ?? null : null;

      if (!map.has(catId)) {
        map.set(catId, {
          category: cat,
          totalDebits: 0,
          totalCredits: 0,
          net: 0,
          supplierCount: 0,
          entries: [],
        });
      }

      const summary = map.get(catId)!;
      summary.totalDebits += Number(entry.debits) || 0;
      summary.totalCredits += Number(entry.credits) || 0;
      summary.net += (Number(entry.debits) || 0) - (Number(entry.credits) || 0);
      summary.entries.push(entry);
    }

    // Count unique suppliers per category
    map.forEach((summary) => {
      const uniqueSuppliers = new Set(summary.entries.map((e: DbExpenseEntry) => e.supplier_id));
      summary.supplierCount = uniqueSuppliers.size;
    });

    return Array.from(map.values()).sort((a, b) => b.net - a.net);
  }, [entries, supplierMap, categoryMap]);

  // Summary by month
  const byMonthSummary = useMemo(() => {
    const map = new Map<string, { month: number; year: number; debits: number; credits: number; net: number }>();
    for (const entry of entries) {
      const key = `${entry.year}-${String(entry.month).padStart(2, "0")}`;
      if (!map.has(key)) {
        map.set(key, { month: entry.month, year: entry.year, debits: 0, credits: 0, net: 0 });
      }
      const s = map.get(key)!;
      s.debits += Number(entry.debits) || 0;
      s.credits += Number(entry.credits) || 0;
      s.net += (Number(entry.debits) || 0) - (Number(entry.credits) || 0);
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }, [entries]);

  const grandTotalDebits = byCategorySummary.reduce((s, c) => s + c.totalDebits, 0);
  const grandTotalCredits = byCategorySummary.reduce((s, c) => s + c.totalCredits, 0);
  const grandTotalNet = grandTotalDebits - grandTotalCredits;

  const maxNet = Math.max(...byCategorySummary.map((c) => c.net), 1);

  if (entries.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-lg">אין נתוני הוצאות</p>
        <p className="text-sm mt-1">העלה דוח הוצאות בטאב &quot;העלאת קובץ&quot;</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">דוח הוצאות</h2>
          <p className="text-sm text-gray-500">
            {month
              ? `${new Date(year, month - 1).toLocaleString("he-IL", { month: "long" })} ${year}`
              : `שנת ${year}`}{" "}
            · {entries.length} רשומות
          </p>
        </div>
        <div className="flex gap-2">
          {(["category", "monthly", "supplier"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                viewMode === mode
                  ? "bg-primary-100 text-primary-700"
                  : "text-gray-500 hover:bg-gray-100",
              )}
            >
              {mode === "category" ? "לפי קטגוריה" : mode === "monthly" ? "לפי חודש" : "לפי ספק"}
            </button>
          ))}
        </div>
      </div>

      {/* Grand totals */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
          <p className="text-xs text-red-500">סה&quot;כ חיובים</p>
          <p className="text-xl font-bold text-red-700 mt-1">{formatCurrency(grandTotalDebits)}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
          <p className="text-xs text-green-500">סה&quot;כ זיכויים</p>
          <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(grandTotalCredits)}</p>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500">סה&quot;כ נטו</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(grandTotalNet)}</p>
        </div>
      </div>

      {/* By Category View */}
      {viewMode === "category" && (
        <div className="space-y-3">
          {byCategorySummary.map((summary, idx) => {
            const catName = summary.category?.name || "ללא קטגוריה";
            const catId = summary.category?.id || "uncategorized";
            const isExpanded = expandedCategory === catId;
            const barWidth = (summary.net / maxNet) * 100;

            return (
              <div
                key={catId}
                className="bg-white border border-gray-100 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : catId)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-right"
                >
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center text-xs font-bold text-primary-600">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{catName}</p>
                    <p className="text-xs text-gray-400">
                      {summary.supplierCount} ספקים ·{" "}
                      {summary.category
                        ? PARENT_TYPE_LABELS[summary.category.parent_type]
                        : ""}
                    </p>
                  </div>
                  <div className="flex-1 hidden md:block">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-l from-primary-500 to-primary-300 rounded-full transition-all"
                        style={{ width: `${Math.max(barWidth, 2)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-900">
                      {formatCurrency(summary.net)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {((summary.net / grandTotalNet) * 100).toFixed(1)}%
                    </p>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-400">
                          <th className="text-right pb-2">ספק</th>
                          <th className="text-right pb-2">תאריך</th>
                          <th className="text-right pb-2">פרטים</th>
                          <th className="text-left pb-2">חיובים</th>
                          <th className="text-left pb-2">זיכויים</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.entries.slice(0, 50).map((entry) => {
                          const sup = supplierMap.get(entry.supplier_id);
                          return (
                            <tr key={entry.id} className="border-t border-gray-100">
                              <td className="py-2 text-gray-700">{sup?.name}</td>
                              <td className="py-2 text-gray-500">{entry.reference_date || "-"}</td>
                              <td className="py-2 text-gray-500">{entry.details || "-"}</td>
                              <td className="py-2 text-left text-red-600">
                                {Number(entry.debits) > 0 ? formatCurrency(Number(entry.debits)) : "-"}
                              </td>
                              <td className="py-2 text-left text-green-600">
                                {Number(entry.credits) > 0 ? formatCurrency(Number(entry.credits)) : "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {summary.entries.length > 50 && (
                      <p className="text-xs text-gray-400 mt-2 text-center">
                        מוצגות 50 מתוך {summary.entries.length} רשומות
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* By Month View */}
      {viewMode === "monthly" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">חודש</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">חיובים</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">זיכויים</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">נטו</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {byMonthSummary.map((m) => {
                const maxMonthNet = Math.max(...byMonthSummary.map((x) => x.net), 1);
                const pct = (m.net / maxMonthNet) * 100;
                return (
                  <tr key={`${m.year}-${m.month}`} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {new Date(m.year, m.month - 1).toLocaleString("he-IL", {
                        month: "long",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 text-left text-red-600">{formatCurrency(m.debits)}</td>
                    <td className="py-3 px-4 text-left text-green-600">{formatCurrency(m.credits)}</td>
                    <td className="py-3 px-4 text-left font-bold text-gray-900">{formatCurrency(m.net)}</td>
                    <td className="py-3 px-4 w-40">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-400 rounded-full"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* By Supplier View */}
      {viewMode === "supplier" && (
        <SupplierView entries={entries} supplierMap={supplierMap} />
      )}
    </div>
  );
}

function SupplierView({
  entries,
  supplierMap,
}: {
  entries: DbExpenseEntry[];
  supplierMap: Map<string, DbSupplier>;
}) {
  const bySupplier = useMemo(() => {
    const map = new Map<string, { supplier: DbSupplier | undefined; debits: number; credits: number; net: number }>();
    for (const e of entries) {
      if (!map.has(e.supplier_id)) {
        map.set(e.supplier_id, {
          supplier: supplierMap.get(e.supplier_id),
          debits: 0,
          credits: 0,
          net: 0,
        });
      }
      const s = map.get(e.supplier_id)!;
      s.debits += Number(e.debits) || 0;
      s.credits += Number(e.credits) || 0;
      s.net += (Number(e.debits) || 0) - (Number(e.credits) || 0);
    }
    return Array.from(map.values()).sort((a, b) => b.net - a.net);
  }, [entries, supplierMap]);

  const maxNet = Math.max(...bySupplier.map((s) => s.net), 1);

  return (
    <div className="space-y-2">
      {bySupplier.map((item, idx) => {
        const pct = (item.net / maxNet) * 100;
        return (
          <div key={idx} className="flex items-center gap-4 py-2 border-b border-gray-50">
            <span className="w-6 text-xs text-gray-400 text-center">{idx + 1}</span>
            <span className="flex-1 text-sm text-gray-900 font-medium truncate">
              {item.supplier?.name || "לא ידוע"}
            </span>
            <div className="w-32 hidden md:block">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-400 rounded-full"
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-bold text-gray-900 w-28 text-left">
              {formatCurrency(item.net)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(val);
}
