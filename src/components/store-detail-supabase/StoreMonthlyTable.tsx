"use client";

import { clsx } from "clsx";
import type {
  StoreMonthlyRow,
  YearlyTotals,
} from "@/hooks/useStoreDetailSupabase";

// ============================================
// TYPES
// ============================================

interface StoreMonthlyTableProps {
  yearMonthlyData: StoreMonthlyRow[];
  currentYearTotals: YearlyTotals | null;
  selectedYear: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
  onMonthClick?: (period: string) => void;
}

// ============================================
// COMPONENT
// ============================================

export function StoreMonthlyTable({
  yearMonthlyData,
  currentYearTotals,
  selectedYear,
  availableYears,
  onYearChange,
  onMonthClick,
}: StoreMonthlyTableProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      {/* Header with year selector */}
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-bold text-gray-900">
          נתונים חודשיים - {selectedYear}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">שנה:</span>
          {availableYears.map((year) => (
            <button
              key={year}
              onClick={() => onYearChange(year)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                selectedYear === year
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200",
              )}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                חודש
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                כמות
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                מכירות
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                אספקות
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                החזרות
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                % החזרות
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {yearMonthlyData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  אין נתונים לשנה זו
                </td>
              </tr>
            ) : (
              yearMonthlyData.map((row) => (
                <tr
                  key={row.period}
                  className={clsx("hover:bg-gray-50", onMonthClick && "cursor-pointer")}
                  onClick={onMonthClick ? () => onMonthClick(row.period) : undefined}
                >
                  <td className="px-4 py-3 font-medium">
                    {onMonthClick ? (
                      <span className="text-blue-600 hover:underline">{row.periodLabel}</span>
                    ) : (
                      row.periodLabel
                    )}
                  </td>
                  <td className="px-4 py-3">{row.qty.toLocaleString()}</td>
                  <td className="px-4 py-3">₪{row.sales.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {(row.deliveries ?? 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{row.returns.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        row.returnsPct > 20
                          ? "text-red-600 font-medium"
                          : "text-gray-600",
                      )}
                    >
                      {row.returnsPct.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {currentYearTotals && yearMonthlyData.length > 0 && (
            <tfoot className="bg-blue-50 font-bold text-blue-900">
              <tr>
                <td className="px-4 py-3">סה&quot;כ</td>
                <td className="px-4 py-3">
                  {currentYearTotals.qty.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  ₪{currentYearTotals.sales.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  {(currentYearTotals.deliveries ?? 0).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  {currentYearTotals.returns.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  {currentYearTotals.returnsPct.toFixed(1)}%
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
