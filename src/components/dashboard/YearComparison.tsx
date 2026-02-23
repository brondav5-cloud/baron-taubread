"use client";

import { clsx } from "clsx";
import { formatNumber } from "@/lib/calculations";

interface TotalsData {
  qtyCurrent: number;
  qtyPrevious: number;
  salesCurrent: number;
  salesPrevious: number;
  qtyChange: number;
  salesChange: number;
  currentYear: number;
  previousYear: number;
  previousYearPeriodLabel?: string;
  currentYearPeriodLabel?: string;
}

interface YearComparisonProps {
  totals: TotalsData;
}

export function YearComparison({ totals }: YearComparisonProps) {
  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 text-left">
        השוואה שנתית: {totals.previousYearPeriodLabel ?? totals.previousYear} ↔{" "}
        {totals.currentYearPeriodLabel ?? totals.currentYear}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
        <div className="bg-white rounded-xl p-3 sm:p-4 text-center">
          <p className="text-[10px] sm:text-sm text-gray-500 truncate">
            כמות {totals.previousYearPeriodLabel ?? totals.previousYear}
          </p>
          <p className="text-lg sm:text-xl font-bold text-blue-600">
            {formatNumber(totals.qtyPrevious)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 text-center">
          <p className="text-[10px] sm:text-sm text-gray-500 truncate">
            כמות {totals.currentYearPeriodLabel ?? totals.currentYear}
          </p>
          <p className="text-lg sm:text-xl font-bold text-green-600">
            {formatNumber(totals.qtyCurrent)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 text-center">
          <p className="text-[10px] sm:text-sm text-gray-500">שינוי</p>
          <p
            className={clsx(
              "text-lg sm:text-xl font-bold",
              totals.qtyChange >= 0 ? "text-green-600" : "text-red-600",
            )}
          >
            {totals.qtyChange >= 0 ? "+" : ""}
            {totals.qtyChange.toFixed(1)}%
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 text-center">
          <p className="text-[10px] sm:text-sm text-gray-500 truncate">
            מחזור {totals.previousYearPeriodLabel ?? totals.previousYear}
          </p>
          <p className="text-lg sm:text-xl font-bold text-blue-600">
            ₪{formatNumber(Math.round(totals.salesPrevious))}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 text-center">
          <p className="text-[10px] sm:text-sm text-gray-500 truncate">
            מחזור {totals.currentYearPeriodLabel ?? totals.currentYear}
          </p>
          <p className="text-lg sm:text-xl font-bold text-green-600">
            ₪{formatNumber(Math.round(totals.salesCurrent))}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 text-center">
          <p className="text-[10px] sm:text-sm text-gray-500">שינוי</p>
          <p
            className={clsx(
              "text-lg sm:text-xl font-bold",
              totals.salesChange >= 0 ? "text-green-600" : "text-red-600",
            )}
          >
            {totals.salesChange >= 0 ? "+" : ""}
            {totals.salesChange.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}
