"use client";

import { X, GitCompare } from "lucide-react";
import { clsx } from "clsx";
import { formatNumber, formatCurrency } from "@/lib/calculations";

interface Props {
  selectedCount: number;
  summary: {
    count: number;
    sales: number;
    qty: number;
    profit: number;
  };
  onClear: () => void;
  onCompare: () => void;
}

export function ProfitabilitySelectedBar({
  selectedCount,
  summary,
  onClear,
  onCompare,
}: Props) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[420px] bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50">
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-gray-900 text-lg">
          {summary.count} חנויות נבחרו
        </span>
        <button onClick={onClear} className="p-1 hover:bg-gray-100 rounded-lg">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-sm text-gray-500">מחזור</p>
          <p className="text-lg font-bold text-gray-900">
            {formatCurrency(summary.sales)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">כמות</p>
          <p className="text-lg font-bold text-gray-900">
            {formatNumber(summary.qty)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">רווח</p>
          <p
            className={clsx(
              "text-lg font-bold",
              summary.profit >= 0 ? "text-green-600" : "text-red-600",
            )}
          >
            {formatCurrency(summary.profit)}
          </p>
        </div>
      </div>

      {selectedCount >= 2 && (
        <button
          onClick={onCompare}
          className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          <GitCompare className="w-5 h-5" />
          השווה חנויות
        </button>
      )}
    </div>
  );
}
