"use client";

import { clsx } from "clsx";
import { formatNumber } from "@/lib/calculations";

interface HalfYearData {
  h1Qty: number;
  h2Qty: number;
  h1Sales: number;
  h2Sales: number;
  qtyChange: number;
  salesChange: number;
  currentYear: number;
  h1PeriodLabel?: string;
  h2PeriodLabel?: string;
}

interface HalfYearComparisonProps {
  data: HalfYearData;
}

export function HalfYearComparison({ data }: HalfYearComparisonProps) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 text-left">
        השוואה חצי שנתית:{" "}
        {data.h1PeriodLabel && data.h2PeriodLabel
          ? `${data.h1PeriodLabel} ↔ ${data.h2PeriodLabel}`
          : `H1 ↔ H2 ${data.currentYear}`}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
        <div className="bg-white rounded-xl p-3 sm:p-4 text-center">
          <p className="text-[10px] sm:text-sm text-gray-500 truncate">
            {data.h1PeriodLabel || `H1 ${data.currentYear}`} כמות
          </p>
          <p className="text-lg sm:text-xl font-bold text-blue-600">
            {formatNumber(data.h1Qty)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 text-center">
          <p className="text-[10px] sm:text-sm text-gray-500 truncate">
            {data.h2PeriodLabel || `H2 ${data.currentYear}`} כמות
          </p>
          <p className="text-lg sm:text-xl font-bold text-green-600">
            {formatNumber(data.h2Qty)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 text-center">
          <p className="text-[10px] sm:text-sm text-gray-500">שינוי</p>
          <p
            className={clsx(
              "text-lg sm:text-xl font-bold",
              data.qtyChange >= 0 ? "text-green-600" : "text-red-600",
            )}
          >
            {data.qtyChange >= 0 ? "+" : ""}
            {data.qtyChange.toFixed(1)}%
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 text-center">
          <p className="text-[10px] sm:text-sm text-gray-500 truncate">
            {data.h1PeriodLabel || `H1 ${data.currentYear}`} מחזור
          </p>
          <p className="text-lg sm:text-xl font-bold text-blue-600">
            ₪{formatNumber(Math.round(data.h1Sales))}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 text-center">
          <p className="text-[10px] sm:text-sm text-gray-500 truncate">
            {data.h2PeriodLabel || `H2 ${data.currentYear}`} מחזור
          </p>
          <p className="text-lg sm:text-xl font-bold text-green-600">
            ₪{formatNumber(Math.round(data.h2Sales))}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 text-center">
          <p className="text-[10px] sm:text-sm text-gray-500">שינוי</p>
          <p
            className={clsx(
              "text-lg sm:text-xl font-bold",
              data.salesChange >= 0 ? "text-green-600" : "text-red-600",
            )}
          >
            {data.salesChange >= 0 ? "+" : ""}
            {data.salesChange.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}
