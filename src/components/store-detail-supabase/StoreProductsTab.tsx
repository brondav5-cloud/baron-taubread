"use client";

import { useState, useMemo } from "react";
import { Search, Package, PackageX, CalendarDays, TrendingUp, TrendingDown, Minus, ArrowLeftRight } from "lucide-react";
import { clsx } from "clsx";
import { formatNumber } from "@/lib/calculations";
import type { StoreProduct, MissingProduct } from "@/hooks/useStoreProducts";
import {
  useStoreMonthlyProducts,
  type MonthlyProductRow,
} from "@/hooks/useStoreMonthlyProducts";

// ============================================
// TYPES
// ============================================

interface StoreProductsTabProps {
  storeProducts: StoreProduct[];
  missingProducts: MissingProduct[];
  totalProducts: number;
  totalMissing: number;
  isLoading: boolean;
  error: string | null;
  productSearch: string;
  missingSearch: string;
  onProductSearchChange: (v: string) => void;
  onMissingSearchChange: (v: string) => void;
  // For monthly tab
  companyId?: string | null;
  storeExternalId?: number | null;
}

type SubTab = "selling" | "missing" | "monthly";

// ============================================
// SEARCH INPUT
// ============================================

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pr-10 pl-4 py-2 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:border-blue-300 focus:ring-1 focus:ring-blue-300 outline-none"
      />
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function StoreProductsTab({
  storeProducts,
  missingProducts,
  totalProducts,
  totalMissing,
  isLoading,
  error,
  productSearch,
  missingSearch,
  onProductSearchChange,
  onMissingSearchChange,
  companyId,
  storeExternalId,
}: StoreProductsTabProps) {
  const [subTab, setSubTab] = useState<SubTab>("selling");

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-gray-400 animate-pulse">
        טוען מוצרים...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
        <PackageX className="w-10 h-10 mx-auto mb-2 text-orange-400" />
        <p className="text-gray-600">{error}</p>
        <p className="text-sm text-gray-400 mt-1">
          ייתכן שטבלת store_products עדיין לא נוצרה ב-Supabase
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSubTab("selling")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
            subTab === "selling"
              ? "bg-green-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          )}
        >
          <Package className="w-4 h-4" />
          מוכר ({totalProducts})
        </button>
        <button
          onClick={() => setSubTab("missing")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
            subTab === "missing"
              ? "bg-orange-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          )}
        >
          <PackageX className="w-4 h-4" />
          לא מוכר ({totalMissing})
        </button>
        <button
          onClick={() => setSubTab("monthly")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
            subTab === "monthly"
              ? "bg-purple-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          )}
        >
          <CalendarDays className="w-4 h-4" />
          פירוט חודשי
        </button>
      </div>

      {/* Selling products */}
      {subTab === "selling" && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b flex items-center gap-4">
            <h3 className="font-bold text-gray-900 shrink-0">
              📦 מוצרים שהחנות מוכרת
            </h3>
            <SearchInput
              value={productSearch}
              onChange={onProductSearchChange}
              placeholder="חיפוש מוצר..."
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-right font-medium">מוצר</th>
                  <th className="px-4 py-2 text-right font-medium">קטגוריה</th>
                  <th className="px-4 py-2 text-center font-medium">כמות</th>
                  <th className="px-4 py-2 text-center font-medium">מכירות</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {storeProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center">
                      <p className="text-gray-400">לא נמצאו מוצרים</p>
                      <p className="text-xs text-gray-300 mt-1">
                        העלה שוב את קובץ ה-Excel אם יצרת לאחרונה את טבלת
                        store_products
                      </p>
                    </td>
                  </tr>
                ) : (
                  storeProducts.slice(0, 50).map((p) => (
                    <tr
                      key={p.product_external_id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-2 font-medium">
                        {p.product_name}
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {p.product_category}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {formatNumber(p.total_qty)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        ₪{formatNumber(Math.round(p.total_sales))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {storeProducts.length > 50 && (
            <div className="p-3 text-center text-sm text-gray-400 border-t">
              מציג 50 מתוך {storeProducts.length}
            </div>
          )}
        </div>
      )}

      {/* Missing products */}
      {subTab === "missing" && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b flex items-center gap-4">
            <h3 className="font-bold text-gray-900 shrink-0">
              🚫 מוצרים שהחנות לא מוכרת
            </h3>
            <SearchInput
              value={missingSearch}
              onChange={onMissingSearchChange}
              placeholder="חיפוש מוצר חסר..."
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-right font-medium">מוצר</th>
                  <th className="px-4 py-2 text-right font-medium">קטגוריה</th>
                  <th className="px-4 py-2 text-center font-medium">
                    כמות גלובלית (שנתי)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {missingProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      החנות מוכרת את כל המוצרים!
                    </td>
                  </tr>
                ) : (
                  missingProducts.slice(0, 50).map((p) => (
                    <tr key={p.external_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{p.name}</td>
                      <td className="px-4 py-2 text-gray-500">
                        {p.category || "-"}
                      </td>
                      <td className="px-4 py-2 text-center text-orange-600 font-medium">
                        {formatNumber(p.total_qty_global)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {missingProducts.length > 50 && (
            <div className="p-3 text-center text-sm text-gray-400 border-t">
              מציג 50 מתוך {missingProducts.length}
            </div>
          )}
        </div>
      )}

      {/* Monthly breakdown */}
      {subTab === "monthly" && (
        <MonthlyBreakdown
          companyId={companyId ?? null}
          storeExternalId={storeExternalId ?? null}
        />
      )}
    </div>
  );
}

// ============================================================
// MONTHLY BREAKDOWN PANEL
// ============================================================

function MonthlyBreakdown({
  companyId,
  storeExternalId,
}: {
  companyId: string | null;
  storeExternalId: number | null;
}) {
  const { rows, availableMonths, isLoading, error } = useStoreMonthlyProducts(
    companyId,
    storeExternalId,
  );

  const [selectedMonth,  setSelectedMonth]  = useState<string>("");
  const [compareMonth,   setCompareMonth]   = useState<string>("");
  const [showCompare,    setShowCompare]    = useState(false);

  // Auto-select most recent month
  const currentMonth = selectedMonth || availableMonths[0] || "";
  const prevMonth    = compareMonth  || availableMonths[1] || "";

  const formatMonthLabel = (mk: string) => {
    if (!mk) return "";
    const [y, m] = mk.split("-");
    const monthNames = ["","ינואר","פברואר","מרץ","אפריל","מאי","יוני",
                         "יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
    return `${monthNames[parseInt(m ?? "0", 10)] ?? m} ${y}`;
  };

  // Group rows by month
  const byMonth = useMemo(() => {
    const map = new Map<string, MonthlyProductRow[]>();
    for (const row of rows) {
      if (!map.has(row.month_key)) map.set(row.month_key, []);
      map.get(row.month_key)!.push(row);
    }
    return map;
  }, [rows]);

  const currentRows = useMemo(
    () => (byMonth.get(currentMonth) ?? []).sort((a, b) => b.qty - a.qty),
    [byMonth, currentMonth],
  );
  const compareRows = useMemo(
    () => (byMonth.get(prevMonth) ?? []),
    [byMonth, prevMonth],
  );

  // Build compare lookup
  const compareMap = useMemo(() => {
    const m = new Map<number, MonthlyProductRow>();
    compareRows.forEach((r) => m.set(r.product_external_id, r));
    return m;
  }, [compareRows]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400 animate-pulse">
        טוען נתונים חודשיים...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-red-500">
        {error}
      </div>
    );
  }

  if (availableMonths.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <CalendarDays className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500 font-medium">אין נתונים חודשיים עדיין</p>
        <p className="text-sm text-gray-400 mt-1">
          יש להעלות קובץ נתוני חלוקה כדי לראות פירוט חודשי לפי מוצר
        </p>
        <a
          href="/dashboard/upload"
          className="inline-block mt-4 text-purple-600 text-sm underline hover:text-purple-800"
        >
          עבור להעלאת נתונים
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-sm border p-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">חודש:</label>
          <select
            value={currentMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-500"
          >
            {availableMonths.map((mk) => (
              <option key={mk} value={mk}>
                {formatMonthLabel(mk)}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowCompare(!showCompare)}
          className={clsx(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            showCompare
              ? "bg-purple-100 text-purple-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          )}
        >
          <ArrowLeftRight className="w-4 h-4" />
          השוואה בין חודשים
        </button>

        {showCompare && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">לעומת:</label>
            <select
              value={prevMonth}
              onChange={(e) => setCompareMonth(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-500"
            >
              {availableMonths
                .filter((mk) => mk !== currentMonth)
                .map((mk) => (
                  <option key={mk} value={mk}>
                    {formatMonthLabel(mk)}
                  </option>
                ))}
            </select>
          </div>
        )}

        <span className="text-xs text-gray-400 mr-auto">
          {currentRows.length} מוצרים
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-purple-50">
          <h3 className="font-bold text-purple-900">
            📦 {formatMonthLabel(currentMonth)}
            {showCompare && prevMonth && (
              <span className="text-sm font-normal text-purple-600 mr-2">
                לעומת {formatMonthLabel(prevMonth)}
              </span>
            )}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2 text-right font-medium">מוצר</th>
                <th className="px-3 py-2 text-center font-medium">כמות</th>
                {showCompare && prevMonth && (
                  <th className="px-3 py-2 text-center font-medium">
                    {formatMonthLabel(prevMonth)}
                  </th>
                )}
                {showCompare && prevMonth && (
                  <th className="px-3 py-2 text-center font-medium">שינוי</th>
                )}
                <th className="px-3 py-2 text-center font-medium">מכירות</th>
                <th className="px-3 py-2 text-center font-medium">החזרות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    לא נמצאו נתונים לחודש זה
                  </td>
                </tr>
              ) : (
                currentRows.map((row) => {
                  const cmpRow = showCompare && prevMonth
                    ? compareMap.get(row.product_external_id)
                    : null;
                  const pctChange =
                    cmpRow && cmpRow.qty > 0
                      ? ((row.qty - cmpRow.qty) / cmpRow.qty) * 100
                      : null;

                  return (
                    <tr key={row.product_external_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-800">
                        {row.product_name}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-gray-900">
                        {formatNumber(row.qty)}
                      </td>
                      {showCompare && prevMonth && (
                        <td className="px-3 py-2 text-center text-gray-500">
                          {cmpRow ? formatNumber(cmpRow.qty) : "—"}
                        </td>
                      )}
                      {showCompare && prevMonth && (
                        <td className="px-3 py-2 text-center">
                          {pctChange === null ? (
                            <span className="text-gray-300 text-xs">—</span>
                          ) : (
                            <span
                              className={clsx(
                                "inline-flex items-center gap-0.5 text-xs font-medium",
                                pctChange > 3
                                  ? "text-green-600"
                                  : pctChange < -3
                                    ? "text-red-600"
                                    : "text-gray-500",
                              )}
                            >
                              {pctChange > 3 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : pctChange < -3 ? (
                                <TrendingDown className="w-3 h-3" />
                              ) : (
                                <Minus className="w-3 h-3" />
                              )}
                              {pctChange > 0 ? "+" : ""}
                              {pctChange.toFixed(0)}%
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-3 py-2 text-center text-gray-600">
                        ₪{formatNumber(Math.round(row.sales))}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {row.returns_qty > 0 ? (
                          <span
                            className={clsx(
                              "text-xs px-1.5 py-0.5 rounded",
                              row.returns_pct > 15
                                ? "bg-red-100 text-red-700"
                                : row.returns_pct > 7
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-gray-100 text-gray-500",
                            )}
                          >
                            {formatNumber(row.returns_qty)} ({row.returns_pct.toFixed(0)}%)
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {currentRows.length > 0 && (
              <tfoot className="bg-gray-50 border-t font-medium text-sm">
                <tr>
                  <td className="px-4 py-2 text-gray-700">סה״כ</td>
                  <td className="px-3 py-2 text-center text-gray-900">
                    {formatNumber(currentRows.reduce((s, r) => s + r.qty, 0))}
                  </td>
                  {showCompare && prevMonth && (
                    <td className="px-3 py-2 text-center text-gray-500">
                      {compareRows.length > 0
                        ? formatNumber(compareRows.reduce((s, r) => s + r.qty, 0))
                        : "—"}
                    </td>
                  )}
                  {showCompare && prevMonth && <td />}
                  <td className="px-3 py-2 text-center text-gray-700">
                    ₪{formatNumber(Math.round(currentRows.reduce((s, r) => s + r.sales, 0)))}
                  </td>
                  <td className="px-3 py-2 text-center text-red-600">
                    {formatNumber(currentRows.reduce((s, r) => s + r.returns_qty, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
