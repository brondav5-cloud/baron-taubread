import { useMemo, useState, useCallback } from "react";
import { getStoresByCity } from "@/lib/dataLoader";
import {
  calcMonthlyTotals,
  DEFAULT_MONTH_SELECTION,
  type MonthSelection,
} from "@/components/ui";
import type { StoreWithStatus } from "@/types/data";
import type {
  ViewMode,
  SortDirection,
  SortKey,
  Rankings,
  CityTotals,
  StatusCounts,
} from "./types";

export function useCityComparison(currentStore: StoreWithStatus) {
  const [viewMode, setViewMode] = useState<ViewMode>("metrics");
  const [monthSelection, setMonthSelection] = useState<MonthSelection>(
    DEFAULT_MONTH_SELECTION,
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Handle sort
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

  // Get all stores in the same city
  const cityStores = useMemo(() => {
    return getStoresByCity(currentStore.city).sort(
      (a, b) => b.metric_12v12 - a.metric_12v12,
    );
  }, [currentStore.city]);

  // Get sort value for a store
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
        case "status_long":
          return store.status_long;
        case "metric_12v12":
          return store.metric_12v12;
        case "metric_6v6":
          return store.metric_6v6;
        case "metric_2v2":
          return store.metric_2v2;
        case "metric_peak_distance":
          return store.metric_peak_distance;
        case "returns_pct_last6":
          return store.returns_pct_last6;
        default:
          return 0;
      }
    },
    [viewMode, monthSelection.months],
  );

  // Sorted stores
  const sortedCityStores = useMemo(() => {
    if (!sortKey || !sortDirection) return cityStores;
    return [...cityStores].sort((a, b) => {
      const aVal = getSortValue(a, sortKey);
      const bVal = getSortValue(b, sortKey);
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal), "he");
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [cityStores, sortKey, sortDirection, getSortValue]);

  // Paginated stores
  const paginatedCityStores = useMemo(() => {
    if (pageSize === Infinity) return sortedCityStores;
    const start = (currentPage - 1) * pageSize;
    return sortedCityStores.slice(start, start + pageSize);
  }, [sortedCityStores, currentPage, pageSize]);

  const totalPages = Math.ceil(
    sortedCityStores.length /
      (pageSize === Infinity ? sortedCityStores.length : pageSize),
  );

  // Calculate rankings
  const rankings = useMemo((): Rankings => {
    const storesSortedByQty = [...cityStores].sort(
      (a, b) => b.qty_2025 - a.qty_2025,
    );
    const storesSortedBy12v12 = [...cityStores].sort(
      (a, b) => b.metric_12v12 - a.metric_12v12,
    );
    const storesSortedBy2v2 = [...cityStores].sort(
      (a, b) => b.metric_2v2 - a.metric_2v2,
    );

    const qtyRank =
      storesSortedByQty.findIndex((s) => s.id === currentStore.id) + 1;
    const longRank =
      storesSortedBy12v12.findIndex((s) => s.id === currentStore.id) + 1;
    const shortRank =
      storesSortedBy2v2.findIndex((s) => s.id === currentStore.id) + 1;

    const total = cityStores.length;
    const avgQty = cityStores.reduce((s, x) => s + x.qty_2025, 0) / total;
    const avg12v12 = cityStores.reduce((s, x) => s + x.metric_12v12, 0) / total;
    const avg2v2 = cityStores.reduce((s, x) => s + x.metric_2v2, 0) / total;

    return {
      qty: {
        rank: qtyRank,
        percentile: Math.round((1 - (qtyRank - 1) / total) * 100),
        value: currentStore.qty_2025,
        cityAverage: avgQty,
      },
      long: {
        rank: longRank,
        percentile: Math.round((1 - (longRank - 1) / total) * 100),
        value: currentStore.metric_12v12,
        cityAverage: avg12v12,
      },
      short: {
        rank: shortRank,
        percentile: Math.round((1 - (shortRank - 1) / total) * 100),
        value: currentStore.metric_2v2,
        cityAverage: avg2v2,
      },
      total,
    };
  }, [cityStores, currentStore]);

  // City totals
  const cityTotals = useMemo((): CityTotals | null => {
    const count = cityStores.length;
    if (count === 0) return null;

    let mainQty = 0,
      mainSales = 0,
      mainGross = 0,
      mainReturns = 0;

    cityStores.forEach((store) => {
      const main = calcMonthlyTotals(store, monthSelection.months);
      mainQty += main.qty;
      mainSales += main.sales;
      mainGross += main.gross;
      mainReturns += main.returns;
    });

    return {
      count,
      qty: mainQty,
      sales: mainSales,
      gross: mainGross,
      returns: mainReturns,
      returnsPct: mainGross > 0 ? (mainReturns / mainGross) * 100 : 0,
      metric_12v12: cityStores.reduce((s, x) => s + x.metric_12v12, 0) / count,
      metric_6v6: cityStores.reduce((s, x) => s + x.metric_6v6, 0) / count,
      metric_3v3: cityStores.reduce((s, x) => s + x.metric_3v3, 0) / count,
      metric_2v2: cityStores.reduce((s, x) => s + x.metric_2v2, 0) / count,
    };
  }, [cityStores, monthSelection]);

  // Status counts
  const statusCounts = useMemo((): StatusCounts => {
    const counts = { rising: 0, stable: 0, declining: 0 };
    cityStores.forEach((s) => {
      if (s.metric_12v12 >= 10) counts.rising++;
      else if (s.metric_12v12 >= -10) counts.stable++;
      else counts.declining++;
    });
    return counts;
  }, [cityStores]);

  return {
    // State
    viewMode,
    monthSelection,
    isExpanded,
    sortKey,
    sortDirection,
    pageSize,
    currentPage,

    // Setters
    setViewMode,
    setMonthSelection,
    setIsExpanded,
    setPageSize,
    setCurrentPage,
    handleSort,

    // Data
    cityStores,
    sortedCityStores,
    paginatedCityStores,
    totalPages,
    rankings,
    cityTotals,
    statusCounts,
  };
}
