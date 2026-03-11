"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseData } from "./useSupabaseData";
import { usePeriodSelector } from "./usePeriodSelector";
import { generateMetricsPeriodLabels } from "@/lib/periodUtils";
import { createClient } from "@/lib/supabase/client";
import { getStoreProductsByCompany } from "@/lib/db/storeProducts.repo";
import * as driverGroupsRepo from "@/lib/db/driverGroups.repo";
import type { DbProduct, MonthlyData } from "@/types/supabase";
// ============================================
// TYPES
// ============================================

export type ViewMode = "metrics" | "data";
export type SortDirection = "asc" | "desc" | null;
export type SortKey =
  | "name"
  | "category"
  | "status_long"
  | "status_short"
  | "metric_12v12"
  | "metric_3v3"
  | "metric_6v6"
  | "metric_2v2"
  | "metric_peak_distance"
  | "returns_pct_current"
  | "qty"
  | "sales";

export interface ProductsFilters {
  categories: string[];
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
}

// ============================================
// HELPERS
// ============================================

function sumMonthlyData(data: MonthlyData, months: string[]): number {
  return months.reduce((sum, month) => sum + (data[month] || 0), 0);
}

// ============================================
// HOOK
// ============================================

export function useProductsPageSupabase() {
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;
  const {
    products: allProducts,
    stores: allStores,
    metadata,
    periodLabel,
    isLoading,
    error,
    refetch,
  } = useSupabaseData();
  const periodSelector = usePeriodSelector({
    metadata,
    defaultType: "lastHalf",
  });

  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("metrics");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<ProductsFilters>({
    categories: [],
    driver_groups: [],
    status_long: [],
    status_short: [],
  });
  const [driverToGroup, setDriverToGroup] = useState<Map<string, string>>(
    new Map(),
  );
  const [storeProductRows, setStoreProductRows] = useState<
    Array<{ store_external_id: number; product_external_id: number }>
  >([]);

  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      driverGroupsRepo.getDriverGroups(companyId),
      driverGroupsRepo.getIndividualDrivers(companyId),
    ]).then(([groups, individuals]) => {
      const map = new Map<string, string>();
      groups.forEach((g) =>
        g.driverNames.forEach((d) => map.set(d.trim(), g.name)),
      );
      individuals.forEach((i) => map.set(i.driverName.trim(), i.driverName));
      setDriverToGroup(map);
    });
  }, [companyId]);

  useEffect(() => {
    if (!companyId || filters.driver_groups.length === 0) {
      setStoreProductRows([]);
      return;
    }
    const supabase = createClient();
    getStoreProductsByCompany(supabase, companyId).then((rows) => {
      setStoreProductRows(
        (rows ?? []).map((r) => ({
          store_external_id: r.store_external_id,
          product_external_id: r.product_external_id,
        })),
      );
    });
  }, [companyId, filters.driver_groups.length]);

  const filterOptions = useMemo(() => {
    const driverGroupSet = new Set<string>();
    allStores.forEach((store) => {
      const driver = store.driver?.trim();
      if (driver && driverToGroup.has(driver))
        driverGroupSet.add(driverToGroup.get(driver)!);
    });
    return {
      categories: Array.from(
        new Set(allProducts.map((p) => p.category).filter(Boolean) as string[]),
      ).sort((a, b) => a.localeCompare(b, "he")),
      driverGroups: Array.from(driverGroupSet).sort((a, b) =>
        a.localeCompare(b, "he"),
      ),
      statusLong: Array.from(
        new Set(
          allProducts
            .map((p) => p.metrics?.status_long)
            .filter(Boolean) as string[],
        ),
      ),
      statusShort: Array.from(
        new Set(
          allProducts
            .map((p) => p.metrics?.status_short)
            .filter(Boolean) as string[],
        ),
      ),
    };
  }, [allProducts, allStores, driverToGroup]);

  const productIdsByDriverGroup = useMemo(() => {
    if (filters.driver_groups.length === 0) return null;
    const storeIdsInGroups = new Set<number>();
    allStores.forEach((store) => {
      const driver = store.driver?.trim();
      if (driver && driverToGroup.has(driver)) {
        const group = driverToGroup.get(driver)!;
        if (filters.driver_groups.includes(group))
          storeIdsInGroups.add(store.external_id);
      }
    });
    const productIds = new Set<number>();
    storeProductRows.forEach((r) => {
      if (storeIdsInGroups.has(r.store_external_id))
        productIds.add(r.product_external_id);
    });
    return productIds;
  }, [filters.driver_groups, allStores, driverToGroup, storeProductRows]);

  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      if (search) {
        const s = search.toLowerCase();
        if (
          !product.name.toLowerCase().includes(s) &&
          !(product.category || "").toLowerCase().includes(s)
        )
          return false;
      }
      if (
        filters.categories.length &&
        !filters.categories.includes(product.category || "")
      )
        return false;
      if (filters.driver_groups.length) {
        if (
          !productIdsByDriverGroup ||
          !productIdsByDriverGroup.has(product.external_id)
        )
          return false;
      }
      if (
        filters.status_long.length &&
        !filters.status_long.includes(product.metrics?.status_long || "")
      )
        return false;
      if (
        filters.status_short.length &&
        !filters.status_short.includes(product.metrics?.status_short || "")
      )
        return false;
      if (
        filters.minQty != null &&
        (product.metrics?.qty_current_year ?? 0) < filters.minQty
      )
        return false;
      return true;
    });
  }, [allProducts, filters, search, productIdsByDriverGroup]);

  const activeFiltersCount = useMemo(() => {
    let c =
      filters.categories.length +
      filters.driver_groups.length +
      filters.status_long.length +
      filters.status_short.length;
    if (filters.minQty != null && filters.minQty > 0) c++;
    return c;
  }, [filters]);

  const compareEnabled = periodSelector.compare.enabled;

  const productsWithPeriodData = useMemo(() => {
    const selectedMonths = periodSelector.primary.months;
    const compareMonths = compareEnabled ? periodSelector.compare.months : [];

    return filteredProducts.map((product: DbProduct) => {
      const qty = sumMonthlyData(product.monthly_qty || {}, selectedMonths);
      const sales = sumMonthlyData(product.monthly_sales || {}, selectedMonths);

      let compareData: { qty: number; sales: number } | null = null;
      if (compareMonths.length > 0) {
        compareData = {
          qty: sumMonthlyData(product.monthly_qty || {}, compareMonths),
          sales: sumMonthlyData(product.monthly_sales || {}, compareMonths),
        };
      }

      return {
        ...product,
        periodData: { qty, sales },
        compareData,
      };
    });
  }, [
    filteredProducts,
    periodSelector.primary.months,
    periodSelector.compare.months,
    compareEnabled,
  ]);

  const totals = useMemo((): TotalsData | null => {
    if (productsWithPeriodData.length === 0) return null;
    const count = productsWithPeriodData.length;
    let sumQty = 0,
      sumSales = 0;
    let sum12 = 0,
      sum6 = 0,
      sum3 = 0,
      sum2 = 0,
      sumPeak = 0,
      sumReturns = 0;

    productsWithPeriodData.forEach((p: (typeof productsWithPeriodData)[0]) => {
      sumQty += p.periodData.qty;
      sumSales += p.periodData.sales;
      sum12 += p.metrics?.metric_12v12 || 0;
      sum6 += p.metrics?.metric_6v6 || 0;
      sum3 += p.metrics?.metric_3v3 || 0;
      sum2 += p.metrics?.metric_2v2 || 0;
      sumPeak +=
        (p.metrics as unknown as Record<string, number>)
          ?.metric_peak_distance || 0;
      sumReturns +=
        (p.metrics as unknown as Record<string, number>)?.returns_pct_current ||
        0;
    });

    return {
      count,
      qty: sumQty,
      sales: sumSales,
      metric_12v12: sum12 / count,
      metric_6v6: sum6 / count,
      metric_3v3: sum3 / count,
      metric_2v2: sum2 / count,
      metric_peak_distance: sumPeak / count,
      returns_pct: sumReturns / count,
    };
  }, [productsWithPeriodData]);

  const getSortValue = useCallback(
    (
      product: (typeof productsWithPeriodData)[0],
      key: SortKey,
    ): number | string => {
      switch (key) {
        case "name":
          return product.name;
        case "category":
          return product.category || "";
        case "status_long":
          return product.metrics?.status_long || "";
        case "status_short":
          return product.metrics?.status_short || "";
        case "metric_12v12":
          return product.metrics?.metric_12v12 || 0;
        case "metric_6v6":
          return product.metrics?.metric_6v6 || 0;
        case "metric_3v3":
          return product.metrics?.metric_3v3 || 0;
        case "metric_2v2":
          return product.metrics?.metric_2v2 || 0;
        case "metric_peak_distance":
          return (
            (product.metrics as unknown as Record<string, number>)
              ?.metric_peak_distance || 0
          );
        case "returns_pct_current":
          return (
            (product.metrics as unknown as Record<string, number>)
              ?.returns_pct_current || 0
          );
        case "qty":
          return product.periodData.qty;
        case "sales":
          return product.periodData.sales;
        default:
          return 0;
      }
    },
    [],
  );

  const sortedProducts = useMemo(() => {
    if (!sortKey || !sortDirection) return productsWithPeriodData;
    return [...productsWithPeriodData].sort((a, b) => {
      const aVal = getSortValue(a, sortKey);
      const bVal = getSortValue(b, sortKey);
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal), "he");
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [productsWithPeriodData, sortKey, sortDirection, getSortValue]);

  const paginatedProducts = useMemo(() => {
    if (pageSize === Infinity) return sortedProducts;
    const start = (currentPage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, currentPage, pageSize]);

  const totalPages = Math.ceil(
    sortedProducts.length /
      (pageSize === Infinity ? sortedProducts.length || 1 : pageSize),
  );

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

  const toggleFilters = useCallback(() => setShowFilters((prev) => !prev), []);
  const clearFilters = useCallback(
    () =>
      setFilters({
        categories: [],
        driver_groups: [],
        status_long: [],
        status_short: [],
        minQty: undefined,
      }),
    [],
  );

  const updateFilter = useCallback(
    <K extends keyof ProductsFilters>(key: K, value: ProductsFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setCurrentPage(1);
    },
    [],
  );

  const changePageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const metricsPeriodLabels = useMemo(() => {
    const months = periodSelector.metricsPeriodInfo?.metricsMonths;
    return months?.length ? generateMetricsPeriodLabels(months) : null;
  }, [periodSelector.metricsPeriodInfo?.metricsMonths]);

  const currentYear = metadata?.current_year ?? new Date().getFullYear();

  return {
    isLoading,
    error,
    refetch,
    currentYear,
    periodLabel,
    periodSelector,
    metricsPeriodInfo: periodSelector.metricsPeriodInfo,
    metricsPeriodLabels,
    search,
    setSearch,
    showFilters,
    viewMode,
    setViewMode,
    sortKey,
    sortDirection,
    pageSize,
    currentPage,
    setCurrentPage,
    filters,
    filterOptions,
    products: sortedProducts,
    paginatedProducts,
    filteredCount: filteredProducts.length,
    totalCount: allProducts.length,
    activeFiltersCount,
    totals,
    totalPages,
    isCompare: periodSelector.compare.enabled,
    handleSort,
    toggleFilters,
    clearFilters,
    updateFilter,
    changePageSize,
  };
}

export type UseProductsPageSupabaseReturn = ReturnType<
  typeof useProductsPageSupabase
>;
