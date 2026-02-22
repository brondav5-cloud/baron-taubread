"use client";

import { clsx } from "clsx";
import { formatNumber } from "@/lib/calculations";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import {
  PRODUCT_MONTHS,
  type ProductMonthlyData,
  type ProductTotals,
} from "@/hooks/useProductDetail";

interface ProductMonthlySalesTableProps {
  productName: string;
  monthlyData: ProductMonthlyData[];
  totals: ProductTotals;
  selectedYear: 2024 | 2025;
  onYearChange: (year: 2024 | 2025) => void;
  hideHolidays: boolean;
  onHideHolidaysChange: (hide: boolean) => void;
}

export function ProductMonthlySalesTable({
  productName,
  monthlyData,
  totals,
  selectedYear,
  onYearChange,
  hideHolidays,
  onHideHolidaysChange,
}: ProductMonthlySalesTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            📊 מכירות חודשיות - {productName} - {selectedYear}
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => onYearChange(2025)}
                className={clsx(
                  "px-4 py-1.5 rounded-lg text-sm font-medium",
                  selectedYear === 2025
                    ? "bg-primary-500 text-white"
                    : "text-gray-600",
                )}
              >
                2025
              </button>
              <button
                onClick={() => onYearChange(2024)}
                className={clsx(
                  "px-4 py-1.5 rounded-lg text-sm font-medium",
                  selectedYear === 2024
                    ? "bg-primary-500 text-white"
                    : "text-gray-600",
                )}
              >
                2024
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
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
            <tr className="border-b bg-green-50">
              <td className="px-2 py-2 font-medium text-green-700">
                כמות (נטו)
              </td>
              {monthlyData.map((m, i) => (
                <td key={i} className="px-2 py-2 text-center text-green-700">
                  {formatNumber(selectedYear === 2025 ? m.qty2025 : m.qty2024)}
                </td>
              ))}
              <td className="px-3 py-2 text-center font-bold text-green-800 bg-green-100">
                {formatNumber(
                  selectedYear === 2025 ? totals.qty2025 : totals.qty2024,
                )}
              </td>
            </tr>
            <tr className="border-b bg-purple-50">
              <td className="px-2 py-2 font-medium text-purple-700">מחזור</td>
              {monthlyData.map((m, i) => (
                <td
                  key={i}
                  className="px-2 py-2 text-center text-purple-700 text-xs"
                >
                  {(
                    (selectedYear === 2025 ? m.sales2025 : m.sales2024) / 1000
                  ).toFixed(0)}
                  K
                </td>
              ))}
              <td className="px-3 py-2 text-center font-bold text-purple-800 bg-purple-100">
                ₪
                {(
                  (selectedYear === 2025
                    ? totals.sales2025
                    : totals.sales2024) / 1000
                ).toFixed(0)}
                K
              </td>
            </tr>
            <tr className="bg-amber-50">
              <td className="px-2 py-2 font-medium text-amber-700">🗓️ חגים</td>
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
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
