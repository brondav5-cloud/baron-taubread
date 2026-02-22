"use client";

import { memo } from "react";
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
  type StoreWithStatus,
} from "@/types/data";
import { calcMonthlyTotals, type MonthSelection } from "@/components/ui";

// ============================================
// TYPES
// ============================================

type ViewMode = "metrics" | "data";

interface StoreRowProps {
  store: StoreWithStatus;
  viewMode: ViewMode;
  monthSelection: MonthSelection;
  isCompare: boolean;
  isSelected?: boolean;
  onSelect?: (id: number, selected: boolean) => void;
}

// ============================================
// HELPERS
// ============================================

const calcChange = (a: number, b: number): number => {
  if (b === 0) return 0;
  return ((a - b) / b) * 100;
};

// ============================================
// COMPONENT
// ============================================

function StoreRowComponent({
  store,
  viewMode,
  monthSelection,
  isCompare,
  isSelected = false,
  onSelect,
}: StoreRowProps) {
  const longColors = STATUS_COLORS_LONG[store.status_long];
  const shortColors = STATUS_COLORS_SHORT[store.status_short];

  const main = calcMonthlyTotals(store, monthSelection.months);
  const comp = isCompare
    ? calcMonthlyTotals(store, monthSelection.compareMonths)
    : null;

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      {/* Checkbox */}
      <td className="px-2 py-3 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect?.(store.id, e.target.checked)}
          className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
        />
      </td>

      {/* Store Name & City */}
      <td className="px-4 py-3">
        <Link
          href={`/dashboard/stores/${store.id}`}
          className="block hover:text-primary-600 transition-colors"
        >
          <div className="font-medium text-gray-900">{store.name}</div>
          <div className="text-xs text-gray-500">{store.city}</div>
        </Link>
      </td>

      {viewMode === "metrics" ? (
        // Metrics Mode
        <>
          {/* Status Long */}
          <td className="px-3 py-3 text-center">
            <span
              className={clsx(
                "px-2 py-1 rounded-full text-xs font-medium",
                longColors.bg,
                longColors.text,
              )}
            >
              {STATUS_DISPLAY_LONG[store.status_long]}
            </span>
          </td>

          {/* 12v12 */}
          <td className="px-3 py-3 text-center">
            <span
              className={clsx("font-bold", getMetricColor(store.metric_12v12))}
            >
              {formatPercent(store.metric_12v12)}
            </span>
            <div className="text-xs text-gray-400">
              {formatNumber(store.qty_2024)}←{formatNumber(store.qty_2025)}
            </div>
          </td>

          {/* 3v3 */}
          <td className="px-3 py-3 text-center">
            <span
              className={clsx("font-bold", getMetricColor(store.metric_3v3))}
            >
              {formatPercent(store.metric_3v3)}
            </span>
          </td>

          {/* 6v6 */}
          <td className="px-3 py-3 text-center">
            <span
              className={clsx("font-bold", getMetricColor(store.metric_6v6))}
            >
              {formatPercent(store.metric_6v6)}
            </span>
          </td>

          {/* 2v2 */}
          <td className="px-3 py-3 text-center">
            <span
              className={clsx("font-bold", getMetricColor(store.metric_2v2))}
            >
              {formatPercent(store.metric_2v2)}
            </span>
          </td>

          {/* Status Short */}
          <td className="px-3 py-3 text-center">
            <span
              className={clsx(
                "px-2 py-1 rounded-full text-xs font-medium",
                shortColors.bg,
                shortColors.text,
              )}
            >
              {STATUS_DISPLAY_SHORT[store.status_short]}
            </span>
          </td>

          {/* Peak Distance */}
          <td className="px-3 py-3 text-center">
            <span
              className={clsx(
                "font-bold",
                getMetricColor(store.metric_peak_distance),
              )}
            >
              {formatPercent(store.metric_peak_distance)}
            </span>
          </td>

          {/* Returns */}
          <td className="px-3 py-3 text-center">
            <span
              className={
                store.returns_pct_last6 > 15 ? "text-red-600 font-bold" : ""
              }
            >
              {store.returns_pct_last6.toFixed(1)}%
            </span>
          </td>
        </>
      ) : isCompare && comp ? (
        // Data Mode - Compare
        <>
          {/* Gross Main */}
          <td className="px-3 py-3 text-center text-primary-700 font-medium">
            {formatNumber(main.gross)}
          </td>
          {/* Gross Compare */}
          <td className="px-3 py-3 text-center text-orange-600">
            {formatNumber(comp.gross)}
          </td>
          {/* Gross Change */}
          <td className="px-3 py-3 text-center">
            <span
              className={clsx(
                "font-bold",
                calcChange(main.gross, comp.gross) >= 0
                  ? "text-green-600"
                  : "text-red-600",
              )}
            >
              {calcChange(main.gross, comp.gross).toFixed(1)}%
            </span>
          </td>

          {/* Qty Main */}
          <td className="px-3 py-3 text-center text-primary-700 font-medium">
            {formatNumber(main.qty)}
          </td>
          {/* Qty Compare */}
          <td className="px-3 py-3 text-center text-orange-600">
            {formatNumber(comp.qty)}
          </td>
          {/* Qty Change */}
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

          {/* Sales Main */}
          <td className="px-3 py-3 text-center text-primary-700 font-medium">
            ₪{formatNumber(Math.round(main.sales))}
          </td>
          {/* Sales Compare */}
          <td className="px-3 py-3 text-center text-orange-600">
            ₪{formatNumber(Math.round(comp.sales))}
          </td>
          {/* Sales Change */}
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
        // Data Mode - No Compare
        <>
          {/* Gross */}
          <td className="px-3 py-3 text-center text-blue-700 font-medium">
            {formatNumber(main.gross)}
          </td>
          {/* Qty */}
          <td className="px-3 py-3 text-center text-green-700 font-medium">
            {formatNumber(main.qty)}
          </td>
          {/* Returns */}
          <td className="px-3 py-3 text-center text-red-600">
            {formatNumber(main.returns)}
          </td>
          {/* Returns % */}
          <td className="px-3 py-3 text-center">
            <span
              className={main.returnsPct > 15 ? "text-red-600 font-bold" : ""}
            >
              {main.returnsPct.toFixed(1)}%
            </span>
          </td>
          {/* Sales */}
          <td className="px-3 py-3 text-center text-purple-700 font-medium">
            ₪{formatNumber(Math.round(main.sales))}
          </td>
          {/* 2024 Qty */}
          <td className="px-3 py-3 text-center">
            {formatNumber(store.qty_2024)}
          </td>
          {/* 2025 Qty */}
          <td className="px-3 py-3 text-center font-bold">
            {formatNumber(store.qty_2025)}
          </td>
          {/* 2025 Sales */}
          <td className="px-3 py-3 text-center font-bold">
            ₪{formatNumber(Math.round(store.sales_2025))}
          </td>
        </>
      )}

      {/* Link Arrow */}
      <td className="px-2 py-3">
        <Link href={`/dashboard/stores/${store.id}`}>
          <ChevronLeft className="w-4 h-4 text-gray-400 hover:text-primary-500 transition-colors" />
        </Link>
      </td>
    </tr>
  );
}

export const StoreRow = memo(StoreRowComponent);
export default StoreRow;
