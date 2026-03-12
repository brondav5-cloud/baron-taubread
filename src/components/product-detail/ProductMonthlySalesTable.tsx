"use client";

import { clsx } from "clsx";
import { formatNumber } from "@/lib/calculations";
import { Card, CardHeader, CardContent } from "@/components/ui";
import { MONTH_NAMES_SHORT as PRODUCT_MONTHS } from "@/lib/periodUtils";
import {
  type ProductMonthlyData,
  type ProductTotals,
} from "@/hooks/useProductDetail";

interface ProductMonthlySalesTableProps {
  productName: string;
  monthlyData: ProductMonthlyData[];
  totals: ProductTotals;
  selectedYear: number;
  onYearChange: (year: number) => void;
  availableYears?: number[];
  hideHolidays: boolean;
  onHideHolidaysChange: (hide: boolean) => void;
  // deliveryCountByPeriod: { "202601": 42, ... }
  deliveryCountByPeriod?: Record<string, number>;
}

export function ProductMonthlySalesTable({
  productName,
  monthlyData,
  totals,
  selectedYear,
  onYearChange,
  availableYears = [selectedYear],
  hideHolidays,
  onHideHolidaysChange,
  deliveryCountByPeriod = {},
}: ProductMonthlySalesTableProps) {
  // Build per-month delivery list for selected year
  const deliveriesRow = PRODUCT_MONTHS.map((_, i) => {
    const key = `${selectedYear}${String(i + 1).padStart(2, "0")}`;
    return deliveryCountByPeriod[key] ?? 0;
  });
  const totalDeliveries = deliveriesRow.reduce((s, v) => s + v, 0);
  const hasDeliveries = totalDeliveries > 0;
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-sm sm:text-base font-semibold">
            📊 מכירות חודשיות - {productName} - {selectedYear}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center bg-gray-100 rounded-xl p-1">
              {availableYears.map((year) => (
                <button
                  key={year}
                  onClick={() => onYearChange(year)}
                  className={clsx(
                    "px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all",
                    selectedYear === year
                      ? "bg-primary-500 text-white"
                      : "text-gray-600",
                  )}
                >
                  {year}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
              <input
                type="checkbox"
                checked={hideHolidays}
                onChange={(e) => onHideHolidaysChange(e.target.checked)}
                className="rounded"
              />
              הסתר חודשי חג
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-primary-500 text-white">
            <tr>
              <th className="px-2 py-2 text-right font-medium">
                מדד (לפי חודש)
              </th>
              {PRODUCT_MONTHS.map((m) => (
                <th key={m} className="px-2 py-2 text-center font-medium">
                  {m}
                </th>
              ))}
              <th className="px-3 py-2 text-center font-medium bg-primary-600">
                סה&quot;כ {selectedYear}
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Current year qty */}
            <tr className="border-b bg-green-50">
              <td className="px-2 py-2 font-medium text-green-700">
                כמות (נטו)
              </td>
              {monthlyData.map((m, i) => (
                <td key={i} className="px-2 py-2 text-center text-green-700">
                  {formatNumber(m.qtyCurrent)}
                </td>
              ))}
              <td className="px-3 py-2 text-center font-bold text-green-800 bg-green-100">
                {formatNumber(totals.qtyCurrent)}
              </td>
            </tr>

            {/* Previous year qty for comparison */}
            <tr className="border-b">
              <td className="px-2 py-2 font-medium text-gray-500">
                כמות {totals.previousYear}
              </td>
              {monthlyData.map((m, i) => (
                <td key={i} className="px-2 py-2 text-center text-gray-400">
                  {formatNumber(m.qtyPrevious)}
                </td>
              ))}
              <td className="px-3 py-2 text-center font-bold text-gray-500 bg-gray-50">
                {formatNumber(totals.qtyPrevious)}
              </td>
            </tr>

            {/* Sales */}
            <tr className="border-b bg-purple-50">
              <td className="px-2 py-2 font-medium text-purple-700">מחזור</td>
              {monthlyData.map((m, i) => (
                <td
                  key={i}
                  className="px-2 py-2 text-center text-purple-700 text-xs"
                >
                  {m.salesCurrent > 0
                    ? `${(m.salesCurrent / 1000).toFixed(0)}K`
                    : "0K"}
                </td>
              ))}
              <td className="px-3 py-2 text-center font-bold text-purple-800 bg-purple-100">
                ₪{(totals.salesCurrent / 1000).toFixed(0)}K
              </td>
            </tr>

            {/* Deliveries row */}
            {hasDeliveries && (
              <tr className="border-b bg-blue-50">
                <td className="px-2 py-2 font-medium text-blue-700">
                  🚚 מספר אספקות
                </td>
                {deliveriesRow.map((count, i) => (
                  <td key={i} className="px-2 py-2 text-center text-blue-700 text-xs font-medium">
                    {count > 0 ? count : "—"}
                  </td>
                ))}
                <td className="px-3 py-2 text-center font-bold text-blue-800 bg-blue-100">
                  {totalDeliveries}
                </td>
              </tr>
            )}

            {/* Holidays */}
            {!hideHolidays && (
              <tr className="bg-amber-50">
                <td className="px-2 py-2 font-medium text-amber-700">
                  🗓️ חגים
                </td>
                {monthlyData.map((m, i) => (
                  <td
                    key={i}
                    className="px-2 py-2 text-center text-amber-700 text-xs"
                  >
                    {m.holiday}
                  </td>
                ))}
                <td className="px-3 py-2 text-center bg-amber-100">-</td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
