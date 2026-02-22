"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseData } from "./useSupabaseData";
import { usePeriodSelector } from "./usePeriodSelector";
import { getDeliveriesByPeriod } from "@/lib/db/deliveries.repo";
import * as driverGroupsRepo from "@/lib/db/driverGroups.repo";
import { generateMetricsPeriodLabels } from "@/lib/periodUtils";
import type { DbStore, MonthlyData } from "@/types/supabase";

// ============================================
// TYPES
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

function getFilterOptions(
  stores: DbStore[],
  key: keyof Pick<DbStore, "city" | "network" | "driver" | "agent">,
): string[] {
  const values = new Set<string>();
  stores.forEach((store) => {
    const value = store[key];
    if (value) values.add(value);
  });
  return Array.from(values).sort((a, b) => a.localeCompare(b, "he"));
}

function getStatusOptions(
  stores: DbStore[],
  key: "status_long" | "status_short",
): string[] {
  const values = new Set<string>();
  stores.forEach((store) => {
    const value = store.metrics?.[key];
    if (value) values.add(value);
  });
  return Array.from(values);
}

// ============================================
// HOOK
// ============================================

export function useStoresPageSupabase() {
  const router = useRouter();
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;

  // Supabase data
  const {
    stores: allStores,
    metadata,
    periodLabel,
    filters: dbFilters,
    isLoading,
    error,
    refetch,
  } = useSupabaseData();

  // Period selector
  const periodSelector = usePeriodSelector({
    metadata,
    defaultType: "lastHalf",
  });

  // ============================================
  // LOCAL STATE
  // ============================================

  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("metrics");
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(
    new Set(),
  );
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<StoresFilters>({
    cities: [],
    networks: [],
    agents: [],
    drivers: [],
    driver_groups: [],
    status_long: [],
    status_short: [],
  });
  const [deliveriesByStore, setDeliveriesByStore] = useState<
    Map<number, number>
  >(new Map());
  const [deliveriesByStoreCompare, setDeliveriesByStoreCompare] = useState<
    Map<number, number>
  >(new Map());
  const [driverToGroup, setDriverToGroup] = useState<Map<string, string>>(
    new Map(),
  );

  // Fetch driver groups for driver_group filter
  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      driverGroupsRepo.getDriverGroups(companyId),
      driverGroupsRepo.getIndividualDrivers(companyId),
    ]).then(([groups, individuals]) => {
      const map = new Map<string, string>();
      groups.forEach((g) => {
        g.driverNames.forEach((d) => map.set(d.trim(), g.name));
      });
      individuals.forEach((i) => map.set(i.driverName.trim(), i.driverName));
      setDriverToGroup(map);
    });
  }, [companyId]);

  // Fetch deliveries by period (from store_deliveries)
  const deliveriesPrimaryMonthsKey = periodSelector.primary.months.join(",");
  const deliveriesCompareMonthsKey = periodSelector.compare.months.join(",");

  useEffect(() => {
    if (!companyId || periodSelector.primary.months.length === 0) {
      setDeliveriesByStore(new Map());
      return;
    }
    getDeliveriesByPeriod(companyId, periodSelector.primary.months).then(
      (rows) => {
        const map = new Map<number, number>();
        rows.forEach((r) => {
          const curr = map.get(r.store_external_id) ?? 0;
          map.set(r.store_external_id, curr + r.deliveries_count);
        });
        setDeliveriesByStore(map);
      },
    );
  }, [companyId, periodSelector.primary.months, deliveriesPrimaryMonthsKey]);

  useEffect(() => {
    if (
      !companyId ||
      !periodSelector.compare.enabled ||
      periodSelector.compare.months.length === 0
    ) {
      setDeliveriesByStoreCompare(new Map());
      return;
    }
    getDeliveriesByPeriod(companyId, periodSelector.compare.months).then(
      (rows) => {
        const map = new Map<number, number>();
        rows.forEach((r) => {
          const curr = map.get(r.store_external_id) ?? 0;
          map.set(r.store_external_id, curr + r.deliveries_count);
        });
        setDeliveriesByStoreCompare(map);
      },
    );
  }, [
    companyId,
    periodSelector.compare.enabled,
    periodSelector.compare.months,
    deliveriesCompareMonthsKey,
  ]);

  // ============================================
  // FILTER OPTIONS (from data)
  // ============================================

  const filterOptions = useMemo(() => {
    const driverGroupSet = new Set<string>();
    allStores.forEach((store) => {
      const driver = store.driver?.trim();
      if (driver && driverToGroup.has(driver)) {
        driverGroupSet.add(driverToGroup.get(driver)!);
      }
    });
    return {
      cities: dbFilters?.cities || getFilterOptions(allStores, "city"),
      networks: dbFilters?.networks || getFilterOptions(allStores, "network"),
      agents: dbFilters?.agents || getFilterOptions(allStores, "agent"),
      drivers: dbFilters?.drivers || getFilterOptions(allStores, "driver"),
      driverGroups: Array.from(driverGroupSet).sort((a, b) =>
        a.localeCompare(b, "he"),
      ),
      statusLong: getStatusOptions(allStores, "status_long"),
      statusShort: getStatusOptions(allStores, "status_short"),
    };
  }, [allStores, dbFilters, driverToGroup]);

  // ============================================
  // FILTERED STORES
  // ============================================

  const filteredStores = useMemo(() => {
    return allStores.filter((store) => {
      // Search
      if (search) {
        const s = search.toLowerCase();
        const matchesName = store.name.toLowerCase().includes(s);
        const matchesCity = store.city?.toLowerCase().includes(s);
        if (!matchesName && !matchesCity) return false;
      }

      // Filters
      if (filters.cities.length && !filters.cities.includes(store.city || ""))
        return false;
      if (
        filters.networks.length &&
        !filters.networks.includes(store.network || "")
      )
        return false;
      if (filters.agents.length && !filters.agents.includes(store.agent || ""))
        return false;
      if (
        filters.drivers.length &&
        !filters.drivers.includes(store.driver || "")
      )
        return false;
      if (filters.driver_groups.length) {
        const storeDriverGroup = store.driver
          ? driverToGroup.get(store.driver.trim())
          : null;
        if (
          !storeDriverGroup ||
          !filters.driver_groups.includes(storeDriverGroup)
        )
          return false;
      }
      if (
        filters.status_long.length &&
        !filters.status_long.includes(store.metrics?.status_long || "")
      )
        return false;
      if (
        filters.status_short.length &&
        !filters.status_short.includes(store.metrics?.status_short || "")
      )
        return false;

      return true;
    });
  }, [allStores, filters, search, driverToGroup]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter((arr) => arr.length > 0).length;
  }, [filters]);

  // ============================================
  // STORE DATA WITH PERIOD CALCULATIONS
  // ============================================

  // Create stable keys for dependencies
  const primaryMonthsKey = periodSelector.primary.months.join(",");
  const compareMonthsKey = periodSelector.compare.months.join(",");
  const compareEnabled = periodSelector.compare.enabled;

  const storesWithPeriodData = useMemo(() => {
    const selectedMonths = periodSelector.primary.months;
    const compareMonths = compareEnabled ? periodSelector.compare.months : [];

    return filteredStores.map((store) => {
      // Calculate totals for selected period
      const qty = sumMonthlyData(store.monthly_qty || {}, selectedMonths);
      const sales = sumMonthlyData(store.monthly_sales || {}, selectedMonths);
      const gross = sumMonthlyData(store.monthly_gross || {}, selectedMonths);
      const returns = sumMonthlyData(
        store.monthly_returns || {},
        selectedMonths,
      );
      const returnsPct = gross > 0 ? (returns / gross) * 100 : 0;
      const deliveries = deliveriesByStore.get(store.external_id) ?? 0;

      // Calculate compare period if enabled
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filteredStores,
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

  // ============================================
  // SORTING
  // ============================================

  const getSortValue = useCallback(
    (
      store: (typeof storesWithPeriodData)[0],
      key: SortKey,
    ): number | string => {
      switch (key) {
        case "name":
          return store.name;
        case "city":
          return store.city || "";
        case "status_long":
          return store.metrics?.status_long || "";
        case "status_short":
          return store.metrics?.status_short || "";
        case "metric_12v12":
          return store.metrics?.metric_12v12 || 0;
        case "metric_6v6":
          return store.metrics?.metric_6v6 || 0;
        case "metric_3v3":
          return store.metrics?.metric_3v3 || 0;
        case "metric_2v2":
          return store.metrics?.metric_2v2 || 0;
        case "metric_peak_distance":
          return store.metrics?.metric_peak_distance || 0;
        case "returns_pct_current":
          return store.metrics?.returns_pct_current || 0;
        case "qty":
          return store.periodData.qty;
        case "sales":
          return store.periodData.sales;
        case "gross":
          return store.periodData.gross;
        case "returns":
          return store.periodData.returns;
        case "deliveries":
          return store.periodData.deliveries ?? 0;
        default:
          return 0;
      }
    },
    [],
  );

  const sortedStores = useMemo(() => {
    if (!sortKey || !sortDirection) return storesWithPeriodData;

    return [...storesWithPeriodData].sort((a, b) => {
      const aVal = getSortValue(a, sortKey);
      const bVal = getSortValue(b, sortKey);

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      const cmp = String(aVal).localeCompare(String(bVal), "he");
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [storesWithPeriodData, sortKey, sortDirection, getSortValue]);

  // ============================================
  // PAGINATION
  // ============================================

  const paginatedStores = useMemo(() => {
    if (pageSize === Infinity) return sortedStores;
    const start = (currentPage - 1) * pageSize;
    return sortedStores.slice(start, start + pageSize);
  }, [sortedStores, currentPage, pageSize]);

  const totalPages = Math.ceil(
    sortedStores.length /
      (pageSize === Infinity ? sortedStores.length || 1 : pageSize),
  );

  // ============================================
  // ACTIONS
  // ============================================

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey !== key) {
        setSortKey(key);
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection("asc");
      } else if (sortDirection === "asc") {
        setSortKey(null);
        setSortDirection(null);
      } else {
        setSortDirection("desc");
      }
      setCurrentPage(1);
    },
    [sortKey, sortDirection],
  );

  const toggleFilters = useCallback(() => {
    setShowFilters((prev) => !prev);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      cities: [],
      networks: [],
      agents: [],
      drivers: [],
      driver_groups: [],
      status_long: [],
      status_short: [],
    });
  }, []);

  const updateFilter = useCallback(
    <K extends keyof StoresFilters>(key: K, value: StoresFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setCurrentPage(1);
    },
    [],
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
    setSelectedStoreIds(new Set(paginatedStores.map((s) => s.id)));
  }, [paginatedStores]);

  const clearStoreSelection = useCallback(() => {
    setSelectedStoreIds(new Set());
  }, []);

  const goToComparePage = useCallback(() => {
    const ids = Array.from(selectedStoreIds).join(",");
    router.push(`/dashboard/compare?stores=${ids}`);
  }, [selectedStoreIds, router]);

  const changePageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const metricsPeriodLabels = useMemo(() => {
    const months = periodSelector.metricsPeriodInfo?.metricsMonths;
    return months?.length ? generateMetricsPeriodLabels(months) : null;
  }, [periodSelector.metricsPeriodInfo?.metricsMonths]);

  // ============================================
  // RETURN
  // ============================================

  return {
    // Loading state
    isLoading,
    error,
    refetch,
    periodLabel,

    // Period selector (for SmartPeriodSelector component)
    periodSelector,
    metricsPeriodInfo: periodSelector.metricsPeriodInfo,
    metricsPeriodLabels,

    // State
    search,
    setSearch,
    showFilters,
    viewMode,
    setViewMode,
    selectedStoreIds,
    sortKey,
    sortDirection,
    pageSize,
    currentPage,
    setCurrentPage,
    filters,

    // Filter options
    filterOptions,

    // Computed
    stores: sortedStores,
    paginatedStores,
    filteredCount: filteredStores.length,
    totalCount: allStores.length,
    activeFiltersCount,
    totals,
    totalPages,
    isCompare: periodSelector.compare.enabled,

    // Actions
    handleSort,
    toggleFilters,
    clearFilters,
    updateFilter,
    toggleStoreSelection,
    selectAllStores,
    clearStoreSelection,
    goToComparePage,
    changePageSize,
  };
}

export type UseStoresPageSupabaseReturn = ReturnType<
  typeof useStoresPageSupabase
>;
