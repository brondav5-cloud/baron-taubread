"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStoresAndProducts } from "@/context/StoresAndProductsContext";
import { useProfitabilityData } from "@/hooks/useProfitabilityData";
import type { StatusLong, StatusShort } from "@/types/data";
import type { PeriodSelection } from "@/components/profitability/ProfitabilityPeriodSelector";

// ============================================
// TYPES
// ============================================

export type ProfitType = "gross" | "operating" | "net";
export type SortField =
  | "name"
  | "city"
  | "sales"
  | "qty"
  | "returns"
  | "profit"
  | "margin";
export type SortDirection = "asc" | "desc";

export interface ProfitFilters {
  cities?: string[];
  networks?: string[];
  agents?: string[];
  drivers?: string[];
  status_long?: StatusLong[];
  status_short?: StatusShort[];
  search?: string;
}

export interface StoreProfitRow {
  id: number;
  name: string;
  city: string;
  agent: string;
  driver: string;
  network: string;
  status_long: StatusLong;
  status_short: StatusShort;
  driverGroup: string | null;
  qty: number;
  sales: number;
  returns: number;
  grossProfit: number;
  operatingProfit: number;
  netProfit: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
}

export const PROFIT_TYPE_LABELS: Record<ProfitType, string> = {
  gross: "גולמי",
  operating: "תפעולי",
  net: "סופי",
};

const DEFAULT_PERIOD: PeriodSelection = {
  type: "year",
  year: new Date().getFullYear(),
  months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  compareEnabled: false,
};

// ============================================
// HOOK
// ============================================

