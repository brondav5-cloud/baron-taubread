"use client";

import { useMemo, useState, useEffect } from "react";
import { useSupabaseData } from "./useSupabaseData";
import { useDashboardMonthly } from "./useDashboardMonthly";
import { useDashboardStoreStats } from "./useDashboardStoreStats";

// ============================================
// CONSTANTS
// ============================================

export const DASHBOARD_CHART_COLORS = [
  "#10b981",
  "#84cc16",
  "#6b7280",
  "#f59e0b",
  "#ef4444",
];

// ============================================
// TYPES (exported for use in components)
// ============================================

export interface MonthlyDataPoint {
  month: string;
  periodKey: string;
  grossCurrent: number;
  grossPrevious: number;
  qtyCurrent: number;
  qtyPrevious: number;
  returnsCurrent: number;
  returnsPrevious: number;
  salesCurrent: number;
  salesPrevious: number;
  returnsPctCurrent: number;
  returnsPctPrevious: number;
  holiday: string;
}

export interface TotalsData {
  grossCurrent: number;
  grossPrevious: number;
  qtyCurrent: number;
  qtyPrevious: number;
  returnsCurrent: number;
  returnsPrevious: number;
  salesCurrent: number;
  salesPrevious: number;
  returnsPctCurrent: number;
  returnsPctPrevious: number;
  qtyChange: number;
  salesChange: number;
  currentYear: number;
  previousYear: number;
  previousYearPeriodLabel?: string;
  currentYearPeriodLabel?: string;
}

export interface HalfYearData {
  h1Qty: number;
  h2Qty: number;
  h1Sales: number;
  h2Sales: number;
  qtyChange: number;
  salesChange: number;
  currentYear: number;
  h1PeriodLabel: string;
  h2PeriodLabel: string;
}

export interface CitySalesData {
  city: string;
  qty: number;
  sales: number;
  stores: number;
}

export interface StatusDistributionItem {
  name: string;
  value: number;
  status: string;
}

export interface ChartDataPoint {
  month: string;
  gross: number;
  qty: number;
  returns: number;
}

export interface TopStore {
  id: number;
  name: string;
  city: string;
  metric_12v12: number;
  sales: number;
  status: string;
}

// ============================================
// MAIN HOOK (orchestrator)
// ============================================

export function useDashboardSupabase() {
  const { stores, products, metadata, periodLabel, isLoading, error } =
    useSupabaseData();

  const currentYear = metadata?.current_year || new Date().getFullYear();
  const previousYear = metadata?.previous_year || currentYear - 1;

  const availableYears = useMemo((): number[] => {
    if (!metadata?.months_list || metadata.months_list.length === 0) {
      return [currentYear, previousYear];
    }
    const yearsSet = new Set<number>();
    metadata.months_list.forEach((period) => {
      const year = parseInt(period.slice(0, 4), 10);
      if (!isNaN(year)) yearsSet.add(year);
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [metadata?.months_list, currentYear, previousYear]);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [hideHolidays, setHideHolidays] = useState(false);

  useEffect(() => {
    if (metadata?.current_year) {
      setSelectedYear(metadata.current_year);
    }
  }, [metadata?.current_year]);

  // Sub-hooks
  const monthly = useDashboardMonthly(
    stores,
    metadata?.months_list,
    selectedYear,
    currentYear,
    previousYear,
  );

  const storeStats = useDashboardStoreStats(stores, products.length);

  return {
    isLoading,
    error,
    selectedYear,
    setSelectedYear,
    hideHolidays,
    setHideHolidays,
    currentYear,
    previousYear,
    availableYears,
    periodLabel,
    stores,
    products,
    stats: storeStats.stats,
    topStores: storeStats.topStores,
    bottomStores: storeStats.bottomStores,
    alertStores: storeStats.alertStores,
    statusDistribution: storeStats.statusDistribution,
    monthlyData: monthly.monthlyData,
    tableMonthlyData: monthly.tableMonthlyData,
    totals: monthly.totals,
    halfYearData: monthly.halfYearData,
    citySales: storeStats.citySales,
    chartData: monthly.chartData,
  };
}
