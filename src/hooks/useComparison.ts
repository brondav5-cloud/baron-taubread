"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  getCities,
  getStoresByCity,
  getStores,
  getStoreById,
} from "@/lib/dataLoader";
import {
  DEFAULT_MONTH_SELECTION,
  calcMonthlyTotals,
  type MonthSelection,
} from "@/components/ui";
import type { StoreWithStatus } from "@/types/data";

// ============================================
// TYPES
// ============================================

export interface CityStats {
  avg12v12: number;
  avg6v6: number;
  avg2v2: number;
  avgReturns: number;
  totalSales: number;
  count: number;
}

export interface ComparisonDataPoint {
  metric: string;
  [key: string]: string | number;
}

// ============================================
// CONSTANTS
// ============================================

export const CHART_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#84cc16",
  "#06b6d4",
];

// ============================================
// HOOK
// ============================================

export function useComparison() {
  const searchParams = useSearchParams();

  // Static data
  const cities = useMemo(() => getCities(), []);
  const allStores = useMemo(() => getStores(), []);

  // State
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedStores, setSelectedStores] = useState<StoreWithStatus[]>([]);
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const [viewMode, setViewMode] = useState<"metrics" | "data">("metrics");
  const [monthSelection, setMonthSelection] = useState<MonthSelection>(
    DEFAULT_MONTH_SELECTION,
  );
  const [storeSearch, setStoreSearch] = useState("");
  const [urlProcessed, setUrlProcessed] = useState(false);

  // ============================================
  // URL PARAMS PROCESSING
  // ============================================

  useEffect(() => {
    if (urlProcessed) return;

    // Check localStorage first (from "Compare Network" button)
    const savedStoreIds = localStorage.getItem("compareStoreIds");
    if (savedStoreIds) {
      try {
        const ids = JSON.parse(savedStoreIds) as number[];
        const stores = ids
          .map((id) => getStoreById(id))
          .filter((s): s is StoreWithStatus => s !== undefined && s !== null);
        if (stores.length > 0) {
          setSelectedStores(stores);
          localStorage.removeItem("compareStoreIds"); // Clear after use
          setUrlProcessed(true);
          return;
        }
      } catch {
        localStorage.removeItem("compareStoreIds");
      }
    }

    const storeIds = searchParams.get("stores");
    const cityParam = searchParams.get("city");

    if (storeIds) {
      const ids = storeIds
        .split(",")
        .map((id) => parseInt(id))
        .filter((id) => !isNaN(id));
      const stores = ids
        .map((id) => getStoreById(id))
        .filter((s): s is StoreWithStatus => s !== undefined && s !== null);
      if (stores.length > 0) {
        setSelectedStores(stores);
      }
      setUrlProcessed(true);
      return;
    }

    if (cityParam) {
      setSelectedCity(cityParam);
      setUrlProcessed(true);
      return;
    }

    const timer = setTimeout(() => {
      setUrlProcessed(true);
    }, 100);
    return () => clearTimeout(timer);
  }, [searchParams, urlProcessed]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  // Search results for adding stores
  const searchResults = useMemo(() => {
    if (!storeSearch || storeSearch.length < 2) return [];
    const search = storeSearch.toLowerCase();
    return allStores
      .filter(
        (s) =>
          (s.name.toLowerCase().includes(search) ||
            s.city.toLowerCase().includes(search)) &&
          !selectedStores.find((ss) => ss.id === s.id),
      )
      .slice(0, 10);
  }, [storeSearch, allStores, selectedStores]);

  // City stores
  const cityStores = useMemo(() => {
    if (!selectedCity) return [];
    return getStoresByCity(selectedCity).sort(
      (a, b) => b.metric_12v12 - a.metric_12v12,
    );
  }, [selectedCity]);

  // City stats
  const cityStats = useMemo((): CityStats | null => {
    if (cityStores.length === 0) return null;

    const count = cityStores.length;
    const avg12v12 =
      cityStores.reduce((sum, s) => sum + s.metric_12v12, 0) / count;
    const avg6v6 = cityStores.reduce((sum, s) => sum + s.metric_6v6, 0) / count;
    const avg2v2 = cityStores.reduce((sum, s) => sum + s.metric_2v2, 0) / count;
    const avgReturns =
      cityStores.reduce((sum, s) => sum + s.returns_pct_last6, 0) / count;
    const totalSales = cityStores.reduce((sum, s) => sum + s.sales_2025, 0);

    return { avg12v12, avg6v6, avg2v2, avgReturns, totalSales, count };
  }, [cityStores]);

  // Comparison data for bar chart
  const comparisonData = useMemo((): ComparisonDataPoint[] => {
    if (selectedStores.length === 0) return [];

    return [
      {
        metric: "12v12",
        ...Object.fromEntries(
          selectedStores.map((s, i) => [`store${i}`, s.metric_12v12]),
        ),
      },
      {
        metric: "6v6",
        ...Object.fromEntries(
          selectedStores.map((s, i) => [`store${i}`, s.metric_6v6]),
        ),
      },
      {
        metric: "3v3",
        ...Object.fromEntries(
          selectedStores.map((s, i) => [`store${i}`, s.metric_3v3]),
        ),
      },
      {
        metric: "2v2",
        ...Object.fromEntries(
          selectedStores.map((s, i) => [`store${i}`, s.metric_2v2]),
        ),
      },
    ];
  }, [selectedStores]);

  // Radar data
  const radarData = useMemo((): ComparisonDataPoint[] => {
    if (selectedStores.length === 0) return [];

    const normalize = (value: number, min: number, max: number) => {
      return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
    };

    const metrics = ["12v12", "6v6", "2v2", "שיא", "החזרות"];

    return metrics.map((metric) => {
      const row: ComparisonDataPoint = { metric };
      selectedStores.forEach((store, i) => {
        switch (metric) {
          case "12v12":
            row[`store${i}`] = normalize(store.metric_12v12, -50, 50);
            break;
          case "6v6":
            row[`store${i}`] = normalize(store.metric_6v6, -50, 50);
            break;
          case "2v2":
            row[`store${i}`] = normalize(store.metric_2v2, -50, 50);
            break;
          case "שיא":
            row[`store${i}`] = normalize(-store.metric_peak_distance, -100, 0);
            break;
          case "החזרות":
            row[`store${i}`] = normalize(-store.returns_pct_last6, -40, 0);
            break;
        }
      });
      return row;
    });
  }, [selectedStores]);

  // ============================================
  // ACTIONS
  // ============================================

  const addStore = useCallback(
    (store: StoreWithStatus) => {
      if (!selectedStores.find((s) => s.id === store.id)) {
        setSelectedStores((prev) => [...prev, store]);
      }
      setShowStoreSelector(false);
    },
    [selectedStores],
  );

  const removeStore = useCallback((storeId: number) => {
    setSelectedStores((prev) => prev.filter((s) => s.id !== storeId));
  }, []);

  const clearAllStores = useCallback(() => {
    setSelectedStores([]);
  }, []);

  const addAllCityStores = useCallback(() => {
    const storesToAdd = cityStores.filter(
      (s) => !selectedStores.find((ss) => ss.id === s.id),
    );
    setSelectedStores((prev) => [...prev, ...storesToAdd]);
  }, [cityStores, selectedStores]);

  const clearSearch = useCallback(() => {
    setStoreSearch("");
  }, []);

  // ============================================
  // HELPERS
  // ============================================

  const getPeriodLabel = useCallback((months: string[]) => {
    if (months.length === 0) return "";
    if (months.length === 1) return months[0] || "";
    const sorted = [...months].sort();
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (!first || !last) return "";
    return `${first.slice(4, 6)}/${first.slice(2, 4)}-${last.slice(4, 6)}/${last.slice(2, 4)}`;
  }, []);

  const calcStoreTotals = useCallback(
    (store: StoreWithStatus, months: string[]) => {
      return calcMonthlyTotals(store, months);
    },
    [],
  );

  const isStoreSelected = useCallback(
    (storeId: number) => {
      return selectedStores.some((s) => s.id === storeId);
    },
    [selectedStores],
  );

  // ============================================
  // RETURN
  // ============================================

  return {
    // Static data
    cities,
    allStores,

    // State
    selectedCity,
    setSelectedCity,
    selectedStores,
    showStoreSelector,
    setShowStoreSelector,
    viewMode,
    setViewMode,
    monthSelection,
    setMonthSelection,
    storeSearch,
    setStoreSearch,

    // Computed
    searchResults,
    cityStores,
    cityStats,
    comparisonData,
    radarData,

    // Actions
    addStore,
    removeStore,
    clearAllStores,
    addAllCityStores,
    clearSearch,

    // Helpers
    getPeriodLabel,
    calcStoreTotals,
    isStoreSelected,
  };
}