export function useProfitabilityPage() {
  const router = useRouter();

  // State
  const [profitType, setProfitType] = useState<ProfitType>("net");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ProfitFilters>({});
  const [sortField, setSortField] = useState<SortField>("profit");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [pageSize, setPageSize] = useState<number | "all">(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [period, setPeriod] = useState<PeriodSelection>(DEFAULT_PERIOD);

  // Data from Supabase
  const { stores: dbStores } = useStoresAndProducts();
  const { costs: productCosts, hasCosts, ctx } = useProfitabilityData();

  // Map DB stores to internal format
  const stores = useMemo(
    () =>
      dbStores.map((s) => ({
        id: s.external_id,
        name: s.name,
        city: s.city || "",
        agent: s.agent || "",
        driver: s.driver || "",
        network: s.network || "",
        status_long: (s.metrics?.status_long || "יציב") as StatusLong,
        status_short: (s.metrics?.status_short || "יציב") as StatusShort,
        qty_current_year: s.metrics?.qty_current_year ?? 0,
        sales_current_year: s.metrics?.sales_current_year ?? 0,
        returns_pct_last6: s.metrics?.returns_pct_current ?? 0,
      })),
    [dbStores],
  );

  // Extract unique filter values from DB stores
  const cities = useMemo(
    () =>
      Array.from(
        new Set(dbStores.map((s) => s.city).filter(Boolean) as string[]),
      ).sort((a, b) => a.localeCompare(b, "he")),
    [dbStores],
  );
  const networks = useMemo(
    () =>
      Array.from(
        new Set(dbStores.map((s) => s.network).filter(Boolean) as string[]),
      ).sort((a, b) => a.localeCompare(b, "he")),
    [dbStores],
  );
  const agents = useMemo(
    () =>
      Array.from(
        new Set(dbStores.map((s) => s.agent).filter(Boolean) as string[]),
      ).sort((a, b) => a.localeCompare(b, "he")),
    [dbStores],
  );
  const drivers = useMemo(
    () =>
      Array.from(
        new Set(dbStores.map((s) => s.driver).filter(Boolean) as string[]),
      ).sort((a, b) => a.localeCompare(b, "he")),
    [dbStores],
  );

  // Calculate avg cost
  const avgProductCost = useMemo(() => {
    const costsWithValue = productCosts.filter((c) => c.totalCost > 0);
    return costsWithValue.length > 0
      ? costsWithValue.reduce((sum, c) => sum + c.totalCost, 0) /
          costsWithValue.length
      : 0;
  }, [productCosts]);

  // All stores with profitability
  const allStoresWithProfit = useMemo((): StoreProfitRow[] => {
    return stores.map((store) => {
      const driverInfo = ctx.getDriverGroup(store.driver);
      const driverGroupName = driverInfo?.name ?? null;

      let grossMargin: number, operatingMargin: number, netMargin: number;

      if (hasCosts && avgProductCost > 0) {
        const avgPrice =
          store.qty_current_year > 0 ? store.sales_current_year / store.qty_current_year : 0;
        const baseMargin =
          avgPrice > 0 ? (avgPrice - avgProductCost) / avgPrice : 0;
        grossMargin = Math.max(-1, Math.min(1, baseMargin * 1.2));
        operatingMargin = grossMargin * 0.85;
        netMargin = operatingMargin * (1 - store.returns_pct_last6 / 200);
      } else {
        grossMargin = 0.45;
        operatingMargin = 0.35;
        netMargin = 0.28 * (1 - store.returns_pct_last6 / 200);
      }

      return {
        id: store.id,
        name: store.name,
        city: store.city,
        agent: store.agent,
        driver: store.driver,
        network: store.network || "",
        status_long: store.status_long,
        status_short: store.status_short,
        driverGroup: driverGroupName,
        qty: store.qty_current_year,
        sales: store.sales_current_year,
        returns: store.returns_pct_last6,
        grossProfit: store.sales_current_year * grossMargin,
        operatingProfit: store.sales_current_year * operatingMargin,
        netProfit: store.sales_current_year * netMargin,
        grossMargin: grossMargin * 100,
        operatingMargin: operatingMargin * 100,
        netMargin: netMargin * 100,
      };
    });
  }, [stores, hasCosts, avgProductCost, ctx]);

  // Filtered stores
  const filteredStores = useMemo(() => {
    return allStoresWithProfit.filter((store) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !store.name.toLowerCase().includes(q) &&
          !store.city.toLowerCase().includes(q) &&
          !store.driver.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (filters.cities?.length && !filters.cities.includes(store.city))
        return false;
      if (filters.networks?.length && !filters.networks.includes(store.network))
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
      return true;
    });
  }, [allStoresWithProfit, filters]);

  // Get profit value
  const getProfit = useCallback(
    (store: StoreProfitRow) => {
      switch (profitType) {
        case "gross":
          return store.grossProfit;
        case "operating":
          return store.operatingProfit;
        case "net":
          return store.netProfit;
      }
    },
    [profitType],
  );

  const getMargin = useCallback(
    (store: StoreProfitRow) => {
      switch (profitType) {
        case "gross":
          return store.grossMargin;
        case "operating":
          return store.operatingMargin;
        case "net":
          return store.netMargin;
      }
    },
    [profitType],
  );

  // Sorted stores
  const sortedStores = useMemo(() => {
    const sorted = [...filteredStores];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name, "he");
          break;
        case "city":
          cmp = a.city.localeCompare(b.city, "he");
          break;
        case "sales":
          cmp = a.sales - b.sales;
          break;
        case "qty":
          cmp = a.qty - b.qty;
          break;
        case "returns":
          cmp = a.returns - b.returns;
          break;
        case "profit":
          cmp = getProfit(a) - getProfit(b);
          break;
        case "margin":
          cmp = getMargin(a) - getMargin(b);
          break;
      }
      return sortDirection === "desc" ? -cmp : cmp;
    });
    return sorted;
  }, [filteredStores, sortField, sortDirection, getProfit, getMargin]);

  // Pagination
  const totalPages =
    pageSize === "all" ? 1 : Math.ceil(sortedStores.length / pageSize);
  const paginatedStores = useMemo(() => {
    if (pageSize === "all") return sortedStores;
    const start = (currentPage - 1) * pageSize;
    return sortedStores.slice(start, start + pageSize);
  }, [sortedStores, currentPage, pageSize]);

  // Totals with avgMargin
  const totals = useMemo(() => {
    const count = filteredStores.length;
    const sales = filteredStores.reduce((sum, s) => sum + s.sales, 0);
    const qty = filteredStores.reduce((sum, s) => sum + s.qty, 0);
    const profit = filteredStores.reduce((sum, s) => sum + getProfit(s), 0);
    const totalMargin = filteredStores.reduce(
      (sum, s) => sum + getMargin(s),
      0,
    );
    const avgMargin = count > 0 ? totalMargin / count : 0;
    const profitableStores = filteredStores.filter(
      (s) => getProfit(s) > 0,
    ).length;

    return { count, sales, qty, profit, avgMargin, profitableStores };
  }, [filteredStores, getProfit, getMargin]);

  // Selected summary
  const selectedSummary = useMemo(() => {
    const selected = filteredStores.filter((s) => selectedIds.has(s.id));
    return {
      count: selected.length,
      sales: selected.reduce((sum, s) => sum + s.sales, 0),
      qty: selected.reduce((sum, s) => sum + s.qty, 0),
      profit: selected.reduce((sum, s) => sum + getProfit(s), 0),
    };
  }, [filteredStores, selectedIds, getProfit]);

  // Actions
  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("desc");
      }
    },
    [sortField],
  );

  const updateFilter = useCallback(
    <K extends keyof ProfitFilters>(key: K, value: ProfitFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setCurrentPage(1);
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setFilters({});
    setCurrentPage(1);
  }, []);

  const toggleSelection = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedIds(new Set(paginatedStores.map((s) => s.id)));
  }, [paginatedStores]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const goToCompare = useCallback(() => {
    if (selectedIds.size >= 2) {
      router.push(
        `/dashboard/compare?stores=${Array.from(selectedIds).join(",")}`,
      );
    }
  }, [selectedIds, router]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.cities?.length) count++;
    if (filters.networks?.length) count++;
    if (filters.agents?.length) count++;
    if (filters.drivers?.length) count++;
    if (filters.status_long?.length) count++;
    if (filters.status_short?.length) count++;
    return count;
  }, [filters]);

  return {
    // State
    profitType,
    setProfitType,
    showFilters,
    setShowFilters: () => setShowFilters((p) => !p),
    filters,
    sortField,
    sortDirection,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    selectedIds,
    period,
    setPeriod,

    // Static
    cities,
    networks,
    agents,
    drivers,
    hasCosts,

    // Computed
    filteredStores,
    sortedStores,
    paginatedStores,
    totals,
    selectedSummary,
    totalPages,
    activeFiltersCount,

    // Actions
    toggleSort,
    updateFilter,
    clearFilters,
    toggleSelection,
    selectAllVisible,
    clearSelection,
    goToCompare,
    getProfit,
    getMargin,
  };
}
