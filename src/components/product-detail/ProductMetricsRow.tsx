"use client";

import { clsx } from "clsx";
import {
  formatNumber,
  formatPercent,
  getMetricColor,
} from "@/lib/calculations";
import type { ProductWithStatus } from "@/types/data";

interface ProductMetricsRowProps {
  product: ProductWithStatus;
}

export function ProductMetricsRow({ product }: ProductMetricsRowProps) {
  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
        <p className="text-xs text-gray-500 mb-1">שנתי (24←25)</p>
        <p
          className={clsx(
            "text-2xl font-bold",
            getMetricColor(product.metric_12v12),
          )}
        >
          {formatPercent(product.metric_12v12)}
        </p>
        <p className="text-xs text-gray-400">
          {formatNumber(product.qty_2024)}←{formatNumber(product.qty_2025)}
        </p>
      </div>
      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
        <p className="text-xs text-gray-500 mb-1">6 חודשים (H1←H2)</p>
        <p
          className={clsx(
            "text-2xl font-bold",
            getMetricColor(product.metric_6v6),
          )}
        >
          {formatPercent(product.metric_6v6)}
        </p>
        <p className="text-xs text-gray-400">
          {formatNumber(product.qty_prev6)}←{formatNumber(product.qty_last6)}
        </p>
      </div>
      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
        <p className="text-xs text-gray-500 mb-1">3 חודשים (25←24)</p>
        <p
          className={clsx(
            "text-2xl font-bold",
            getMetricColor(product.metric_3v3),
          )}
        >
          {formatPercent(product.metric_3v3)}
        </p>
        <p className="text-xs text-gray-400">
          {formatNumber(product.qty_prev3)}←{formatNumber(product.qty_last3)}
        </p>
      </div>
      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
        <p className="text-xs text-gray-500 mb-1">2 חודשים (ספט-נוב)</p>
        <p
          className={clsx(
            "text-2xl font-bold",
            getMetricColor(product.metric_2v2),
          )}
        >
          {formatPercent(product.metric_2v2)}
        </p>
        <p className="text-xs text-gray-400">
          {formatNumber(product.qty_prev2)}←{formatNumber(product.qty_last2)}
        </p>
      </div>
      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
        <p className="text-xs text-gray-500 mb-1">מרחק מהשיא</p>
        <p
          className={clsx(
            "text-2xl font-bold",
            getMetricColor(product.metric_peak_distance),
          )}
        >
          {formatPercent(product.metric_peak_distance)}
        </p>
        <p className="text-xs text-gray-400">
          שיא: {formatNumber(product.peak_value)} | דצמ:{" "}
          {formatNumber(product.current_value)}
        </p>
      </div>
      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
        <p className="text-xs text-gray-500 mb-1">חזרות %</p>
        <p
          className={clsx(
            "text-2xl font-bold",
            product.returns_pct_last6 > 15 ? "text-red-600" : "text-green-600",
          )}
        >
          {product.returns_pct_last6.toFixed(1)}%→
          {product.returns_pct_prev6.toFixed(1)}%
        </p>
        <p
          className={clsx(
            "text-xs",
            product.returns_change > 0 ? "text-red-500" : "text-green-500",
          )}
        >
          שינוי: {product.returns_change > 0 ? "+" : ""}
          {product.returns_change.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}
