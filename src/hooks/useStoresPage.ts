"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  getStores,
  getCities,
  getNetworks,
  getAgents,
  getDrivers,
} from "@/lib/dataLoader";
import {
  DEFAULT_MONTH_SELECTION,
  calcMonthlyTotals,
  type MonthSelection,
} from "@/components/ui";
import {
  STATUS_DISPLAY_LONG,
  STATUS_DISPLAY_SHORT,
  type StatusLong,
  type StatusShort,
  type StoreWithStatus,
} from "@/types/data";

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
  | "returns_pct_last6"
  | "qty_2025"
  | "sales_2025"
  | "gross"
  | "qty"
  | "returns"
  | "sales";

export interface StoresFilters {
  cities?: string[];
  networks?: string[];
  agents?: string[];
  drivers?: string[];
  status_long?: StatusLong[];
  status_short?: StatusShort[];
  minQty?: number;
}

export interface TotalsData {
  count: number;
  metric_12v12: number;
  metric_6v6: number;
  metric_3v3: number;
  metric_2v2: number;
  metric_peak_distance: number;
  returns_pct_last6: number;
  main: {
    qty: number;
    sales: number;
    gross: number;
    returns: number;
    returnsPct: number;
  };
  comp: {
    qty: number;
    sales: number;
    gross: number;
    returns: number;
    returnsPct: number;
  } | null;
}

// ============================================
// HOOK
// ============================================

