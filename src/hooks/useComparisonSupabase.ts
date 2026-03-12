"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseData } from "./useSupabaseData";
import * as driverGroupsRepo from "@/lib/db/driverGroups.repo";
import {
  DEFAULT_MONTH_SELECTION,
  ALL_MONTHS,
  PRESETS,
  type MonthSelection,
} from "@/components/ui";
import { generateMetricsPeriodLabels } from "@/lib/periodUtils";
import type { DbStore } from "@/types/supabase";

// Re-export types and constants so existing imports keep working
export type {
  ComparisonStore,
  CityStats,
  ComparisonDataPoint,
  CompareFilters,
} from "@/types/comparison";
export { CHART_COLORS } from "@/types/comparison";

import type { ComparisonStore } from "@/types/comparison";
import { useComparisonFilters } from "./useComparisonFilters";
import { useComparisonStoreSelection } from "./useComparisonStoreSelection";
import { useComparisonCharts } from "./useComparisonCharts";

// ============================================
// HELPER
// ============================================

function dbStoreToComparisonStore(
  store: DbStore,
  driverToGroup: Map<string, string>,
): ComparisonStore {
  const m = store.metrics || {};
  const months = store.monthly_sales || {};
  const currentYear = new Date().getFullYear();
  const currentYearMonths = Object.keys(months).filter((k) =>
    k.startsWith(String(currentYear)),
  );
  const salesCurrentYear = currentYearMonths.reduce(
    (sum, k) => sum + (store.monthly_sales?.[k] || 0),
    0,
  );
  const driver = store.driver || "";
  const driver_group = driver ? (driverToGroup.get(driver) ?? null) : null;

  return {
    id: store.id,
    external_id: store.external_id,
    name: store.name,
    city: store.city || "",
    network: store.network || "",
    driver,
    driver_group,
    agent: store.agent || "",
    metric_12v12: m.metric_12v12 ?? 0,
    metric_6v6: m.metric_6v6 ?? 0,
    metric_3v3: m.metric_3v3 ?? 0,
    metric_2v2: m.metric_2v2 ?? 0,
    metric_peak_distance: m.metric_peak_distance ?? 0,
    returns_pct_last6: m.returns_pct_current ?? 0,
    status_long: m.status_long || "יציב",
    status_short: m.status_short || "יציב",
    sales_current_year: salesCurrentYear,
    monthly_qty: store.monthly_qty || {},
    monthly_sales: store.monthly_sales || {},
    monthly_gross: store.monthly_gross || {},
    monthly_returns: store.monthly_returns || {},
  };
}

// ============================================
// MAIN HOOK (orchestrator)
// ============================================

