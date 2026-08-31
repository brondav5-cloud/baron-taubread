"use client";

import Link from "next/link";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Store,
  MapPin,
} from "lucide-react";
import { clsx } from "clsx";
import {
  useMetricsHeaders,
  useMetricsPeriodDetails,
} from "@/components/common";
import type {
  UseStoresPageSupabaseReturn,
  SortKey,
} from "@/hooks/useStoresPageSupabase";

// ============================================
// TYPES
// ============================================

interface StoresTableSupabaseProps {
  hook: UseStoresPageSupabaseReturn;
}

// ============================================
// STATUS DISPLAY CONFIG
// ============================================

const STATUS_COLORS: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  עליה_חדה: {
    bg: "bg-green-100",
    text: "text-green-700",
    label: "🚀 עליה חדה",
  },
  צמיחה: { bg: "bg-emerald-100", text: "text-emerald-700", label: "📈 צמיחה" },
  יציב: { bg: "bg-blue-100", text: "text-blue-700", label: "➡️ יציב" },
  ירידה: { bg: "bg-orange-100", text: "text-orange-700", label: "📉 ירידה" },
  התרסקות: { bg: "bg-red-100", text: "text-red-700", label: "💥 התרסקות" },
  אזעקה: { bg: "bg-red-100", text: "text-red-700", label: "🚨 אזעקה" },
};

// ============================================
// HELPER COMPONENTS
// ============================================

function SortIcon({
  sortKey,
  currentKey,
  direction,
}: {
  sortKey: SortKey;
  currentKey: SortKey | null;
  direction: "asc" | "desc" | null;
}) {
  if (currentKey !== sortKey) {
    return <ChevronsUpDown className="w-4 h-4 text-gray-300" />;
  }
  return direction === "asc" ? (
    <ChevronUp className="w-4 h-4 text-blue-500" />
  ) : (
    <ChevronDown className="w-4 h-4 text-blue-500" />
  );
}

