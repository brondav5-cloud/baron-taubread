"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseData } from "./useSupabaseData";
import { usePeriodSelector } from "./usePeriodSelector";
import { generateMetricsPeriodLabels } from "@/lib/periodUtils";
import { useStoresDeliveries } from "./useStoresDeliveries";
import { useStoresPageFilters } from "./useStoresPageFilters";
import { useExcludedStores } from "./useExcludedStores";
import { useStoresPageSort } from "./useStoresPageSort";
import type { MonthlyData } from "@/types/supabase";

// ============================================
// TYPES (exported for use in components)
// ============================================

export type ViewMode = "metrics" | "data";
export type SortDirection = "asc" | "desc" | null;
export type SortKey =
  | "name"
  | "city"
  | "status_long"
  | "status_short"
  | "metric_12v12"
  | "metric_3v3"
  | "metric_6v6"
  | "metric_2v2"
  | "metric_peak_distance"
  | "returns_pct_current"
  | "qty"
  | "sales"
  | "gross"
  | "returns"
  | "deliveries";

export interface StoresFilters {
  cities: string[];
  networks: string[];
  agents: string[];
  drivers: string[];
  driver_groups: string[];
  status_long: string[];
  status_short: string[];
  minQty?: number;
}

export interface TotalsData {
  count: number;
  metric_12v12: number;
  metric_6v6: number;
  metric_3v3: number;
  metric_2v2: number;
  metric_peak_distance: number;
  returns_pct: number;
  qty: number;
  sales: number;
  gross: number;
  returns: number;
  deliveries: number;
}

// ============================================
// HELPERS
// ============================================

function sumMonthlyData(data: MonthlyData, months: string[]): number {
  return months.reduce((sum, month) => sum + (data[month] || 0), 0);
}

// ============================================
// MAIN HOOK (orchestrator)
// ============================================

