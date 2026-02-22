"use client";

import { clsx } from "clsx";
import {
  formatNumber,
  formatPercent,
  getMetricColor,
} from "@/lib/calculations";
import type { StoreMetrics } from "@/types/supabase";
import type { MetricPeriodDetails } from "@/components/common";

// ============================================
// TYPES
// ============================================

interface MetricCardItem {
  key: string;
  label: string;
  sublabel: string;
  value: number | undefined;
  currentQty?: number;
  previousQty?: number;
  periodDetails?: MetricPeriodDetails;
}

interface StoreMetricsCardsProps {
  metrics: StoreMetrics | undefined;
  metricsPeriodInfo?: {
    metricsMonths: string[];
    metricsPeriodStart?: string;
    metricsPeriodEnd?: string;
  } | null;
}

// ============================================
// SINGLE CARD
// ============================================

function MetricCardSingle({ item }: { item: MetricCardItem }) {
  const value = item.value ?? 0;
  const pd = item.periodDetails;
  return (
    <div className="bg-white rounded-xl p-4 text-center shadow-sm border">
      <p className="text-xs text-gray-500 mb-1">{item.label}</p>
      <p className="text-[10px] text-gray-400 mb-1">
        {pd ? `${pd.previousLabel} vs ${pd.currentLabel}` : item.sublabel}
      </p>
      <p className={clsx("text-2xl font-bold", getMetricColor(value))}>
        {formatPercent(value)}
      </p>
      {item.currentQty !== undefined && item.previousQty !== undefined && (
        <div className="text-[10px] text-gray-400 mt-1 space-y-0.5">
          <div>
            {pd?.previousLabel || "קודם"}: {formatNumber(item.previousQty)}
          </div>
          <div>
            {pd?.currentLabel || "נוכחי"}: {formatNumber(item.currentQty)}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// RETURNS CARD (different layout)
// ============================================

function ReturnsCard({ metrics }: { metrics: StoreMetrics | undefined }) {
  const current = metrics?.returns_pct_current ?? 0;
  const previous = metrics?.returns_pct_previous ?? 0;
  const change = metrics?.returns_change ?? 0;

  return (
    <div className="bg-white rounded-xl p-4 text-center shadow-sm border">
      <p className="text-xs text-gray-500 mb-1">החזרות %</p>
      <p
        className={clsx(
          "text-2xl font-bold",
          current > 15 ? "text-red-600" : "text-green-600",
        )}
      >
        {current.toFixed(1)}%
      </p>
      <p className="text-xs text-gray-400 mt-1">לפני: {previous.toFixed(1)}%</p>
      <p
        className={clsx(
          "text-xs mt-0.5",
          change > 0 ? "text-red-500" : "text-green-500",
        )}
      >
        שינוי: {change > 0 ? "+" : ""}
        {change.toFixed(1)}%
      </p>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function StoreMetricsCards({
  metrics,
  metricsPeriodInfo,
}: StoreMetricsCardsProps) {
  const periodDetails = metricsPeriodInfo?.metricsMonths?.length
    ? (() => {
        const sorted = [...metricsPeriodInfo.metricsMonths].sort();
        const fmt = (arr: string[]) => {
          if (arr.length === 0) return "";
          const m = (k: string) => {
            const mm = parseInt(k.slice(4), 10);
            const yy = k.slice(2, 4);
            const names = [
              "ינו",
              "פבר",
              "מרץ",
              "אפר",
              "מאי",
              "יונ",
              "יול",
              "אוג",
              "ספט",
              "אוק",
              "נוב",
              "דצמ",
            ];
            return `${names[mm - 1]}${yy}`;
          };
          return `${m(arr[0]!)}-${m(arr[arr.length - 1]!)}`;
        };
        const getPrevYear = (months: string[]) =>
          months.map((m) => `${parseInt(m.slice(0, 4), 10) - 1}${m.slice(4)}`);
        return {
          metric_12v12: {
            currentLabel: fmt(sorted.slice(-12)),
            previousLabel: fmt(sorted.slice(-24, -12)),
          },
          metric_6v6: {
            currentLabel: fmt(sorted.slice(-6)),
            previousLabel: fmt(sorted.slice(-12, -6)),
          },
          metric_3v3: {
            currentLabel: fmt(sorted.slice(-3)),
            previousLabel: fmt(getPrevYear(sorted.slice(-3))),
          },
          metric_2v2: {
            currentLabel: fmt(sorted.slice(-2)),
            previousLabel: fmt(sorted.slice(-4, -2)),
          },
        };
      })()
    : null;

  const cards: MetricCardItem[] = [
    {
      key: "metric_12v12",
      label: "12v12",
      sublabel: "שנתי",
      value: metrics?.metric_12v12,
      currentQty: metrics?.qty_12v12_current,
      previousQty: metrics?.qty_12v12_previous,
      periodDetails: periodDetails?.metric_12v12,
    },
    {
      key: "metric_6v6",
      label: "6v6",
      sublabel: "חצי שנה",
      value: metrics?.metric_6v6,
      currentQty: metrics?.qty_6v6_current,
      previousQty: metrics?.qty_6v6_previous,
      periodDetails: periodDetails?.metric_6v6,
    },
    {
      key: "metric_3v3",
      label: "3v3",
      sublabel: "רבעון",
      value: metrics?.metric_3v3,
      currentQty: metrics?.qty_3v3_current,
      previousQty: metrics?.qty_3v3_previous,
      periodDetails: periodDetails?.metric_3v3,
    },
    {
      key: "metric_2v2",
      label: "2v2",
      sublabel: "2 חודשים",
      value: metrics?.metric_2v2,
      currentQty: metrics?.qty_2v2_current,
      previousQty: metrics?.qty_2v2_previous,
      periodDetails: periodDetails?.metric_2v2,
    },
    {
      key: "peak",
      label: "מרחק מפיק",
      sublabel: `שיא: ${formatNumber(metrics?.peak_value)} | נוכחי: ${formatNumber(metrics?.current_value)}`,
      value: metrics?.metric_peak_distance,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => (
        <MetricCardSingle key={card.key} item={card} />
      ))}
      <ReturnsCard metrics={metrics} />
    </div>
  );
}
