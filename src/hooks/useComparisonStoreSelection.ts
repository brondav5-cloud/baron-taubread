"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import type { ComparisonStore, CityStats } from "@/types/comparison";

export function useComparisonStoreSelection(
  allStores: ComparisonStore[],
  filteredStores: ComparisonStore[],
  searchParams: ReadonlyURLSearchParams,
) {
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedCriteriaType, setSelectedCriteriaType] = useState<
    "city" | "agent" | "network" | "driver" | "driver_group"
  >("city");
  const [selectedCriteriaValue, setSelectedCriteriaValue] =
    useState<string>("");
  const [selectedStores, setSelectedStores] = useState<ComparisonStore[]>([]);
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const [viewMode, setViewMode] = useState<"metrics" | "data">("metrics");
  const [storeSearch, setStoreSearch] = useState("");
  const [urlProcessed, setUrlProcessed] = useState(false);

  // ============================================
  // URL PARAMS & LOCALSTORAGE
  // ============================================

  useEffect(() => {
    if (urlProcessed || allStores.length === 0) return;

    const savedStoreIds = localStorage.getItem("compareStoreIds");
    if (savedStoreIds) {
      try {
        const ids = JSON.parse(savedStoreIds) as (string | number)[];
        const stores = ids
          .map((id) => {
            if (typeof id === "string")
              return allStores.find((s) => s.id === id);
            return allStores.find((s) => s.external_id === id);
          })
          .filter((s): s is ComparisonStore => s !== undefined && s !== null);
        if (stores.length > 0) {
          setSelectedStores(stores);
          localStorage.removeItem("compareStoreIds");
        }
      } catch {
        localStorage.removeItem("compareStoreIds");
      }
      setUrlProcessed(true);
      return;
    }

    const storeIdsParam = searchParams.get("stores");
    const cityParam = searchParams.get("city");

    if (storeIdsParam) {
      const parts = storeIdsParam.split(",");
      const stores = parts
        .map((part) => {
          const trimmed = part.trim();
          if (!trimmed) return null;
          const num = parseInt(trimmed, 10);
          if (!isNaN(num)) {
            return allStores.find((s) => s.external_id === num);
          }
          return allStores.find((s) => s.id === trimmed);
        })
        .filter((s): s is ComparisonStore => s !== undefined && s !== null);
      if (stores.length > 0) {
        setSelectedStores(stores);
      }
      setUrlProcessed(true);
      return;
    }

    if (cityParam) {
      setSelectedCity(cityParam);
      setSelectedCriteriaType("city");
      setSelectedCriteriaValue(cityParam);
      setUrlProcessed(true);
      return;
    }

    const timer = setTimeout(() => setUrlProcessed(true), 100);
    return () => clearTimeout(timer);
  }, [searchParams, allStores, urlProcessed]);

  // ============================================
  // COMPUTED
  // ============================================

  const searchResults = useMemo(() => {
    if (!storeSearch || storeSearch.length < 2) return [];
    const search = storeSearch.toLowerCase();
    return filteredStores
      .filter(
        (s) =>
          (s.name.toLowerCase().includes(search) ||
            s.city.toLowerCase().includes(search)) &&
          !selectedStores.find((ss) => ss.id === s.id),
      )
      .slice(0, 10);
  }, [storeSearch, filteredStores, selectedStores]);

  const cityStores = useMemo(() => {
    if (!selectedCity) return [];
    return filteredStores
      .filter((s) => s.city === selectedCity)
      .sort((a, b) => b.metric_12v12 - a.metric_12v12);
  }, [selectedCity, filteredStores]);

  const criteriaValueOptions = useMemo(() => {
    const getFromStores = (
      key: "city" | "network" | "agent" | "driver" | "driver_group",
    ) => {
      const values = new Set<string>();
      filteredStores.forEach((s) => {
        const v = key === "driver_group" ? s.driver_group : s[key];
        if (v) values.add(v);
      });
      return Array.from(values).sort((a, b) => a.localeCompare(b, "he"));
    };
    switch (selectedCriteriaType) {
      case "city":
        return getFromStores("city");
      case "agent":
        return getFromStores("agent");
      case "network":
        return getFromStores("network");
      case "driver":
        return getFromStores("driver");
      case "driver_group":
        return getFromStores("driver_group");
      default:
        return [];
    }
  }, [selectedCriteriaType, filteredStores]);

  const criteriaStores = useMemo(() => {
    if (!selectedCriteriaValue) return [];
    return filteredStores
      .filter((store) => {
        switch (selectedCriteriaType) {
          case "city":
            return store.city === selectedCriteriaValue;
          case "agent":
            return store.agent === selectedCriteriaValue;
          case "network":
            return store.network === selectedCriteriaValue;
          case "driver":
            return store.driver === selectedCriteriaValue;
          case "driver_group":
            return store.driver_group === selectedCriteriaValue;
          default:
            return false;
        }
      })
      .sort((a, b) => b.metric_12v12 - a.metric_12v12);
  }, [selectedCriteriaType, selectedCriteriaValue, filteredStores]);

  const criteriaStats = useMemo((): CityStats | null => {
    if (criteriaStores.length === 0) return null;
    const count = criteriaStores.length;
    return {
      avg12v12:
        criteriaStores.reduce((sum, s) => sum + s.metric_12v12, 0) / count,
      avg6v6: criteriaStores.reduce((sum, s) => sum + s.metric_6v6, 0) / count,
      avg2v2: criteriaStores.reduce((sum, s) => sum + s.metric_2v2, 0) / count,
      avgReturns:
        criteriaStores.reduce((sum, s) => sum + s.returns_pct_last6, 0) / count,
      totalSales: criteriaStores.reduce(
        (sum, s) => sum + s.sales_current_year,
        0,
      ),
      count,
    };
  }, [criteriaStores]);

  const cityStats = useMemo((): CityStats | null => {
    if (cityStores.length === 0) return null;
    const count = cityStores.length;
    return {
      avg12v12: cityStores.reduce((sum, s) => sum + s.metric_12v12, 0) / count,
      avg6v6: cityStores.reduce((sum, s) => sum + s.metric_6v6, 0) / count,
      avg2v2: cityStores.reduce((sum, s) => sum + s.metric_2v2, 0) / count,
      avgReturns:
        cityStores.reduce((sum, s) => sum + s.returns_pct_last6, 0) / count,
      totalSales: cityStores.reduce((sum, s) => sum + s.sales_current_year, 0),
      count,
    };
  }, [cityStores]);

  const criteriaListTitle = useMemo(() => {
    if (!selectedCriteriaValue) return "";
    const labels: Record<string, string> = {
      city: "עיר",
      agent: "סוכן",
      network: "רשת",
      driver: "נהג",
      driver_group: "קבוצת נהגים",
    };
    const label = labels[selectedCriteriaType] || selectedCriteriaType;
    return `חנויות לפי ${label} "${selectedCriteriaValue}"`;
  }, [selectedCriteriaType, selectedCriteriaValue]);

  // ============================================
  // ACTIONS
  // ============================================

  const addStore = useCallback((store: ComparisonStore) => {
    setSelectedStores((prev) => {
      if (prev.find((s) => s.id === store.id)) return prev;
      return [...prev, store];
    });
    setShowStoreSelector(false);
  }, []);

  const removeStore = useCallback((storeId: string) => {
    setSelectedStores((prev) => prev.filter((s) => s.id !== storeId));
  }, []);

  const clearAllStores = useCallback(() => setSelectedStores([]), []);

  const addAllCityStores = useCallback(
    (cityStoresList: ComparisonStore[]) => {
      const toAdd = cityStoresList.filter(
        (s) => !selectedStores.find((ss) => ss.id === s.id),
      );
      setSelectedStores((prev) => [...prev, ...toAdd]);
    },
    [selectedStores],
  );

  const addAllCriteriaStores = useCallback(
    (criteriaStoresList: ComparisonStore[]) => {
      const toAdd = criteriaStoresList.filter(
        (s) => !selectedStores.find((ss) => ss.id === s.id),
      );
      setSelectedStores((prev) => [...prev, ...toAdd]);
    },
    [selectedStores],
  );

  const addAllFilteredStores = useCallback(
    (filteredList: ComparisonStore[]) => {
      const toAdd = filteredList.filter(
        (s) => !selectedStores.find((ss) => ss.id === s.id),
      );
      setSelectedStores((prev) => [...prev, ...toAdd]);
      setShowStoreSelector(false);
    },
    [selectedStores],
  );

  return {
    selectedCity,
    setSelectedCity,
    selectedCriteriaType,
    setSelectedCriteriaType,
    selectedCriteriaValue,
    setSelectedCriteriaValue,
    selectedStores,
    showStoreSelector,
    setShowStoreSelector,
    viewMode,
    setViewMode,
    storeSearch,
    setStoreSearch,
    searchResults,
    cityStores,
    cityStats,
    criteriaValueOptions,
    criteriaStores,
    criteriaStats,
    criteriaListTitle,
    addStore,
    removeStore,
    clearAllStores,
    addAllCityStores,
    addAllCriteriaStores,
    addAllFilteredStores,
  };
}