export function useStoresPageSupabase() {
  const router = useRouter();
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;

  const {
    stores: allStores,
    metadata,
    periodLabel,
    filters: dbFilters,
    isLoading,
    error,
    refetch,
  } = useSupabaseData();

  const periodSelector = usePeriodSelector({
    metadata,
    defaultType: "lastHalf",
  });

  // Sub-hooks
  const { deliveriesByStore, deliveriesByStoreCompare, driverToGroup } =
    useStoresDeliveries(
      companyId,
      periodSelector.primary.months,
      periodSelector.compare.enabled,
      periodSelector.compare.months,
    );

  const excluded = useExcludedStores(companyId);

  const excludedStores = useMemo(
    () => allStores.filter((s) => excluded.excludedIds.has(s.external_id)),
    [allStores, excluded.excludedIds],
  );

  const filterResult = useStoresPageFilters(
    allStores,
    dbFilters,
    driverToGroup,
    excluded.excludedIds,
  );

  // ============================================
  // STORE DATA WITH PERIOD CALCULATIONS
  // ============================================

  const primaryMonthsKey = periodSelector.primary.months.join(",");
  const compareMonthsKey = periodSelector.compare.months.join(",");
  const compareEnabled = periodSelector.compare.enabled;

  const storesWithPeriodData = useMemo(() => {
    const selectedMonths = primaryMonthsKey ? primaryMonthsKey.split(",") : [];
    const compareMonths =
      compareEnabled && compareMonthsKey ? compareMonthsKey.split(",") : [];

    return filterResult.filteredStores.map((store) => {
      const qty = sumMonthlyData(store.monthly_qty || {}, selectedMonths);
      const sales = sumMonthlyData(store.monthly_sales || {}, selectedMonths);
      const gross = sumMonthlyData(store.monthly_gross || {}, selectedMonths);
      const returns = sumMonthlyData(
        store.monthly_returns || {},
        selectedMonths,
      );
      const returnsPct = gross > 0 ? (returns / gross) * 100 : 0;
      const deliveries = deliveriesByStore.get(store.external_id) ?? 0;

      let compareData = null;
      if (compareMonths.length > 0) {
        const compQty = sumMonthlyData(store.monthly_qty || {}, compareMonths);
        const compSales = sumMonthlyData(
          store.monthly_sales || {},
          compareMonths,
        );
        const compGross = sumMonthlyData(
          store.monthly_gross || {},
          compareMonths,
        );
        const compReturns = sumMonthlyData(
          store.monthly_returns || {},
          compareMonths,
        );
        const compDeliveries =
          deliveriesByStoreCompare.get(store.external_id) ?? 0;
        compareData = {
          qty: compQty,
          sales: compSales,
          gross: compGross,
          returns: compReturns,
          returnsPct: compGross > 0 ? (compReturns / compGross) * 100 : 0,
          deliveries: compDeliveries,
        };
      }

      return {
        ...store,
        periodData: { qty, sales, gross, returns, returnsPct, deliveries },
        compareData,
      };
    });
  }, [
    filterResult.filteredStores,
    primaryMonthsKey,
    compareEnabled,
    compareMonthsKey,
    deliveriesByStore,
    deliveriesByStoreCompare,
  ]);

  // ============================================
  // TOTALS
  // ============================================

  const totals = useMemo((): TotalsData | null => {
    if (storesWithPeriodData.length === 0) return null;
    const count = storesWithPeriodData.length;
    let sumQty = 0,
      sumSales = 0,
      sumGross = 0,
      sumReturns = 0,
      sumDeliveries = 0;
    let sum12v12 = 0,
      sum6v6 = 0,
      sum3v3 = 0,
      sum2v2 = 0,
      sumPeak = 0,
      sumReturnsPct = 0;

    storesWithPeriodData.forEach((store) => {
      sumQty += store.periodData.qty;
      sumSales += store.periodData.sales;
      sumGross += store.periodData.gross;
      sumReturns += store.periodData.returns;
      sumDeliveries += store.periodData.deliveries ?? 0;
      sum12v12 += store.metrics?.metric_12v12 || 0;
      sum6v6 += store.metrics?.metric_6v6 || 0;
      sum3v3 += store.metrics?.metric_3v3 || 0;
      sum2v2 += store.metrics?.metric_2v2 || 0;
      sumPeak += store.metrics?.metric_peak_distance || 0;
      sumReturnsPct += store.metrics?.returns_pct_current || 0;
    });

    return {
      count,
      qty: sumQty,
      sales: sumSales,
      gross: sumGross,
      returns: sumReturns,
      deliveries: sumDeliveries,
      metric_12v12: sum12v12 / count,
      metric_6v6: sum6v6 / count,
      metric_3v3: sum3v3 / count,
      metric_2v2: sum2v2 / count,
      metric_peak_distance: sumPeak / count,
      returns_pct: sumReturnsPct / count,
    };
  }, [storesWithPeriodData]);

  // Sort + pagination
  const sortResult = useStoresPageSort(storesWithPeriodData);

  // ============================================
  // VIEW MODE + STORE SELECTION
  // ============================================

  const [viewMode, setViewMode] = useState<ViewMode>("metrics");
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(
    new Set(),
  );

  const toggleStoreSelection = useCallback((storeId: string) => {
    setSelectedStoreIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(storeId)) {
        newSet.delete(storeId);
      } else {
        newSet.add(storeId);
      }
      return newSet;
    });
  }, []);

  const selectAllStores = useCallback(() => {
    setSelectedStoreIds(new Set(sortResult.paginatedStores.map((s) => s.id)));
  }, [sortResult.paginatedStores]);

  const clearStoreSelection = useCallback(() => {
    setSelectedStoreIds(new Set());
  }, []);

  const goToComparePage = useCallback(() => {
    const ids = Array.from(selectedStoreIds).join(",");
    router.push(`/dashboard/compare?stores=${ids}`);
  }, [selectedStoreIds, router]);

  const metricsPeriodLabels = useMemo(() => {
    const months = periodSelector.metricsPeriodInfo?.metricsMonths;
    return months?.length ? generateMetricsPeriodLabels(months) : null;
  }, [periodSelector.metricsPeriodInfo?.metricsMonths]);

  // ============================================
  // RETURN
  // ============================================

  return {
    isLoading,
    error,
    refetch,
    periodLabel,
    periodSelector,
    metricsPeriodInfo: periodSelector.metricsPeriodInfo,
    metricsPeriodLabels,
    search: filterResult.search,
    setSearch: filterResult.setSearch,
    showFilters: filterResult.showFilters,
    viewMode,
    setViewMode,
    selectedStoreIds,
    sortKey: sortResult.sortKey,
    sortDirection: sortResult.sortDirection,
    pageSize: sortResult.pageSize,
    currentPage: sortResult.currentPage,
    setCurrentPage: sortResult.setCurrentPage,
    filters: filterResult.filters,
    filterOptions: filterResult.filterOptions,
    stores: sortResult.sortedStores,
    paginatedStores: sortResult.paginatedStores,
    filteredCount: filterResult.filteredStores.length,
    totalCount: allStores.length,
    activeFiltersCount: filterResult.activeFiltersCount,
    totals,
    totalPages: sortResult.totalPages,
    isCompare: periodSelector.compare.enabled,
    handleSort: sortResult.handleSort,
    toggleFilters: filterResult.toggleFilters,
    clearFilters: filterResult.clearFilters,
    updateFilter: filterResult.updateFilter,
    toggleStoreSelection,
    selectAllStores,
    clearStoreSelection,
    goToComparePage,
    changePageSize: sortResult.changePageSize,
    allStores,
    excludedIds: excluded.excludedIds,
    excludedCount: excluded.excludedCount,
    excludedStores,
    toggleExclude: excluded.toggleExclude,
    removeExclusion: excluded.removeExclusion,
    clearExclusions: excluded.clearExclusions,
  };
}

export type UseStoresPageSupabaseReturn = ReturnType<
  typeof useStoresPageSupabase
>;
