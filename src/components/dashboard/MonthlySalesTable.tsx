"use client";

import { BarChart3 } from "lucide-react";
import { clsx } from "clsx";
import { formatNumber } from "@/lib/calculations";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";

interface MonthlyDataPoint {
  month: string;
  periodKey?: string;
  grossCurrent: number;
  grossPrevious: number;
  qtyCurrent: number;
  qtyPrevious: number;
  returnsCurrent: number;
  returnsPrevious: number;
  salesCurrent: number;
  salesPrevious: number;
  returnsPctCurrent: number;
  returnsPctPrevious: number;
  holiday: string;
}

interface TotalsData {
  grossCurrent: number;
  grossPrevious: number;
  qtyCurrent: number;
  qtyPrevious: number;
  returnsCurrent: number;
  returnsPrevious: number;
  salesCurrent: number;
  salesPrevious: number;
  returnsPctCurrent: number;
  returnsPctPrevious: number;
  currentYear: number;
  previousYear: number;
}

interface MonthlySalesTableProps {
  monthlyData: MonthlyDataPoint[];
  totals: TotalsData;
  selectedYear: number;
  onYearChange: (year: number) => void;
  hideHolidays: boolean;
  onHideHolidaysChange: (hide: boolean) => void;
  availableYears?: number[];
}

export function MonthlySalesTable({
  monthlyData,
  totals,
  selectedYear,
  onYearChange,
  hideHolidays,
  onHideHolidaysChange,
  availableYears = [totals.currentYear, totals.previousYear],
}: MonthlySalesTableProps) {
  const isCurrent = selectedYear === totals.currentYear;
  const getValue = (
    m: MonthlyDataPoint,
    type: "gross" | "qty" | "returns" | "returnsPct" | "sales",
  ) => {
    const periodYear = m.periodKey
      ? parseInt(m.periodKey.slice(0, 4), 10)
      : null;
    const useCurrent =
      periodYear !== null ? selectedYear === periodYear : isCurrent;
    switch (type) {
      case "gross":
        return useCurrent ? m.grossCurrent : m.grossPrevious;
      case "qty":
        return useCurrent ? m.qtyCurrent : m.qtyPrevious;
      case "returns":
        return useCurrent ? m.returnsCurrent : m.returnsPrevious;
      case "returnsPct":
        return useCurrent ? m.returnsPctCurrent : m.returnsPctPrevious;
      case "sales":
        return useCurrent ? m.salesCurrent : m.salesPrevious;
      default:
        return 0;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle icon={<BarChart3 className="w-5 h-5 text-green-500" />}>
            מכירות חודשיות - כל החנויות - {selectedYear}
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-100 rounded-xl p-1">
              {availableYears.map((year) => (
                <button
                  key={year}
                  onClick={() => onYearChange(year)}
                  className={clsx(
                    "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                    selectedYear === year
                      ? "bg-primary-500 text-white"
                      : "text-gray-600",
                  )}
                >
                  {year}
                </button>
              ))}
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
              {monthlyData.map((m, i) => (
                <th
                  key={m.periodKey || i}
                  className="px-2 py-2 text-center font-medium"
                >
                  {m.month}
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
                <td
                  key={m.periodKey || i}
                  className="px-2 py-2 text-center text-blue-700"
                >
                  {formatNumber(getValue(m, "gross"))}
                </td>
              ))}
              <td className="px-3 py-2 text-center font-bold text-blue-800 bg-blue-100">
                {formatNumber(
                  monthlyData.reduce((s, m) => s + getValue(m, "gross"), 0),
                )}
              </td>
            </tr>

            {/* Net Quantity */}
            <tr className="border-b bg-green-50">
              <td className="px-2 py-2 font-medium text-green-700">
                נטו (פריטים)
              </td>
              {monthlyData.map((m, i) => (
                <td
                  key={m.periodKey || i}
                  className="px-2 py-2 text-center text-green-700"
                >
                  {formatNumber(getValue(m, "qty"))}
                </td>
              ))}
              <td className="px-3 py-2 text-center font-bold text-green-800 bg-green-100">
                {formatNumber(
                  monthlyData.reduce((s, m) => s + getValue(m, "qty"), 0),
                )}
              </td>
            </tr>

            {/* Returns */}
            <tr className="border-b bg-red-50">
              <td className="px-2 py-2 font-medium text-red-700">חזרות</td>
              {monthlyData.map((m, i) => (
                <td
                  key={m.periodKey || i}
                  className="px-2 py-2 text-center text-red-700"
                >
                  {formatNumber(getValue(m, "returns"))}
                </td>
              ))}
              <td className="px-3 py-2 text-center font-bold text-red-800 bg-red-100">
                {formatNumber(
                  monthlyData.reduce((s, m) => s + getValue(m, "returns"), 0),
                )}
              </td>
            </tr>

            {/* Returns % */}
            <tr className="border-b">
              <td className="px-2 py-2 font-medium">חזרות %</td>
              {monthlyData.map((m, i) => (
                <td
                  key={m.periodKey || i}
                  className={clsx(
                    "px-2 py-2 text-center font-medium",
                    getValue(m, "returnsPct") > 15
                      ? "text-red-600"
                      : "text-gray-600",
                  )}
                >
                  {(getValue(m, "returnsPct") as number).toFixed(0)}%
                </td>
              ))}
              <td className="px-3 py-2 text-center font-bold bg-gray-100">
                {monthlyData.length > 0
                  ? (monthlyData.reduce((s, m) => s + getValue(m, "gross"), 0) >
                    0
                      ? (
                          (monthlyData.reduce(
                            (s, m) => s + getValue(m, "returns"),
                            0,
                          ) /
                            monthlyData.reduce(
                              (s, m) => s + getValue(m, "gross"),
                              0,
                            )) *
                          100
                        ).toFixed(0)
                      : "0") + "%"
                  : "-"}
              </td>
            </tr>

            {/* Sales */}
            <tr className="border-b bg-purple-50">
              <td className="px-2 py-2 font-medium text-purple-700">מחזור</td>
              {monthlyData.map((m, i) => (
                <td
                  key={m.periodKey || i}
                  className="px-2 py-2 text-center text-purple-700 text-xs"
                >
                  {((getValue(m, "sales") as number) / 1000).toFixed(0)}K
                </td>
              ))}
              <td className="px-3 py-2 text-center font-bold text-purple-800 bg-purple-100">
                ₪
                {(
                  monthlyData.reduce(
                    (s, m) => s + (getValue(m, "sales") as number),
                    0,
                  ) / 1000000
                ).toFixed(1)}
                M
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
