"use client";

import { useMemo, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DbStore } from "@/types/supabase";

// ============================================
// CONSTANTS
// ============================================

const DEMO_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

// ============================================
// TYPES
// ============================================

export interface CityRanking {
  rank: number;
  total: number;
  percentile: number;
  value: number;
  cityAverage: number;
}

export interface CityRankings {
  qty: CityRanking;
  metric12v12: CityRanking;
  metric2v2: CityRanking;
}

export interface CityAverages {
  metric_12v12: number;
  metric_6v6: number;
  metric_3v3: number;
  metric_2v2: number;
  returns_pct: number;
}

export type CitySortKey =
  | "name"
  | "metric_12v12"
  | "metric_6v6"
  | "metric_3v3"
  | "metric_2v2"
  | "returns_pct";
export type CitySortDir = "asc" | "desc";

// ============================================
// HELPERS
// ============================================

function calcRanking(
  stores: DbStore[],
  currentId: string,
  getValue: (s: DbStore) => number,
): CityRanking {
  const sorted = [...stores].sort((a, b) => getValue(b) - getValue(a));
  const rank = sorted.findIndex((s) => s.id === currentId) + 1;
  const total = stores.length;
  const current = stores.find((s) => s.id === currentId);
  const value = current ? getValue(current) : 0;
  const avg =
    total > 0 ? stores.reduce((sum, s) => sum + getValue(s), 0) / total : 0;

  return {
    rank,
    total,
    percentile: total > 0 ? Math.round((1 - (rank - 1) / total) * 100) : 0,
    value,
    cityAverage: avg,
  };
}

// ============================================
// HOOK
// ============================================

export function useStoreCityComparison(store: DbStore | null) {
  const [cityStores, setCityStores] = useState<DbStore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortKey, setSortKey] = useState<CitySortKey>("metric_12v12");
  const [sortDir, setSortDir] = useState<CitySortDir>("desc");

  // Fetch stores in same city
  useEffect(() => {
    if (!store?.city) return;

    const city = store.city;

    async function fetchCityStores() {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("stores")
          .select("*")
          .eq("company_id", DEMO_COMPANY_ID)
          .eq("city", city)
          .order("name");

        if (!error && data) {
          setCityStores(data);
        }
      } catch (err) {
        console.error("Error fetching city stores:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCityStores();
  }, [store?.city]);

  // Sort handler
  const handleSort = (key: CitySortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // Get metric value from store
  const getMetricValue = (s: DbStore, key: CitySortKey): number | string => {
    switch (key) {
      case "name":
        return s.name;
      case "metric_12v12":
        return s.metrics?.metric_12v12 ?? 0;
      case "metric_6v6":
        return s.metrics?.metric_6v6 ?? 0;
      case "metric_3v3":
        return s.metrics?.metric_3v3 ?? 0;
      case "metric_2v2":
        return s.metrics?.metric_2v2 ?? 0;
      case "returns_pct":
        return s.metrics?.returns_pct_current ?? 0;
      default:
        return 0;
    }
  };

  // Sorted stores
  const sortedStores = useMemo(() => {
    if (cityStores.length === 0) return [];
    return [...cityStores].sort((a, b) => {
      const aVal = getMetricValue(a, sortKey);
      const bVal = getMetricValue(b, sortKey);

      if (typeof aVal === "string" && typeof bVal === "string") {
        const cmp = aVal.localeCompare(bVal, "he");
        return sortDir === "asc" ? cmp : -cmp;
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityStores, sortKey, sortDir]);

  // Rankings
  const rankings = useMemo((): CityRankings | null => {
    if (!store || cityStores.length === 0) return null;
    return {
      qty: calcRanking(
        cityStores,
        store.id,
        (s) => s.metrics?.qty_current_year ?? 0,
      ),
      metric12v12: calcRanking(
        cityStores,
        store.id,
        (s) => s.metrics?.metric_12v12 ?? 0,
      ),
      metric2v2: calcRanking(
        cityStores,
        store.id,
        (s) => s.metrics?.metric_2v2 ?? 0,
      ),
    };
  }, [cityStores, store]);

  // City averages
  const cityAverages = useMemo((): CityAverages | null => {
    if (cityStores.length === 0) return null;
    const count = cityStores.length;
    return {
      metric_12v12:
        cityStores.reduce((s, x) => s + (x.metrics?.metric_12v12 ?? 0), 0) /
        count,
      metric_6v6:
        cityStores.reduce((s, x) => s + (x.metrics?.metric_6v6 ?? 0), 0) /
        count,
      metric_3v3:
        cityStores.reduce((s, x) => s + (x.metrics?.metric_3v3 ?? 0), 0) /
        count,
      metric_2v2:
        cityStores.reduce((s, x) => s + (x.metrics?.metric_2v2 ?? 0), 0) /
        count,
      returns_pct:
        cityStores.reduce(
          (s, x) => s + (x.metrics?.returns_pct_current ?? 0),
          0,
        ) / count,
    };
  }, [cityStores]);

  return {
    cityStores: sortedStores,
    isLoading,
    rankings,
    cityAverages,
    sortKey,
    sortDir,
    handleSort,
    totalInCity: cityStores.length,
  };
}
