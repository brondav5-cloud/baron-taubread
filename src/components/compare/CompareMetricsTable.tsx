"use client";

import { clsx } from "clsx";
import { StatusBadgeLong } from "@/components/ui";
import { formatPercent, getMetricColor } from "@/lib/calculations";
import { CHART_COLORS } from "@/hooks/useComparisonSupabase";
import type { ComparisonStore } from "@/hooks/useComparisonSupabase";

interface CompareMetricsTableProps {
  stores: ComparisonStore[];
  metricsPeriodLabels?: {
    yearly: string;
    halfYear: string;
    quarter: string;
    twoMonths: string;
  } | null;
}

export function CompareMetricsTable({
  stores,
  metricsPeriodLabels,
}: CompareMetricsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-right font-semibold text-gray-700 min-w-[180px]">
              חנות
            </th>
            <th className="px-3 py-3 text-center font-semibold text-gray-700">
              <div>{metricsPeriodLabels?.yearly || "12v12"}</div>
            </th>
            <th className="px-3 py-3 text-center font-semibold text-gray-700">
              <div>{metricsPeriodLabels?.halfYear || "6v6"}</div>
            </th>
            <th className="px-3 py-3 text-center font-semibold text-gray-700">
              <div>{metricsPeriodLabels?.quarter || "3v3"}</div>
            </th>
            <th className="px-3 py-3 text-center font-semibold text-gray-700">
              <div>{metricsPeriodLabels?.twoMonths || "2v2"}</div>
            </th>
            <th className="px-3 py-3 text-center font-semibold text-gray-700">
              מהשיא
            </th>
            <th className="px-3 py-3 text-center font-semibold text-gray-700">
              החזרות
            </th>
            <th className="px-3 py-3 text-center font-semibold text-gray-700">
              סטטוס
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {stores.map((store, index) => (
            <tr key={store.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor:
                        CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  />
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {store.name}
                    </div>
                    <div className="text-xs text-gray-500">{store.city}</div>
                  </div>
                </div>
              </td>
              <td
                className={clsx(
                  "px-3 py-3 text-center font-bold",
                  getMetricColor(store.metric_12v12),
                )}
              >
                {formatPercent(store.metric_12v12)}
              </td>
              <td
                className={clsx(
                  "px-3 py-3 text-center font-bold",
                  getMetricColor(store.metric_6v6),
                )}
              >
                {formatPercent(store.metric_6v6)}
              </td>
              <td
                className={clsx(
                  "px-3 py-3 text-center font-bold",
                  getMetricColor(store.metric_3v3),
                )}
              >
                {formatPercent(store.metric_3v3)}
              </td>
              <td
                className={clsx(
                  "px-3 py-3 text-center font-bold",
                  getMetricColor(store.metric_2v2),
                )}
              >
                {formatPercent(store.metric_2v2)}
              </td>
              <td
                className={clsx(
                  "px-3 py-3 text-center font-bold",
                  getMetricColor(store.metric_peak_distance),
                )}
              >
                {formatPercent(store.metric_peak_distance)}
              </td>
              <td
                className={clsx(
                  "px-3 py-3 text-center font-bold",
                  store.returns_pct_last6 > 15
                    ? "text-red-600"
                    : "text-gray-700",
                )}
              >
                {store.returns_pct_last6.toFixed(1)}%
              </td>
              <td className="px-3 py-3 text-center">
                <StatusBadgeLong
                  status={
                    store.status_long as
                      | "עליה_חדה"
                      | "צמיחה"
                      | "יציב"
                      | "ירידה"
                      | "התרסקות"
                  }
                  size="sm"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
