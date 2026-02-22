"use client";

import { clsx } from "clsx";
import { formatPercent, getMetricColor } from "@/lib/calculations";
import type { CityStats } from "@/hooks/useComparisonSupabase";
import type { MetricsPeriodLabels } from "@/lib/periodUtils";

interface CityStatsCardsProps {
  stats: CityStats;
  periodLabels?: MetricsPeriodLabels | null;
}

export function CityStatsCards({ stats, periodLabels }: CityStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
      <div className="p-4 bg-blue-50 rounded-xl text-center">
        <p className="text-2xl font-bold text-blue-700">{stats.count}</p>
        <p className="text-sm text-blue-600">חנויות</p>
      </div>
      <div className="p-4 bg-gray-50 rounded-xl text-center">
        <p
          className={clsx("text-2xl font-bold", getMetricColor(stats.avg12v12))}
        >
          {formatPercent(stats.avg12v12)}
        </p>
        <p className="text-sm text-gray-600">
          {periodLabels?.yearly
            ? `ממוצע ${periodLabels.yearly}`
            : "ממוצע 12v12"}
        </p>
      </div>
      <div className="p-4 bg-gray-50 rounded-xl text-center">
        <p className={clsx("text-2xl font-bold", getMetricColor(stats.avg6v6))}>
          {formatPercent(stats.avg6v6)}
        </p>
        <p className="text-sm text-gray-600">
          {periodLabels?.halfYear
            ? `ממוצע ${periodLabels.halfYear}`
            : "ממוצע 6v6"}
        </p>
      </div>
      <div className="p-4 bg-gray-50 rounded-xl text-center">
        <p className={clsx("text-2xl font-bold", getMetricColor(stats.avg2v2))}>
          {formatPercent(stats.avg2v2)}
        </p>
        <p className="text-sm text-gray-600">
          {periodLabels?.twoMonths
            ? `ממוצע ${periodLabels.twoMonths}`
            : "ממוצע 2v2"}
        </p>
      </div>
      <div className="p-4 bg-gray-50 rounded-xl text-center">
        <p className="text-2xl font-bold text-gray-700">
          {stats.avgReturns.toFixed(1)}%
        </p>
        <p className="text-sm text-gray-600">ממוצע החזרות</p>
      </div>
    </div>
  );
}
