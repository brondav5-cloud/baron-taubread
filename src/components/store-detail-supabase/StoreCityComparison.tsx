"use client";

import { ChevronUp, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { formatPercent, getMetricColor } from "@/lib/calculations";
import type { DbStore } from "@/types/supabase";
import type {
  CityRankings,
  CityAverages,
  CitySortKey,
  CitySortDir,
} from "@/hooks/useStoreCityComparison";
import { CityRankingCards } from "./CityRankingCards";
import { useMetricsHeaders } from "@/components/common";

// ============================================
// SORT HEADER
// ============================================

function SortHeader({
  label,
  subLabel,
  sortKey: key,
  currentKey,
  currentDir,
  onSort,
}: {
  label: string;
  subLabel?: string;
  sortKey: CitySortKey;
  currentKey: CitySortKey;
  currentDir: CitySortDir;
  onSort: (key: CitySortKey) => void;
}) {
  const isActive = currentKey === key;
  return (
    <th
      className="px-3 py-2 text-center text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => onSort(key)}
    >
      <div className="flex flex-col items-center gap-0.5">
        <div className="flex items-center justify-center gap-1">
          {label}
          {isActive &&
            (currentDir === "desc" ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronUp className="w-3 h-3" />
            ))}
        </div>
        {subLabel && (
          <span className="text-[10px] text-gray-500 font-normal">
            {subLabel}
          </span>
        )}
      </div>
    </th>
  );
}

// ============================================
// TYPES
// ============================================

interface StoreCityComparisonProps {
  store: DbStore;
  cityStores: DbStore[];
  rankings: CityRankings | null;
  cityAverages: CityAverages | null;
  isLoading: boolean;
  sortKey: CitySortKey;
  sortDir: CitySortDir;
  onSort: (key: CitySortKey) => void;
  totalInCity: number;
  metricsPeriodInfo?: {
    metricsMonths: string[];
    metricsPeriodStart?: string;
    metricsPeriodEnd?: string;
  } | null;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function StoreCityComparison({
  store,
  cityStores,
  rankings,
  cityAverages,
  isLoading,
  sortKey,
  sortDir,
  onSort,
  totalInCity,
  metricsPeriodInfo,
}: StoreCityComparisonProps) {
  const metricsHeaders = useMetricsHeaders(
    metricsPeriodInfo
      ? {
          metricsPeriodStart: metricsPeriodInfo.metricsPeriodStart || "",
          metricsPeriodEnd: metricsPeriodInfo.metricsPeriodEnd || "",
          metricsMonths: metricsPeriodInfo.metricsMonths,
        }
      : null,
  );
  const headerMap = Object.fromEntries(
    metricsHeaders.map((h) => [h.key, h.subLabel]),
  );
  if (!store.city) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-gray-400">
        לא ניתן להשוות — לא מוגדרת עיר לחנות
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-gray-400 animate-pulse">
        טוען השוואת עיר...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rankings && <CityRankingCards rankings={rankings} />}

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-bold text-gray-900">
            📍 חנויות ב{store.city} ({totalInCity})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-right text-sm font-medium text-gray-700 w-8">
                  #
                </th>
                <SortHeader
                  label="חנות"
                  sortKey="name"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={onSort}
                />
                <SortHeader
                  label={headerMap.metric_12v12 || "12v12"}
                  sortKey="metric_12v12"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={onSort}
                />
                <SortHeader
                  label={headerMap.metric_6v6 || "6v6"}
                  sortKey="metric_6v6"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={onSort}
                />
                <SortHeader
                  label={headerMap.metric_3v3 || "3v3"}
                  sortKey="metric_3v3"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={onSort}
                />
                <SortHeader
                  label={headerMap.metric_2v2 || "2v2"}
                  sortKey="metric_2v2"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={onSort}
                />
                <SortHeader
                  label="% החזרות"
                  sortKey="returns_pct"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={onSort}
                />
              </tr>
            </thead>
            <tbody className="divide-y">
              {cityStores.map((s, i) => {
                const isCurrent = s.id === store.id;
                return (
                  <tr
                    key={s.id}
                    className={clsx(
                      "hover:bg-gray-50",
                      isCurrent && "bg-blue-50 font-medium",
                    )}
                  >
                    <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={clsx(isCurrent && "text-blue-700")}>
                        {s.name}
                      </span>
                      {isCurrent && (
                        <span className="text-xs text-blue-500 mr-1">
                          {" "}
                          (אתה)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={clsx(
                          "font-medium",
                          getMetricColor(s.metrics?.metric_12v12),
                        )}
                      >
                        {formatPercent(s.metrics?.metric_12v12)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={clsx(
                          "font-medium",
                          getMetricColor(s.metrics?.metric_6v6),
                        )}
                      >
                        {formatPercent(s.metrics?.metric_6v6)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={clsx(
                          "font-medium",
                          getMetricColor(s.metrics?.metric_3v3),
                        )}
                      >
                        {formatPercent(s.metrics?.metric_3v3)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={clsx(
                          "font-medium",
                          getMetricColor(s.metrics?.metric_2v2),
                        )}
                      >
                        {formatPercent(s.metrics?.metric_2v2)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={clsx(
                          (s.metrics?.returns_pct_current ?? 0) > 15
                            ? "text-red-600"
                            : "text-gray-600",
                        )}
                      >
                        {(s.metrics?.returns_pct_current ?? 0).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {cityAverages && (
              <tfoot className="bg-gray-100 font-medium text-gray-700">
                <tr>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 text-right">ממוצע עירוני</td>
                  <td className="px-3 py-2 text-center">
                    {formatPercent(cityAverages.metric_12v12)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {formatPercent(cityAverages.metric_6v6)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {formatPercent(cityAverages.metric_3v3)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {formatPercent(cityAverages.metric_2v2)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {cityAverages.returns_pct.toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
