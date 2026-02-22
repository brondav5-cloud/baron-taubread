"use client";

import Link from "next/link";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { clsx } from "clsx";
import {
  formatNumber,
  formatPercent,
  getMetricColor,
} from "@/lib/calculations";
import {
  STATUS_DISPLAY_LONG,
  STATUS_COLORS_LONG,
  type StoreWithStatus,
} from "@/types/data";
import { calcMonthlyTotals, type MonthSelection } from "@/components/ui";
import type { ViewMode, SortDirection, SortKey, CityTotals } from "./types";

// Sort Icon Component
function SortIcon({ direction }: { direction: SortDirection }) {
  if (direction === "asc") return <ChevronUp className="w-3 h-3 inline ml-1" />;
  if (direction === "desc")
    return <ChevronDown className="w-3 h-3 inline ml-1" />;
  return <ChevronsUpDown className="w-3 h-3 inline ml-1 opacity-40" />;
}

interface CityComparisonTableProps {
  stores: StoreWithStatus[];
  currentStoreId: number;
  viewMode: ViewMode;
  monthSelection: MonthSelection;
  sortKey: SortKey | null;
  sortDirection: SortDirection;
  pageSize: number;
  currentPage: number;
  cityTotals: CityTotals | null;
  onSort: (key: SortKey) => void;
}

export function CityComparisonTable({
  stores,
  currentStoreId,
  viewMode,
  monthSelection,
  sortKey,
  sortDirection,
  pageSize,
  currentPage,
  cityTotals,
  onSort,
}: CityComparisonTableProps) {
  // Sortable header component
  const SortableHeader = ({
    sortKeyVal,
    children,
    className = "",
  }: {
    sortKeyVal: SortKey;
    children: React.ReactNode;
    className?: string;
  }) => (
    <th
      className={clsx(
        "px-3 py-3 text-center cursor-pointer hover:bg-white/10 transition-colors select-none",
        className,
      )}
      onClick={() => onSort(sortKeyVal)}
    >
      {children}
      <SortIcon direction={sortKey === sortKeyVal ? sortDirection : null} />
    </th>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-blue-500 text-white">
            <tr>
              <th className="px-3 py-3 text-center w-10">#</th>
              <SortableHeader sortKeyVal="name" className="text-right">
                חנות
              </SortableHeader>
              {viewMode === "metrics" ? (
                <>
                  <SortableHeader sortKeyVal="status_long">
                    סטטוס
                  </SortableHeader>
                  <SortableHeader sortKeyVal="metric_12v12">
                    שנתי
                  </SortableHeader>
                  <SortableHeader sortKeyVal="metric_6v6">
                    6 חודשים
                  </SortableHeader>
                  <SortableHeader sortKeyVal="metric_2v2">
                    2 חודשים
                  </SortableHeader>
                  <SortableHeader sortKeyVal="metric_peak_distance">
                    מרחק מהשיא
                  </SortableHeader>
                  <SortableHeader sortKeyVal="returns_pct_last6">
                    חזרות %
                  </SortableHeader>
                </>
              ) : (
                <>
                  <SortableHeader sortKeyVal="gross">ברוטו</SortableHeader>
                  <SortableHeader sortKeyVal="qty">נטו</SortableHeader>
                  <SortableHeader sortKeyVal="returns">חזרות</SortableHeader>
                  <SortableHeader sortKeyVal="returns_pct_last6">
                    חזרות %
                  </SortableHeader>
                  <SortableHeader sortKeyVal="sales">מחזור</SortableHeader>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {/* Summary Row */}
            {cityTotals && (
              <tr className="bg-blue-50 border-b-2 border-blue-200 font-bold">
                <td className="px-3 py-3 text-center">Σ</td>
                <td className="px-4 py-3 text-right text-blue-700">
                  סה״כ {cityTotals.count} חנויות
                </td>
                {viewMode === "metrics" ? (
                  <>
                    <td className="px-3 py-3 text-center">-</td>
                    <td className="px-3 py-3 text-center">
                      <span className={getMetricColor(cityTotals.metric_12v12)}>
                        {formatPercent(cityTotals.metric_12v12)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={getMetricColor(cityTotals.metric_6v6)}>
                        {formatPercent(cityTotals.metric_6v6)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={getMetricColor(cityTotals.metric_2v2)}>
                        {formatPercent(cityTotals.metric_2v2)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">-</td>
                    <td className="px-3 py-3 text-center">-</td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-3 text-center">
                      {formatNumber(cityTotals.gross)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {formatNumber(cityTotals.qty)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {formatNumber(cityTotals.returns)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {cityTotals.returnsPct.toFixed(1)}%
                    </td>
                    <td className="px-3 py-3 text-center">
                      ₪{formatNumber(Math.round(cityTotals.sales))}
                    </td>
                  </>
                )}
              </tr>
            )}

            {/* Store Rows */}
            {stores.map((store, index) => {
              const isCurrentStore = store.id === currentStoreId;
              const statusColors = STATUS_COLORS_LONG[store.status_long];
              const data = calcMonthlyTotals(store, monthSelection.months);
              const globalIndex = (currentPage - 1) * pageSize + index;

              return (
                <tr
                  key={store.id}
                  className={clsx(
                    "border-b border-gray-100 transition-colors",
                    isCurrentStore
                      ? "bg-yellow-50 border-yellow-200"
                      : "hover:bg-gray-50",
                  )}
                >
                  <td className="px-3 py-3 text-center">
                    <span
                      className={clsx(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                        globalIndex < 3
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600",
                      )}
                    >
                      {globalIndex + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/stores/${store.id}`}
                      className={clsx(
                        "block",
                        isCurrentStore
                          ? "cursor-default"
                          : "hover:text-blue-600",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-gray-900">
                          {store.name}
                        </div>
                        {isCurrentStore && (
                          <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded">
                            אתה כאן
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {store.network || "עצמאי"} | {store.agent}
                      </div>
                    </Link>
                  </td>
                  {viewMode === "metrics" ? (
                    <>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={clsx(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            statusColors.bg,
                            statusColors.text,
                          )}
                        >
                          {STATUS_DISPLAY_LONG[store.status_long]}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={clsx(
                            "font-bold",
                            getMetricColor(store.metric_12v12),
                          )}
                        >
                          {formatPercent(store.metric_12v12)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={clsx(
                            "font-bold",
                            getMetricColor(store.metric_6v6),
                          )}
                        >
                          {formatPercent(store.metric_6v6)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={clsx(
                            "font-bold",
                            getMetricColor(store.metric_2v2),
                          )}
                        >
                          {formatPercent(store.metric_2v2)}
                        </span>
                      </td>
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
                      <td className="px-3 py-3 text-center">
                        <span
                          className={
                            store.returns_pct_last6 > 15
                              ? "text-red-600 font-bold"
                              : ""
                          }
                        >
                          {store.returns_pct_last6.toFixed(1)}%
                        </span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-3 text-center font-medium">
                        {formatNumber(data.gross)}
                      </td>
                      <td className="px-3 py-3 text-center font-medium">
                        {formatNumber(data.qty)}
                      </td>
                      <td className="px-3 py-3 text-center text-red-600">
                        {formatNumber(data.returns)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={
                            data.returnsPct > 15 ? "text-red-600 font-bold" : ""
                          }
                        >
                          {data.returnsPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center font-medium">
                        ₪{formatNumber(Math.round(data.sales))}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
