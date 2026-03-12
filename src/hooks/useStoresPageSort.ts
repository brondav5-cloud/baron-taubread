"use client";

import { useState, useMemo, useCallback } from "react";
import type { SortKey, SortDirection } from "./useStoresPageSupabase";

type StoreWithPeriodData = {
  id: string;
  name: string;
  city?: string | null;
  metrics?: {
    status_long?: string;
    status_short?: string;
    metric_12v12?: number;
    metric_6v6?: number;
    metric_3v3?: number;
    metric_2v2?: number;
    metric_peak_distance?: number;
    returns_pct_current?: number;
  } | null;
  periodData: {
    qty: number;
    sales: number;
    gross: number;
    returns: number;
    deliveries: number;
  };
};

export function useStoresPageSort<T extends StoreWithPeriodData>(
  storesWithPeriodData: T[],
) {
  const [sortKey, setSortKey] = useState<SortKey | null>("qty");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState(1);

  const getSortValue = useCallback(
    (store: T, key: SortKey): number | string => {
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

  const paginatedStores = useMemo(() => {
    if (pageSize === Infinity) return sortedStores;
    const start = (currentPage - 1) * pageSize;
    return sortedStores.slice(start, start + pageSize);
  }, [sortedStores, currentPage, pageSize]);

  const totalPages = Math.ceil(
    sortedStores.length /
      (pageSize === Infinity ? sortedStores.length || 1 : pageSize),
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

  const changePageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  return {
    sortKey,
    sortDirection,
    pageSize,
    currentPage,
    setCurrentPage,
    sortedStores,
    paginatedStores,
    totalPages,
    handleSort,
    changePageSize,
  };
}
