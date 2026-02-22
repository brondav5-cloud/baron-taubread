"use client";

import { clsx } from "clsx";
import { formatNumber } from "@/lib/calculations";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import {
  MONTHS,
  type StoreMonthlyData,
  type StoreTotals,
} from "@/hooks/useStoreDetail";

interface StoreMonthlySalesTableProps {
  storeName: string;
  monthlyData: StoreMonthlyData[];
  totals: StoreTotals;
  selectedYear: 2024 | 2025;
  onYearChange: (year: 2024 | 2025) => void;
  hideHolidays: boolean;
  onHideHolidaysChange: (hide: boolean) => void;
}

export function StoreMonthlySalesTable({
  storeName,
  monthlyData,
  totals,
  selectedYear,
  onYearChange,
  hideHolidays,
  onHideHolidaysChange,
}: StoreMonthlySalesTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            📊 מכירות חודשיות - {storeName} - {selectedYear}
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
              {MONTHS.map((m) => (
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
            {/* Gross */}
            <tr className="border-b bg-blue-50">
              <td className="px-2 py-2 font-medium text-blue-700">ברוטו</td>
              {monthlyData.map((m, i) => (
                <td key={i} className="px-2 py-2 text-center text-blue-700">
                  {formatNumber(
                    selectedYear === 2025 ? m.gross2025 : m.gross2024,
                  )}
                </td>
              ))}
              <td className="px-3 py-2 text-center font-bold text-blue-800 bg-blue-100">
                {formatNumber(
                  selectedYear === 2025 ? totals.gross2025 : totals.gross2024,
                )}
              </td>
            </tr>

            {/* Net Quantity */}
            <tr className="border-b bg-green-50">
              <td className="px-2 py-2 font-medium text-green-700">
                נטו (פריטים)
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

            {/* Returns */}
            <tr className="border-b bg-red-50">
              <td className="px-2 py-2 font-medium text-red-700">חזרות</td>
              {monthlyData.map((m, i) => (
                <td key={i} className="px-2 py-2 text-center text-red-700">
                  {formatNumber(
                    selectedYear === 2025 ? m.returns2025 : m.returns2024,
                  )}
                </td>
              ))}
              <td className="px-3 py-2 text-center font-bold text-red-800 bg-red-100">
                {formatNumber(
                  selectedYear === 2025
                    ? totals.returns2025
                    : totals.returns2024,
                )}
              </td>
            </tr>

            {/* Returns % */}
            <tr className="border-b">
              <td className="px-2 py-2 font-medium">חזרות %</td>
              {monthlyData.map((m, i) => {
                const gross = selectedYear === 2025 ? m.gross2025 : m.gross2024;
                const returns =
                  selectedYear === 2025 ? m.returns2025 : m.returns2024;
                const pct = gross > 0 ? (returns / gross) * 100 : 0;
                return (
                  <td
                    key={i}
                    className={clsx(
                      "px-2 py-2 text-center font-medium",
                      pct > 15 ? "text-red-600" : "text-gray-600",
                    )}
                  >
                    {pct.toFixed(0)}%
                  </td>
                );
              })}
              <td className="px-3 py-2 text-center font-bold bg-gray-100">
                {(selectedYear === 2025
                  ? totals.returnsPct2025
                  : totals.returnsPct2024
                ).toFixed(0)}
                %
              </td>
            </tr>

            {/* Sales */}
            <tr className="border-b bg-purple-50">
              <td className="px-2 py-2 font-medium text-purple-700">
                📊 מחזור
              </td>
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

            {/* Holidays */}
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
