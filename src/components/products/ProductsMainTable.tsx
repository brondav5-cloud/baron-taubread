"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { clsx } from "clsx";
import {
  formatNumber,
  formatPercent,
  getMetricColor,
} from "@/lib/calculations";
import {
  STATUS_DISPLAY_LONG,
  STATUS_DISPLAY_SHORT,
  STATUS_COLORS_LONG,
  STATUS_COLORS_SHORT,
  type ProductWithStatus,
} from "@/types/data";
import { calcMonthlyTotals, type MonthSelection } from "@/components/ui";

interface TotalsData {
  count: number;
  metric_12v12: number;
  metric_6v6: number;
  metric_3v3: number;
  metric_2v2: number;
  metric_peak_distance: number;
  returns_pct_last6: number;
  main: { qty: number; sales: number };
  comp: { qty: number; sales: number } | null;
}

interface ProductsMainTableProps {
  products: ProductWithStatus[];
  viewMode: "metrics" | "data";
  isCompare: boolean;
  monthSelection: MonthSelection;
  totals: TotalsData | null;
  calcChange: (a: number, b: number) => number;
}

export function ProductsMainTable({
  products,
  viewMode,
  isCompare,
  monthSelection,
  totals,
  calcChange,
}: ProductsMainTableProps) {
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* Header */}
          <thead className="bg-primary-500 text-white">
            <tr>
              <th className="px-2 py-3 w-10">
                <input type="checkbox" className="rounded" />
              </th>
              <th className="px-4 py-3 text-right">מוצר</th>

              {viewMode === "metrics" ? (
                <>
                  <th className="px-3 py-3 text-center">
                    <div>סטטוס</div>
                    <div className="text-xs opacity-75">ארוך</div>
                  </th>
                  <th className="px-3 py-3 text-center">
                    <div>שנתי</div>
                    <div className="text-xs opacity-75">25←24</div>
                  </th>
                  <th className="px-3 py-3 text-center">3 חודשים</th>
                  <th className="px-3 py-3 text-center">6 חודשים</th>
                  <th className="px-3 py-3 text-center">2 חודשים</th>
                  <th className="px-3 py-3 text-center">
                    <div>סטטוס</div>
                    <div className="text-xs opacity-75">קצר</div>
                  </th>
                  <th className="px-3 py-3 text-center">מרחק מהשיא</th>
                  <th className="px-3 py-3 text-center">חזרות %</th>
                </>
              ) : isCompare ? (
                <>
                  <th className="px-3 py-3 text-center bg-primary-600">כמות</th>
                  <th className="px-3 py-3 text-center bg-orange-500">
                    כמות הש׳
                  </th>
                  <th className="px-3 py-3 text-center">%</th>
                  <th className="px-3 py-3 text-center bg-primary-600">
                    מחזור
                  </th>
                  <th className="px-3 py-3 text-center bg-orange-500">
                    מחזור הש׳
                  </th>
                  <th className="px-3 py-3 text-center">%</th>
                </>
              ) : (
                <>
                  <th className="px-3 py-3 text-center">כמות</th>
                  <th className="px-3 py-3 text-center">מחזור</th>
                  <th className="px-3 py-3 text-center">כמות {previousYear}</th>
                  <th className="px-3 py-3 text-center">כמות {currentYear}</th>
                  <th className="px-3 py-3 text-center">מחזור {previousYear}</th>
                  <th className="px-3 py-3 text-center">מחזור {currentYear}</th>
                </>
              )}
              <th className="px-2 py-3"></th>
            </tr>
          </thead>

          <tbody>
            {/* Totals Row */}
            {totals && (
              <tr className="bg-blue-50 border-b-2 border-blue-200 font-bold">
                <td className="px-2 py-3"></td>
                <td className="px-4 py-3 text-right text-blue-700">
                  Σ סה״כ {totals.count}
                </td>

                {viewMode === "metrics" ? (
                  <>
                    <td className="px-3 py-3 text-center">-</td>
                    <td className="px-3 py-3 text-center">
                      <span className={getMetricColor(totals.metric_12v12)}>
                        {formatPercent(totals.metric_12v12)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={getMetricColor(totals.metric_3v3)}>
                        {formatPercent(totals.metric_3v3)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={getMetricColor(totals.metric_6v6)}>
                        {formatPercent(totals.metric_6v6)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={getMetricColor(totals.metric_2v2)}>
                        {formatPercent(totals.metric_2v2)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">-</td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={getMetricColor(totals.metric_peak_distance)}
                      >
                        {formatPercent(totals.metric_peak_distance)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center text-red-600">
                      {totals.returns_pct_last6.toFixed(1)}%
                    </td>
                  </>
                ) : isCompare && totals.comp ? (
                  <>
                    <td className="px-3 py-3 text-center text-primary-700">
                      {formatNumber(totals.main.qty)}
                    </td>
                    <td className="px-3 py-3 text-center text-orange-600">
                      {formatNumber(totals.comp.qty)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={
                          calcChange(totals.main.qty, totals.comp.qty) >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {calcChange(totals.main.qty, totals.comp.qty).toFixed(
                          1,
                        )}
                        %
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center text-primary-700">
                      ₪{formatNumber(Math.round(totals.main.sales))}
                    </td>
                    <td className="px-3 py-3 text-center text-orange-600">
                      ₪{formatNumber(Math.round(totals.comp.sales))}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={
                          calcChange(totals.main.sales, totals.comp.sales) >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {calcChange(
                          totals.main.sales,
                          totals.comp.sales,
                        ).toFixed(1)}
                        %
                      </span>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-3 text-center text-green-700">
                      {formatNumber(totals.main.qty)}
                    </td>
                    <td className="px-3 py-3 text-center text-purple-700">
                      ₪{formatNumber(Math.round(totals.main.sales))}
                    </td>
                    <td className="px-3 py-3 text-center">-</td>
                    <td className="px-3 py-3 text-center">-</td>
                    <td className="px-3 py-3 text-center">-</td>
                    <td className="px-3 py-3 text-center">-</td>
                  </>
                )}
                <td className="px-2 py-3"></td>
              </tr>
            )}

            {/* Product Rows */}
            {products.map((product) => {
              const longColors = STATUS_COLORS_LONG[product.status_long];
              const shortColors = STATUS_COLORS_SHORT[product.status_short];
              const main = calcMonthlyTotals(product, monthSelection.months);
              const comp = isCompare
                ? calcMonthlyTotals(product, monthSelection.compareMonths)
                : null;

              return (
                <tr
                  key={product.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-2 py-3 text-center">
                    <input type="checkbox" className="rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/products/${product.id}`}
                      className="hover:text-primary-600"
                    >
                      <div className="font-medium text-gray-900">
                        {product.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {product.category}
                      </div>
                    </Link>
                  </td>

                  {viewMode === "metrics" ? (
                    <>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={clsx(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            longColors.bg,
                            longColors.text,
                          )}
                        >
                          {STATUS_DISPLAY_LONG[product.status_long]}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={clsx(
                            "font-bold",
                            getMetricColor(product.metric_12v12),
                          )}
                        >
                          {formatPercent(product.metric_12v12)}
                        </span>
                        <div className="text-xs text-gray-400">
                          {formatNumber(product.qty_previous_year)}←
                          {formatNumber(product.qty_current_year)}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={clsx(
                            "font-bold",
                            getMetricColor(product.metric_3v3),
                          )}
                        >
                          {formatPercent(product.metric_3v3)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={clsx(
                            "font-bold",
                            getMetricColor(product.metric_6v6),
                          )}
                        >
                          {formatPercent(product.metric_6v6)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={clsx(
                            "font-bold",
                            getMetricColor(product.metric_2v2),
                          )}
                        >
                          {formatPercent(product.metric_2v2)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={clsx(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            shortColors.bg,
                            shortColors.text,
                          )}
                        >
                          {STATUS_DISPLAY_SHORT[product.status_short]}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={clsx(
                            "font-bold",
                            getMetricColor(product.metric_peak_distance),
                          )}
                        >
                          {formatPercent(product.metric_peak_distance)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={
                            product.returns_pct_last6 > 15
                              ? "text-red-600 font-bold"
                              : ""
                          }
                        >
                          {product.returns_pct_last6.toFixed(1)}%
                        </span>
                      </td>
                    </>
                  ) : isCompare && comp ? (
                    <>
                      <td className="px-3 py-3 text-center text-primary-700 font-medium">
                        {formatNumber(main.qty)}
                      </td>
                      <td className="px-3 py-3 text-center text-orange-600">
                        {formatNumber(comp.qty)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={clsx(
                            "font-bold",
                            calcChange(main.qty, comp.qty) >= 0
                              ? "text-green-600"
                              : "text-red-600",
                          )}
                        >
                          {calcChange(main.qty, comp.qty).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-primary-700 font-medium">
                        ₪{formatNumber(Math.round(main.sales))}
                      </td>
                      <td className="px-3 py-3 text-center text-orange-600">
                        ₪{formatNumber(Math.round(comp.sales))}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={clsx(
                            "font-bold",
                            calcChange(main.sales, comp.sales) >= 0
                              ? "text-green-600"
                              : "text-red-600",
                          )}
                        >
                          {calcChange(main.sales, comp.sales).toFixed(1)}%
                        </span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-3 text-center text-green-700 font-medium">
                        {formatNumber(main.qty)}
                      </td>
                      <td className="px-3 py-3 text-center text-purple-700 font-medium">
                        ₪{formatNumber(Math.round(main.sales))}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {formatNumber(product.qty_previous_year)}
                      </td>
                      <td className="px-3 py-3 text-center font-bold">
                        {formatNumber(product.qty_current_year)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        ₪{formatNumber(Math.round(product.sales_previous_year))}
                      </td>
                      <td className="px-3 py-3 text-center font-bold">
                        ₪{formatNumber(Math.round(product.sales_current_year))}
                      </td>
                    </>
                  )}

                  <td className="px-2 py-3">
                    <Link href={`/dashboard/products/${product.id}`}>
                      <ChevronLeft className="w-4 h-4 text-gray-400" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {products.length === 0 && (
        <div className="p-12 text-center text-gray-500">לא נמצאו מוצרים</div>
      )}
    </div>
  );
}