export function useStoresPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // ============================================
  // STATE
  // ============================================

  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("metrics");
  const [monthSelection, setMonthSelection] = useState<MonthSelection>(
    DEFAULT_MONTH_SELECTION,
  );
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<number>>(
    new Set(),
  );
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<StoresFilters>(() => {
    const statusLong = searchParams.get("status_long");
    return statusLong ? { status_long: [statusLong as StatusLong] } : {};
  });

  // ============================================
  // STATIC DATA
  // ============================================

  const allStores = useMemo(() => getStores(), []);
  const cities = useMemo(() => getCities(), []);
  const networks = useMemo(() => getNetworks(), []);
  const agents = useMemo(() => getAgents(), []);
  const drivers = useMemo(() => getDrivers(), []);
  const statusLongOptions = Object.keys(STATUS_DISPLAY_LONG) as StatusLong[];
  const statusShortOptions = Object.keys(STATUS_DISPLAY_SHORT) as StatusShort[];

  // ============================================
  // FILTERED STORES
  // ============================================

  const filteredStores = useMemo(() => {
    return allStores.filter((store) => {
      if (search) {
        const s = search.toLowerCase();
        if (
          !store.name.toLowerCase().includes(s) &&
          !store.city.toLowerCase().includes(s)
        )
          return false;
      }
      if (filters.cities?.length && !filters.cities.includes(store.city))
        return false;
      if (
        filters.networks?.length &&
        !filters.networks.includes(store.network || "")
      )
        return false;
      if (filters.agents?.length && !filters.agents.includes(store.agent))
        return false;
      if (filters.drivers?.length && !filters.drivers.includes(store.driver))
        return false;
      if (
        filters.status_long?.length &&
        !filters.status_long.includes(store.status_long)
      )
        return false;
      if (
        filters.status_short?.length &&
        !filters.status_short.includes(store.status_short)
      )
        return false;
      if (filters.minQty && store.qty_2025 < filters.minQty) return false;
      return true;
    });
  }, [allStores, filters, search]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const activeFiltersCount = Object.values(filters).filter((v) =>
    Array.isArray(v) ? v.length > 0 : Boolean(v),
  ).length;

  const isCompare =
    monthSelection.isCompareMode && monthSelection.compareMonths.length > 0;
  const displayMode = monthSelection.compareDisplayMode;

  // ============================================
  // TOTALS
  // ============================================

  const totals = useMemo((): TotalsData | null => {
    if (filteredStores.length === 0) return null;
    const count = filteredStores.length;
    let mainQty = 0,
      mainSales = 0,
      mainGross = 0,
      mainReturns = 0;
    let compQty = 0,
      compSales = 0,
      compGross = 0,
      compReturns = 0;

    filteredStores.forEach((store) => {
      const main = calcMonthlyTotals(store, monthSelection.months);
      mainQty += main.qty;
      mainSales += main.sales;
      mainGross += main.gross;
      mainReturns += main.returns;
      if (isCompare) {
        const comp = calcMonthlyTotals(store, monthSelection.compareMonths);
        compQty += comp.qty;
        compSales += comp.sales;
        compGross += comp.gross;
        compReturns += comp.returns;
      }
    });

    return {
      count,
      metric_12v12:
        filteredStores.reduce((s, x) => s + x.metric_12v12, 0) / count,
      metric_6v6: filteredStores.reduce((s, x) => s + x.metric_6v6, 0) / count,
      metric_3v3: filteredStores.reduce((s, x) => s + x.metric_3v3, 0) / count,
      metric_2v2: filteredStores.reduce((s, x) => s + x.metric_2v2, 0) / count,
      metric_peak_distance:
        filteredStores.reduce((s, x) => s + x.metric_peak_distance, 0) / count,
      returns_pct_last6:
        filteredStores.reduce((s, x) => s + x.returns_pct_last6, 0) / count,
      main: {
        qty: mainQty,
        sales: mainSales,
        gross: mainGross,
        returns: mainReturns,
        returnsPct: mainGross > 0 ? (mainReturns / mainGross) * 100 : 0,
      },
      comp: isCompare
        ? {
            qty: compQty,
            sales: compSales,
            gross: compGross,
            returns: compReturns,
            returnsPct: compGross > 0 ? (compReturns / compGross) * 100 : 0,
          }
        : null,
    };
  }, [filteredStores, monthSelection, isCompare]);

  // ============================================
  // SORTING
  // ============================================

  const getSortValue = useCallback(
    (store: StoreWithStatus, key: SortKey): number | string => {
      if (viewMode === "data") {
        const data = calcMonthlyTotals(store, monthSelection.months);
        switch (key) {
          case "gross":
            return data.gross;
          case "qty":
            return data.qty;
          case "returns":
            return data.returns;
          case "sales":
            return data.sales;
        }
      }
      switch (key) {
        case "name":
          return store.name;
        case "city":
          return store.city;
        case "status_long":
          return store.status_long;
        case "metric_12v12":
          return store.metric_12v12;
        case "metric_3v3":
          return store.metric_3v3;
        case "metric_6v6":
          return store.metric_6v6;
        case "metric_2v2":
          return store.metric_2v2;
        case "status_short":
          return store.status_short;
        case "metric_peak_distance":
          return store.metric_peak_distance;
        case "returns_pct_last6":
          return store.returns_pct_last6;
        case "qty_2025":
          return store.qty_2025;
        case "sales_2025":
          return store.sales_2025;
        default:
          return 0;
      }
    },
    [viewMode, monthSelection.months],
  );

  const sortedStores = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredStores;
    return [...filteredStores].sort((a, b) => {
      const aVal = getSortValue(a, sortKey);
      const bVal = getSortValue(b, sortKey);
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal), "he");
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [filteredStores, sortKey, sortDirection, getSortValue]);

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
      (pageSize === Infinity ? sortedStores.length : pageSize),
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
    setFilters({});
  }, []);

  const updateFilter = useCallback(
    <K extends keyof StoresFilters>(key: K, value: StoresFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const toggleStoreSelection = useCallback((storeId: number) => {
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

  // ============================================
  // HELPERS
  // ============================================

  const calcChange = useCallback((a: number, b: number) => {
    return b === 0 ? 0 : ((a - b) / b) * 100;
  }, []);

  const getMonthsLabel = useCallback((months: string[]) => {
    if (months.length <= 2)
      return months
        .map((m) => {
          const month = parseInt(m.slice(4));
          const year = m.slice(2, 4);
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
          return `${names[month - 1]} ${year}`;
        })
        .join(", ");
    return `${months.length} חודשים`;
  }, []);

  // ============================================
  // RETURN
  // ============================================

  return {
    // State
    search,
    setSearch,
    showFilters,
    viewMode,
    setViewMode,
    monthSelection,
    setMonthSelection,
    selectedStoreIds,
    sortKey,
    sortDirection,
    pageSize,
    currentPage,
    setCurrentPage,
    filters,

    // Static data
    cities,
    networks,
    agents,
    drivers,
    statusLongOptions,
    statusShortOptions,

    // Computed
    filteredStores,
    sortedStores,
    paginatedStores,
    activeFiltersCount,
    isCompare,
    displayMode,
    totals,
    totalPages,

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

    // Helpers
    calcChange,
    getMonthsLabel,
  };
}
