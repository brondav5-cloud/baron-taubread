"use client";

import { clsx } from "clsx";
import {
  formatNumber,
  formatPercent,
  getMetricColor,
} from "@/lib/calculations";
import type { StoreWithStatus } from "@/types/data";

interface StoreMetricsRowProps {
  store: StoreWithStatus;
}

export function StoreMetricsRow({ store }: StoreMetricsRowProps) {
  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Yearly */}
      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
        <p className="text-xs text-gray-500 mb-1">שנתי (24←25)</p>
        <p
          className={clsx(
            "text-2xl font-bold",
            getMetricColor(store.metric_12v12),
          )}
        >
          {formatPercent(store.metric_12v12)}
        </p>
        <p className="text-xs text-gray-400">
          {formatNumber(store.qty_2024)}←{formatNumber(store.qty_2025)}
        </p>
      </div>

      {/* 6 Months */}
      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
        <p className="text-xs text-gray-500 mb-1">6 חודשים (H1←H2)</p>
        <p
          className={clsx(
            "text-2xl font-bold",
            getMetricColor(store.metric_6v6),
          )}
        >
          {formatPercent(store.metric_6v6)}
        </p>
        <p className="text-xs text-gray-400">
          {formatNumber(store.qty_prev6)}←{formatNumber(store.qty_last6)}
        </p>
      </div>

      {/* 3 Months */}
      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
        <p className="text-xs text-gray-500 mb-1">3 חודשים (25←24)</p>
        <p
          className={clsx(
            "text-2xl font-bold",
            getMetricColor(store.metric_3v3),
          )}
        >
          {formatPercent(store.metric_3v3)}
        </p>
        <p className="text-xs text-gray-400">
          {formatNumber(store.qty_prev3)}←{formatNumber(store.qty_last3)}
        </p>
      </div>

      {/* 2 Months */}
      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
        <p className="text-xs text-gray-500 mb-1">2 חודשים (ספט-נוב)</p>
        <p
          className={clsx(
            "text-2xl font-bold",
            getMetricColor(store.metric_2v2),
          )}
        >
          {formatPercent(store.metric_2v2)}
        </p>
        <p className="text-xs text-gray-400">
          {formatNumber(store.qty_prev2)}←{formatNumber(store.qty_last2)}
        </p>
      </div>

      {/* Peak Distance */}
      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
        <p className="text-xs text-gray-500 mb-1">מרחק מהשיא</p>
        <p
          className={clsx(
            "text-2xl font-bold",
            getMetricColor(store.metric_peak_distance),
          )}
        >
          {formatPercent(store.metric_peak_distance)}
        </p>
        <p className="text-xs text-gray-400">
          שיא: {store.peak_value} | דצמ: {store.current_value}
        </p>
      </div>

      {/* Returns */}
      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
        <p className="text-xs text-gray-500 mb-1">חזרות %</p>
        <p
          className={clsx(
            "text-2xl font-bold",
            store.returns_pct_last6 > 15 ? "text-red-600" : "text-green-600",
          )}
        >
          {store.returns_pct_last6.toFixed(1)}%→
          {store.returns_pct_prev6.toFixed(1)}%
        </p>
        <p
          className={clsx(
            "text-xs",
            store.returns_change > 0 ? "text-red-500" : "text-green-500",
          )}
        >
          שינוי: {store.returns_change > 0 ? "+" : ""}
          {store.returns_change.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}