export function useComparisonSupabase() {
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;
  const searchParams = useSearchParams();
  const {
    stores: dbStores,
    filters: dbFilters,
    metadata,
    periodLabel,
    isLoading,
    error,
  } = useSupabaseData();

  // Driver groups for mapping driver → group
  const [driverGroups, setDriverGroups] = useState<
    Array<{ name: string; driverNames: string[] }>
  >([]);
  const [individualDrivers, setIndividualDrivers] = useState<
    Array<{ driverName: string }>
  >([]);

  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      driverGroupsRepo.getDriverGroups(companyId),
      driverGroupsRepo.getIndividualDrivers(companyId),
    ]).then(([groups, individuals]) => {
      setDriverGroups(
        groups.map((g) => ({ name: g.name, driverNames: g.driverNames })),
      );
      setIndividualDrivers(
        individuals.map((i) => ({ driverName: i.driverName })),
      );
    });
  }, [companyId]);

  const driverToGroup = useMemo(() => {
    const map = new Map<string, string>();
    driverGroups.forEach((g) => {
      g.driverNames.forEach((d) => map.set(d.trim(), g.name));
    });
    individualDrivers.forEach((i) =>
      map.set(i.driverName.trim(), i.driverName),
    );
    return map;
  }, [driverGroups, individualDrivers]);

  const allStores = useMemo(
    () => dbStores.map((s) => dbStoreToComparisonStore(s, driverToGroup)),
    [dbStores, driverToGroup],
  );

  // Sub-hooks
  const filterResult = useComparisonFilters(allStores, dbFilters);
  const storeSelection = useComparisonStoreSelection(
    allStores,
    filterResult.filteredStores,
    searchParams,
  );
  const charts = useComparisonCharts(storeSelection.selectedStores);

  // Month selection (depends on metadata)
  const [monthSelectionState, setMonthSelectionState] =
    useState<MonthSelection>(DEFAULT_MONTH_SELECTION);

  const defaultMonths = useMemo(() => {
    const list = metadata?.months_list || [];
    if (list.length === 0)
      return { months: [] as string[], compareMonths: [] as string[] };
    const sorted = [...list].sort();
    const last6 = sorted.slice(-6);
    const prev6 = sorted.slice(-12, -6);
    return { months: last6, compareMonths: prev6 };
  }, [metadata]);

  useEffect(() => {
    if (
      defaultMonths.months.length > 0 &&
      monthSelectionState.months.length === 0
    ) {
      setMonthSelectionState({
        months: defaultMonths.months,
        compareMonths: defaultMonths.compareMonths,
        isCompareMode: defaultMonths.compareMonths.length > 0,
        compareDisplayMode: "rows",
      });
    }
  }, [
    defaultMonths.months,
    defaultMonths.compareMonths,
    monthSelectionState.months.length,
  ]);

  const effectiveMonthSelection =
    monthSelectionState.months.length > 0
      ? monthSelectionState
      : {
          ...DEFAULT_MONTH_SELECTION,
          months: defaultMonths.months,
          compareMonths: defaultMonths.compareMonths,
        };

  const setMonthSelection = useCallback(
    (s: MonthSelection) => setMonthSelectionState(s),
    [],
  );

  const metricsPeriodLabels = useMemo(() => {
    const months = metadata?.metrics_months || metadata?.months_list || [];
    return months.length ? generateMetricsPeriodLabels(months) : null;
  }, [metadata]);

  const getPeriodLabel = useCallback((months: string[]) => {
    if (months.length === 0) return "";
    const sorted = [...months].sort();
    const preset = PRESETS.find(
      (p) =>
        p.months.length === sorted.length &&
        p.months.every((m) => sorted.includes(m)),
    );
    if (preset) return preset.label;
    if (months.length === 1)
      return (
        ALL_MONTHS.find((x) => x.id === months[0])?.label || months[0] || ""
      );
    if (months.length <= 2)
      return (
        months
          .map((id) => ALL_MONTHS.find((x) => x.id === id)?.label)
          .join(", ") || ""
      );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (!first || !last) return "";
    return `${months.length} חודשים (${first.slice(4, 6)}/${first.slice(2, 4)}-${last.slice(4, 6)}/${last.slice(2, 4)})`;
  }, []);

  // Wrap actions to pass current derived data (avoids stale closures in sub-hook)
  const addAllCityStores = useCallback(() => {
    storeSelection.addAllCityStores(storeSelection.cityStores);
  }, [storeSelection]);

  const addAllCriteriaStores = useCallback(() => {
    storeSelection.addAllCriteriaStores(storeSelection.criteriaStores);
  }, [storeSelection]);

  const addAllFilteredStores = useCallback(() => {
    storeSelection.addAllFilteredStores(filterResult.filteredStores);
  }, [storeSelection, filterResult.filteredStores]);

  return {
    isLoading,
    error,
    cities: filterResult.cities,
    allStores,
    filteredStores: filterResult.filteredStores,
    filters: filterResult.filters,
    filterOptions: filterResult.filterOptions,
    showFilters: filterResult.showFilters,
    setShowFilters: filterResult.setShowFilters,
    updateFilter: filterResult.updateFilter,
    clearFilters: filterResult.clearFilters,
    activeFiltersCount: filterResult.activeFiltersCount,
    selectedCity: storeSelection.selectedCity,
    setSelectedCity: storeSelection.setSelectedCity,
    selectedCriteriaType: storeSelection.selectedCriteriaType,
    setSelectedCriteriaType: storeSelection.setSelectedCriteriaType,
    selectedCriteriaValue: storeSelection.selectedCriteriaValue,
    setSelectedCriteriaValue: storeSelection.setSelectedCriteriaValue,
    criteriaValueOptions: storeSelection.criteriaValueOptions,
    criteriaStores: storeSelection.criteriaStores,
    criteriaStats: storeSelection.criteriaStats,
    selectedStores: storeSelection.selectedStores,
    showStoreSelector: storeSelection.showStoreSelector,
    setShowStoreSelector: storeSelection.setShowStoreSelector,
    viewMode: storeSelection.viewMode,
    setViewMode: storeSelection.setViewMode,
    monthSelection: effectiveMonthSelection,
    setMonthSelection,
    storeSearch: storeSelection.storeSearch,
    setStoreSearch: storeSelection.setStoreSearch,
    searchResults: storeSelection.searchResults,
    cityStores: storeSelection.cityStores,
    cityStats: storeSelection.cityStats,
    comparisonData: charts.comparisonData,
    radarData: charts.radarData,
    addStore: storeSelection.addStore,
    removeStore: storeSelection.removeStore,
    clearAllStores: storeSelection.clearAllStores,
    addAllCityStores,
    addAllCriteriaStores,
    addAllFilteredStores,
    getPeriodLabel,
    metricsPeriodLabels,
    periodLabel,
    criteriaListTitle: storeSelection.criteriaListTitle,
  };
}
