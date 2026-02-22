"use client";

import { useMemo } from "react";
import {
  generateMetricsPeriodLabels,
  formatPeriodRange,
  type MetricsPeriodLabels,
} from "@/lib/periodUtils";

// ============================================
// TYPES
// ============================================

export interface MetricsPeriodInfo {
  metricsPeriodStart: string;
  metricsPeriodEnd: string;
  metricsMonths: string[];
}

interface MetricsPeriodLabelProps {
  /** Type of metric to display label for */
  metric: "yearly" | "halfYear" | "quarter" | "twoMonths";
  /** Period info from metadata */
  periodInfo: MetricsPeriodInfo | null;
  /** Show full label or just date range */
  showMetricName?: boolean;
  /** Custom class name */
  className?: string;
}

interface MetricsHeaderConfig {
  key: string;
  label: string;
  subLabel: string;
}

// ============================================
// COMPONENT: Single Metric Label
// ============================================

/**
 * Display dynamic label for a single metric
 * Example: "שנתי (ינו 25 - פבר 24)"
 */
export function MetricsPeriodLabel({
  metric,
  periodInfo,
  showMetricName = true,
  className = "",
}: MetricsPeriodLabelProps) {
  const labels = useMemo(() => {
    if (!periodInfo?.metricsMonths?.length) return null;
    return generateMetricsPeriodLabels(periodInfo.metricsMonths);
  }, [periodInfo]);

  if (!labels) return null;

  const metricNames: Record<string, string> = {
    yearly: "שנתי",
    halfYear: "6 חודשים",
    quarter: "3 חודשים",
    twoMonths: "2 חודשים",
  };

  const periodLabel = labels[metric];
  const metricName = metricNames[metric];

  if (showMetricName) {
    return (
      <span className={className}>
        {metricName}
        {periodLabel && (
          <span className="text-xs text-gray-500 mr-1">({periodLabel})</span>
        )}
      </span>
    );
  }

  return <span className={className}>{periodLabel}</span>;
}

// ============================================
// HOOK: Get all metric headers
// ============================================

/**
 * Hook to generate all metrics headers with dynamic labels
 * Use this in tables to get consistent header labels
 */
export function useMetricsHeaders(
  periodInfo: MetricsPeriodInfo | null,
): MetricsHeaderConfig[] {
  return useMemo(() => {
    const labels = periodInfo?.metricsMonths?.length
      ? generateMetricsPeriodLabels(periodInfo.metricsMonths)
      : null;

    return [
      {
        key: "metric_12v12",
        label: labels?.yearly || "12v12",
        subLabel: "",
      },
      {
        key: "metric_6v6",
        label: labels?.halfYear || "6v6",
        subLabel: "",
      },
      {
        key: "metric_3v3",
        label: labels?.quarter || "3v3",
        subLabel: "",
      },
      {
        key: "metric_2v2",
        label: labels?.twoMonths || "2v2",
        subLabel: "",
      },
    ];
  }, [periodInfo]);
}

// ============================================
// COMPONENT: Full Period Range Display
// ============================================

interface PeriodRangeDisplayProps {
  periodInfo: MetricsPeriodInfo | null;
  className?: string;
}

/**
 * Display full period range
 * Example: "פבר 24 - ינו 26 (24 חודשים)"
 */
export function PeriodRangeDisplay({
  periodInfo,
  className = "",
}: PeriodRangeDisplayProps) {
  if (!periodInfo) return null;

  const range = formatPeriodRange(
    periodInfo.metricsPeriodStart,
    periodInfo.metricsPeriodEnd,
  );
  const monthCount = periodInfo.metricsMonths?.length || 0;

  return (
    <span className={className}>
      {range}
      {monthCount > 0 && (
        <span className="text-gray-500 mr-1">({monthCount} חודשים)</span>
      )}
    </span>
  );
}

// ============================================
// COMPONENT: Metrics Table Header
// ============================================

interface MetricsTableHeaderProps {
  periodInfo: MetricsPeriodInfo | null;
  showSubLabels?: boolean;
}

/**
 * Pre-built table header row for metrics columns
 */
export function MetricsTableHeaderRow({
  periodInfo,
  showSubLabels = true,
}: MetricsTableHeaderProps) {
  const headers = useMetricsHeaders(periodInfo);

  return (
    <>
      {headers.map((header) => (
        <th key={header.key} className="px-4 py-3 text-right">
          <div className="flex flex-col">
            <span className="font-medium">{header.label}</span>
            {showSubLabels && (
              <span className="text-xs font-normal text-gray-500">
                {header.subLabel}
              </span>
            )}
          </div>
        </th>
      ))}
    </>
  );
}

// ============================================
// HOOK: Get detailed periods for cells
// ============================================

export interface MetricPeriodDetails {
  currentLabel: string; // "ינו25-דצמ25"
  previousLabel: string; // "ינו24-דצמ24"
}

export interface MetricsPeriodDetailsMap {
  metric_12v12: MetricPeriodDetails;
  metric_6v6: MetricPeriodDetails;
  metric_3v3: MetricPeriodDetails;
  metric_2v2: MetricPeriodDetails;
}

/**
 * Hook to get detailed period labels for each metric
 * Used in table cells to show period info under percentages
 */
export function useMetricsPeriodDetails(
  periodInfo: MetricsPeriodInfo | null,
): MetricsPeriodDetailsMap | null {
  return useMemo(() => {
    if (!periodInfo?.metricsMonths?.length) return null;

    const sorted = [...periodInfo.metricsMonths].sort();

    // Helper to format period range (short)
    const formatRange = (periods: string[]): string => {
      if (periods.length === 0) return "";
      const start = periods[0];
      const end = periods[periods.length - 1];

      if (!start || !end) return "";

      const startMonth = parseInt(start.slice(4), 10);
      const startYear = start.slice(2, 4);
      const endMonth = parseInt(end.slice(4), 10);
      const endYear = end.slice(2, 4);

      const monthNames = [
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

      return `${monthNames[startMonth - 1]}${startYear}-${monthNames[endMonth - 1]}${endYear}`;
    };

    // Helper to get same months previous year
    const getSameMonthsPrevYear = (months: string[]): string[] => {
      return months.map((m) => {
        const year = parseInt(m.slice(0, 4), 10);
        const month = m.slice(4);
        return `${year - 1}${month}`;
      });
    };

    // 12v12
    const last12 = sorted.slice(-12);
    const prev12 = sorted.slice(-24, -12);

    // 6v6
    const last6 = sorted.slice(-6);
    const prev6 = sorted.slice(-12, -6);

    // 3v3 (same months previous year)
    const last3 = sorted.slice(-3);
    const same3PrevYear = getSameMonthsPrevYear(last3);

    // 2v2
    const last2 = sorted.slice(-2);
    const prev2 = sorted.slice(-4, -2);

    return {
      metric_12v12: {
        currentLabel: formatRange(last12),
        previousLabel: formatRange(prev12),
      },
      metric_6v6: {
        currentLabel: formatRange(last6),
        previousLabel: formatRange(prev6),
      },
      metric_3v3: {
        currentLabel: formatRange(last3),
        previousLabel: formatRange(same3PrevYear),
      },
      metric_2v2: {
        currentLabel: formatRange(last2),
        previousLabel: formatRange(prev2),
      },
    };
  }, [periodInfo]);
}

// ============================================
// EXPORTS
// ============================================

export type { MetricsPeriodLabels };