function SortableTh({
  column,
  currentKey,
  direction,
  onClick,
  children,
  subtitle,
  subtitleClassName = "text-blue-500",
  className,
}: {
  column: SortKey;
  currentKey: SortKey | null;
  direction: "asc" | "desc" | null;
  onClick: (key: SortKey) => void;
  children: React.ReactNode;
  subtitle?: string;
  subtitleClassName?: string;
  className?: string;
}) {
  return (
    <th
      role="columnheader"
      aria-sort={
        currentKey === column
          ? direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
      onClick={() => onClick(column)}
      className={clsx(
        "px-4 py-3 text-right cursor-pointer select-none hover:bg-gray-100 transition-colors",
        className,
      )}
    >
      <span className="font-medium text-gray-700 inline-flex items-center gap-1">
        {children}
        <SortIcon
          sortKey={column}
          currentKey={currentKey}
          direction={direction}
        />
      </span>
      {subtitle ? (
        <span
          className={clsx(
            "block text-xs font-normal mt-0.5",
            subtitleClassName,
          )}
        >
          {subtitle}
        </span>
      ) : null}
    </th>
  );
}

function StatusBadge({ status }: { status: string | undefined }) {
  if (!status) return <span className="text-gray-400">-</span>;
  const config = STATUS_COLORS[status] || {
    bg: "bg-gray-100",
    text: "text-gray-700",
    label: status,
  };
  return (
    <span
      className={clsx(
        "px-2 py-1 rounded-full text-xs font-medium",
        config.bg,
        config.text,
      )}
    >
      {config.label}
    </span>
  );
}

function MetricCell({
  value,
  currentQty,
  previousQty,
  currentPeriod,
  previousPeriod,
  suffix = "%",
}: {
  value: number | undefined;
  currentQty?: number;
  previousQty?: number;
  currentPeriod?: string;
  previousPeriod?: string;
  suffix?: string;
}) {
  if (value === undefined || value === null)
    return <span className="text-gray-400">-</span>;
  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <div className="flex flex-col">
      <span
        className={clsx(
          "font-bold text-base",
          isPositive && "text-green-600",
          isNegative && "text-red-600",
          !isPositive && !isNegative && "text-gray-600",
        )}
      >
        {isPositive && "+"}
        {value.toFixed(1)}
        {suffix}
      </span>
      {currentQty !== undefined && previousQty !== undefined && (
        <div className="text-xs text-gray-500 mt-0.5 space-y-0.5">
          <div className="flex justify-between gap-2">
            <span className="text-gray-400">{currentPeriod || "נוכחי"}:</span>
            <span className="font-medium">{currentQty.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-gray-400">{previousPeriod || "קודם"}:</span>
            <span className="font-medium">{previousQty.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function NumberCell({
  value,
  format = "number",
}: {
  value: number;
  format?: "number" | "currency";
}) {
  if (format === "currency") {
    return <span className="font-medium">₪{value.toLocaleString()}</span>;
  }
  return <span className="font-medium">{value.toLocaleString()}</span>;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function StoresTableSupabase({ hook }: StoresTableSupabaseProps) {
  const {
    paginatedStores,
    stores,
    viewMode,
    sortKey,
    sortDirection,
    handleSort,
    selectedStoreIds,
    toggleStoreSelection,
    selectAllStores,
    clearStoreSelection,
    metricsPeriodInfo,
    periodSelector,
  } = hook;

  // Get dynamic headers for metrics
  const metricsHeaders = useMetricsHeaders(metricsPeriodInfo);

  // Get detailed period labels for cells
  const periodDetails = useMetricsPeriodDetails(metricsPeriodInfo);

  const allSelected =
    stores.length > 0 && stores.every((s) => selectedStoreIds.has(s.id));
  const someSelected = stores.some((s) => selectedStoreIds.has(s.id));

  // Header click handler
  const onHeaderClick = (key: SortKey) => handleSort(key);

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <div className="overflow-x-auto overflow-y-visible scroll-smooth touch-pan-x">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {/* Checkbox */}
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={() =>
                    allSelected ? clearStoreSelection() : selectAllStores()
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
              </th>

              <SortableTh
                column="name"
                currentKey={sortKey}
                direction={sortDirection}
                onClick={onHeaderClick}
              >
                חנות
              </SortableTh>
              <SortableTh
                column="city"
                currentKey={sortKey}
                direction={sortDirection}
                onClick={onHeaderClick}
              >
                עיר
              </SortableTh>

              {viewMode === "metrics" ? (
                <>
                  <SortableTh
                    column="status_long"
                    currentKey={sortKey}
                    direction={sortDirection}
                    onClick={onHeaderClick}
                  >
                    מגמה שנתית
                  </SortableTh>
                  {metricsHeaders.map((header) => (
                    <SortableTh
                      key={header.key}
                      column={header.key as SortKey}
                      currentKey={sortKey}
                      direction={sortDirection}
                      onClick={onHeaderClick}
                      subtitle={header.subLabel}
                      subtitleClassName="text-gray-500"
                    >
                      {header.label}
                    </SortableTh>
                  ))}
                  <SortableTh
                    column="status_short"
                    currentKey={sortKey}
                    direction={sortDirection}
                    onClick={onHeaderClick}
                  >
                    מגמה קצרה
                  </SortableTh>
                </>
              ) : (
                <>
                  <SortableTh
                    column="qty"
                    currentKey={sortKey}
                    direction={sortDirection}
                    onClick={onHeaderClick}
                    subtitle={periodSelector.primary.label}
                  >
                    כמות נטו
                  </SortableTh>
                  {periodSelector.compare.enabled &&
                    periodSelector.compare.months.length > 0 &&
                    periodSelector.displayMode === "columns" && (
                      <SortableTh
                        column="compare_qty"
                        currentKey={sortKey}
                        direction={sortDirection}
                        onClick={onHeaderClick}
                        subtitle={periodSelector.compare.label}
                        subtitleClassName="text-orange-500"
                        className="bg-orange-50"
                      >
                        כמות נטו
                      </SortableTh>
                    )}
                  <SortableTh
                    column="sales"
                    currentKey={sortKey}
                    direction={sortDirection}
                    onClick={onHeaderClick}
                    subtitle={periodSelector.primary.label}
                  >
                    מכירות
                  </SortableTh>
                  {periodSelector.compare.enabled &&
                    periodSelector.compare.months.length > 0 &&
                    periodSelector.displayMode === "columns" && (
                      <SortableTh
                        column="compare_sales"
                        currentKey={sortKey}
                        direction={sortDirection}
                        onClick={onHeaderClick}
                        subtitle={periodSelector.compare.label}
                        subtitleClassName="text-orange-500"
                        className="bg-orange-50"
                      >
                        מכירות
                      </SortableTh>
                    )}
                  <SortableTh
                    column="gross"
                    currentKey={sortKey}
                    direction={sortDirection}
                    onClick={onHeaderClick}
                  >
                    כמות ברוטו
                  </SortableTh>
                  <SortableTh
                    column="returns"
                    currentKey={sortKey}
                    direction={sortDirection}
                    onClick={onHeaderClick}
                  >
                    החזרות
                  </SortableTh>
                  <SortableTh
                    column="returns_pct"
                    currentKey={sortKey}
                    direction={sortDirection}
                    onClick={onHeaderClick}
                  >
                    % החזרות
                  </SortableTh>
                  {periodSelector.compare.enabled &&
                    periodSelector.compare.months.length > 0 && (
                      <SortableTh
                        column="qty_change"
                        currentKey={sortKey}
                        direction={sortDirection}
                        onClick={onHeaderClick}
                      >
                        שינוי %
                      </SortableTh>
                    )}
                </>
              )}
            </tr>
          </thead>

          <tbody className="divide-y">
            {paginatedStores.length === 0 ? (
              <tr>
                <td
                  colSpan={viewMode === "metrics" ? 8 : 8}
                  className="px-4 py-12 text-center text-gray-500"
                >
                  <Store className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>לא נמצאו חנויות</p>
                </td>
              </tr>
            ) : (
              paginatedStores.map((store) => (
                <tr
                  key={store.id}
                  className={clsx(
                    "hover:bg-gray-50 transition-colors",
                    selectedStoreIds.has(store.id) && "bg-blue-50",
                  )}
                >
                  {/* Checkbox */}
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedStoreIds.has(store.id)}
                      onChange={() => toggleStoreSelection(store.id)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  </td>

                  {/* Name */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/stores/${store.id}`}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <Store className="w-4 h-4" />
                      {store.name}
                    </Link>
                  </td>

                  {/* City */}
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {store.city || "-"}
                    </span>
                  </td>

                  {viewMode === "metrics" ? (
                    <>
                      {/* Status Long */}
                      <td className="px-4 py-3">
                        <StatusBadge status={store.metrics?.status_long} />
                      </td>

                      {/* Metrics with raw numbers and periods */}
                      <td className="px-4 py-3">
                        <MetricCell
                          value={store.metrics?.metric_12v12}
                          currentQty={store.metrics?.qty_12v12_current}
                          previousQty={store.metrics?.qty_12v12_previous}
                          currentPeriod={
                            periodDetails?.metric_12v12.currentLabel
                          }
                          previousPeriod={
                            periodDetails?.metric_12v12.previousLabel
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <MetricCell
                          value={store.metrics?.metric_6v6}
                          currentQty={store.metrics?.qty_6v6_current}
                          previousQty={store.metrics?.qty_6v6_previous}
                          currentPeriod={periodDetails?.metric_6v6.currentLabel}
                          previousPeriod={
                            periodDetails?.metric_6v6.previousLabel
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <MetricCell
                          value={store.metrics?.metric_3v3}
                          currentQty={store.metrics?.qty_3v3_current}
                          previousQty={store.metrics?.qty_3v3_previous}
                          currentPeriod={periodDetails?.metric_3v3.currentLabel}
                          previousPeriod={
                            periodDetails?.metric_3v3.previousLabel
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <MetricCell
                          value={store.metrics?.metric_2v2}
                          currentQty={store.metrics?.qty_2v2_current}
                          previousQty={store.metrics?.qty_2v2_previous}
                          currentPeriod={periodDetails?.metric_2v2.currentLabel}
                          previousPeriod={
                            periodDetails?.metric_2v2.previousLabel
                          }
                        />
                      </td>

                      {/* Status Short */}
                      <td className="px-4 py-3">
                        <StatusBadge status={store.metrics?.status_short} />
                      </td>
                    </>
                  ) : (
                    <>
                      {/* Data Mode - depends on displayMode */}
                      {periodSelector.displayMode === "columns" ||
                      !periodSelector.compare.enabled ||
                      periodSelector.compare.months.length === 0 ? (
                        <>
                          {/* COLUMNS MODE or NO COMPARE */}
                          <td className="px-4 py-3">
                            <NumberCell value={store.periodData.qty} />
                          </td>

                          {periodSelector.compare.enabled &&
                            periodSelector.compare.months.length > 0 &&
                            store.compareData && (
                              <td className="px-4 py-3 bg-orange-50">
                                <NumberCell value={store.compareData.qty} />
                              </td>
                            )}

                          <td className="px-4 py-3">
                            <NumberCell
                              value={store.periodData.sales}
                              format="currency"
                            />
                          </td>

                          {periodSelector.compare.enabled &&
                            periodSelector.compare.months.length > 0 &&
                            store.compareData && (
                              <td className="px-4 py-3 bg-orange-50">
                                <NumberCell
                                  value={store.compareData.sales}
                                  format="currency"
                                />
                              </td>
                            )}

                          <td className="px-4 py-3">
                            <NumberCell
                              value={store.periodData.gross ?? 0}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <NumberCell value={store.periodData.returns} />
                          </td>
                          <td className="px-4 py-3">
                            <MetricCell value={store.periodData.returnsPct} />
                          </td>

                          {periodSelector.compare.enabled &&
                            periodSelector.compare.months.length > 0 &&
                            store.compareData && (
                              <td className="px-4 py-3">
                                <MetricCell
                                  value={
                                    store.compareData.qty > 0
                                      ? ((store.periodData.qty -
                                          store.compareData.qty) /
                                          store.compareData.qty) *
                                        100
                                      : 0
                                  }
                                  currentQty={store.periodData.qty}
                                  previousQty={store.compareData.qty}
                                />
                              </td>
                            )}
                        </>
                      ) : (
                        <>
                          {/* ROWS MODE with compare - showing primary data */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                <NumberCell value={store.periodData.qty} />
                              </div>
                              {store.compareData && (
                                <div className="flex items-center gap-2 text-orange-600">
                                  <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                                  <NumberCell value={store.compareData.qty} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                <NumberCell
                                  value={store.periodData.sales}
                                  format="currency"
                                />
                              </div>
                              {store.compareData && (
                                <div className="flex items-center gap-2 text-orange-600">
                                  <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                                  <NumberCell
                                    value={store.compareData.sales}
                                    format="currency"
                                  />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <NumberCell
                                value={store.periodData.gross ?? 0}
                              />
                              {store.compareData && (
                                <span className="text-orange-600">
                                  <NumberCell
                                    value={store.compareData.gross ?? 0}
                                  />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <NumberCell value={store.periodData.returns} />
                              {store.compareData && (
                                <span className="text-orange-600">
                                  <NumberCell
                                    value={store.compareData.returns}
                                  />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <MetricCell value={store.periodData.returnsPct} />
                          </td>
                          <td className="px-4 py-3">
                            <MetricCell
                              value={
                                store.compareData && store.compareData.qty > 0
                                  ? ((store.periodData.qty -
                                      store.compareData.qty) /
                                      store.compareData.qty) *
                                    100
                                  : 0
                              }
                              currentQty={store.periodData.qty}
                              previousQty={store.compareData?.qty}
                            />
                          </td>
                        </>
                      )}
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
