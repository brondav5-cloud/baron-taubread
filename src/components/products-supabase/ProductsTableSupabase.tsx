"use client";

import Link from "next/link";
import { ChevronUp, ChevronDown, ChevronsUpDown, Package } from "lucide-react";
import { clsx } from "clsx";
import {
  useMetricsHeaders,
  useMetricsPeriodDetails,
} from "@/components/common";
import { formatPercent, getMetricColor } from "@/lib/calculations";
import type {
  UseProductsPageSupabaseReturn,
  SortKey,
} from "@/hooks/useProductsPageSupabase";

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
};

function SortIcon({
  sortKey,
  currentKey,
  direction,
}: {
  sortKey: SortKey;
  currentKey: SortKey | null;
  direction: "asc" | "desc" | null;
}) {
  if (currentKey !== sortKey)
    return <ChevronsUpDown className="w-4 h-4 text-gray-300" />;
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
}: {
  value: number | undefined;
  currentQty?: number;
  previousQty?: number;
  currentPeriod?: string;
  previousPeriod?: string;
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
        {value.toFixed(1)}%
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
  return format === "currency" ? (
    <span className="font-medium">₪{value.toLocaleString()}</span>
  ) : (
    <span className="font-medium">{value.toLocaleString()}</span>
  );
}

export function ProductsTableSupabase({
  hook,
}: {
  hook: UseProductsPageSupabaseReturn;
}) {
  const {
    paginatedProducts,
    viewMode,
    sortKey,
    sortDirection,
    handleSort,
    metricsPeriodInfo,
    periodSelector,
  } = hook;
  const metricsHeaders = useMetricsHeaders(metricsPeriodInfo);
  const periodDetails = useMetricsPeriodDetails(metricsPeriodInfo);
  const onHeaderClick = (key: SortKey) => handleSort(key);

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <div className="overflow-x-auto overflow-y-visible scroll-smooth touch-pan-x">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <SortableTh
                column="name"
                currentKey={sortKey}
                direction={sortDirection}
                onClick={onHeaderClick}
              >
                מוצר
              </SortableTh>
              <SortableTh
                column="category"
                currentKey={sortKey}
                direction={sortDirection}
                onClick={onHeaderClick}
              >
                קטגוריה
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
                  <SortableTh
                    column="metric_peak_distance"
                    currentKey={sortKey}
                    direction={sortDirection}
                    onClick={onHeaderClick}
                  >
                    מהשיא
                  </SortableTh>
                  <SortableTh
                    column="returns_pct_current"
                    currentKey={sortKey}
                    direction={sortDirection}
                    onClick={onHeaderClick}
                  >
                    חזרות %
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
                    periodSelector.compare.months.length > 0 && (
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
                    periodSelector.compare.months.length > 0 && (
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
          <tbody>
            {paginatedProducts.map((product: (typeof paginatedProducts)[0]) => (
              <tr key={product.id} className="hover:bg-gray-50 border-b">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/products/${product.external_id}`}
                    className="font-medium text-blue-600 hover:underline flex items-center gap-2"
                  >
                    <Package className="w-4 h-4 text-gray-400" />
                    {product.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {product.category || "-"}
                </td>
                {viewMode === "metrics" ? (
                  <>
                    <td className="px-4 py-3">
                      <StatusBadge status={product.metrics?.status_long} />
                    </td>
                    <td className="px-4 py-3">
                      <MetricCell
                        value={product.metrics?.metric_12v12}
                        currentQty={product.metrics?.qty_12v12_current}
                        previousQty={product.metrics?.qty_12v12_previous}
                        currentPeriod={periodDetails?.metric_12v12.currentLabel}
                        previousPeriod={
                          periodDetails?.metric_12v12.previousLabel
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <MetricCell
                        value={product.metrics?.metric_6v6}
                        currentQty={product.metrics?.qty_6v6_current}
                        previousQty={product.metrics?.qty_6v6_previous}
                        currentPeriod={periodDetails?.metric_6v6.currentLabel}
                        previousPeriod={periodDetails?.metric_6v6.previousLabel}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <MetricCell
                        value={product.metrics?.metric_3v3}
                        currentQty={product.metrics?.qty_3v3_current}
                        previousQty={product.metrics?.qty_3v3_previous}
                        currentPeriod={periodDetails?.metric_3v3.currentLabel}
                        previousPeriod={periodDetails?.metric_3v3.previousLabel}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <MetricCell
                        value={product.metrics?.metric_2v2}
                        currentQty={product.metrics?.qty_2v2_current}
                        previousQty={product.metrics?.qty_2v2_previous}
                        currentPeriod={periodDetails?.metric_2v2.currentLabel}
                        previousPeriod={periodDetails?.metric_2v2.previousLabel}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={product.metrics?.status_short} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          "font-medium",
                          getMetricColor(
                            (
                              product.metrics as unknown as Record<
                                string,
                                number
                              >
                            )?.metric_peak_distance ?? 0,
                          ),
                        )}
                      >
                        {formatPercent(
                          (product.metrics as unknown as Record<string, number>)
                            ?.metric_peak_distance ?? 0,
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-red-600">
                      {(
                        (product.metrics as unknown as Record<string, number>)
                          ?.returns_pct_current ?? 0
                      ).toFixed(1)}
                      %
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">
                      <NumberCell value={product.periodData.qty} />
                    </td>
                    {periodSelector.compare.enabled &&
                      periodSelector.compare.months.length > 0 &&
                      product.compareData && (
                        <td className="px-4 py-3 bg-orange-50">
                          <NumberCell value={product.compareData.qty} />
                        </td>
                      )}
                    <td className="px-4 py-3">
                      <NumberCell
                        value={product.periodData.sales}
                        format="currency"
                      />
                    </td>
                    {periodSelector.compare.enabled &&
                      periodSelector.compare.months.length > 0 &&
                      product.compareData && (
                        <>
                          <td className="px-4 py-3 bg-orange-50">
                            <NumberCell
                              value={product.compareData.sales}
                              format="currency"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={clsx(
                                "font-medium",
                                product.compareData.qty > 0
                                  ? ((product.periodData.qty -
                                      product.compareData.qty) /
                                      product.compareData.qty) *
                                      100 >=
                                    0
                                    ? "text-green-600"
                                    : "text-red-600"
                                  : "text-gray-500",
                              )}
                            >
                              {product.compareData.qty > 0
                                ? `${(((product.periodData.qty - product.compareData.qty) / product.compareData.qty) * 100).toFixed(1)}%`
                                : "-"}
                            </span>
                          </td>
                        </>
                      )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
