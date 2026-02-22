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

// ============================================
// TYPES - Adapter for comparison components
// ============================================

export interface ComparisonStore {
  id: string;
  external_id: number;
  name: string;
  city: string;
  network: string;
  driver: string;
  driver_group: string | null;
  agent: string;
  metric_12v12: number;
  metric_6v6: number;
  metric_3v3: number;
  metric_2v2: number;
  metric_peak_distance: number;
  returns_pct_last6: number;
  status_long: string;
  status_short: string;
  sales_2025: number;
  monthly_qty: Record<string, number>;
  monthly_sales: Record<string, number>;
  monthly_gross: Record<string, number>;
  monthly_returns: Record<string, number>;
}

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

export interface CompareFilters {
  cities: string[];
  networks: string[];
  agents: string[];
  drivers: string[];
  driver_groups: string[];
  status_long: string[];
  status_short: string[];
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
// HELPERS
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
  const sales2025 = currentYearMonths.reduce(
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
    sales_2025: sales2025,
    monthly_qty: store.monthly_qty || {},
    monthly_sales: store.monthly_sales || {},
    monthly_gross: store.monthly_gross || {},
    monthly_returns: store.monthly_returns || {},
  };
}

// ============================================
// HOOK
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

  // Map to ComparisonStore
  const allStores = useMemo(
    () => dbStores.map((s) => dbStoreToComparisonStore(s, driverToGroup)),
    [dbStores, driverToGroup],
  );

  // State
  const [filters, setFilters] = useState<CompareFilters>({
    cities: [],
    networks: [],
    agents: [],
    drivers: [],
    driver_groups: [],
    status_long: [],
    status_short: [],
  });
  const [showFilters, setShowFilters] = useState(true);
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
  const [monthSelectionState, setMonthSelectionState] =
    useState<MonthSelection>(DEFAULT_MONTH_SELECTION);

  // ============================================
  // URL PARAMS & LOCALSTORAGE
  // ============================================

  useEffect(() => {
    if (urlProcessed || allStores.length === 0) return;

    // Check localStorage (from "Compare Network" etc.)
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

    // URL ?stores=id1,id2 (can be UUID or external_id)
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
  // FILTER OPTIONS (from data)
  // ============================================

  const filterOptions = useMemo(() => {
    const getOptions = (
      key: keyof Pick<ComparisonStore, "city" | "network" | "driver" | "agent">,
    ) => {
      const values = new Set<string>();
      allStores.forEach((s) => {
        const v = s[key];
        if (v) values.add(v);
      });
      return Array.from(values).sort((a, b) => a.localeCompare(b, "he"));
    };
    const getStatusOptions = (key: "status_long" | "status_short") => {
      const values = new Set<string>();
      allStores.forEach((s) => {
        const v = s[key];
        if (v) values.add(v);
      });
      return Array.from(values);
    };
    const driverGroupOptions = Array.from(
      new Set(allStores.map((s) => s.driver_group).filter(Boolean)),
    ) as string[];
    return {
      cities: dbFilters?.cities?.length ? dbFilters.cities : getOptions("city"),
      networks: dbFilters?.networks?.length
        ? dbFilters.networks
        : getOptions("network"),
      agents: dbFilters?.agents?.length
        ? dbFilters.agents
        : getOptions("agent"),
      drivers: dbFilters?.drivers?.length
        ? dbFilters.drivers
        : getOptions("driver"),
      driverGroups: driverGroupOptions.sort((a, b) => a.localeCompare(b, "he")),
      statusLong: getStatusOptions("status_long"),
      statusShort: getStatusOptions("status_short"),
    };
  }, [allStores, dbFilters]);

  // ============================================
  // FILTERED STORES
  // ============================================

  const filteredStores = useMemo(() => {
    return allStores.filter((store) => {
      if (filters.cities.length && !filters.cities.includes(store.city))
        return false;
      if (filters.networks.length && !filters.networks.includes(store.network))
        return false;
      if (filters.agents.length && !filters.agents.includes(store.agent))
        return false;
      if (filters.drivers.length && !filters.drivers.includes(store.driver))
        return false;
      if (
        filters.driver_groups.length &&
        (!store.driver_group ||
          !filters.driver_groups.includes(store.driver_group))
      )
        return false;
      if (
        filters.status_long.length &&
        !filters.status_long.includes(store.status_long)
      )
        return false;
      if (
        filters.status_short.length &&
        !filters.status_short.includes(store.status_short)
      )
        return false;
      return true;
    });
  }, [allStores, filters]);

  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter((arr) => arr.length > 0).length;
  }, [filters]);

  const cities = useMemo(() => {
    const citySet = new Set<string>();
    filteredStores.forEach((s) => {
      if (s.city) citySet.add(s.city);
    });
    return Array.from(citySet).sort((a, b) => a.localeCompare(b, "he"));
  }, [filteredStores]);

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

  // Options for the value dropdown – from filtered stores (respects filter panel)
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

  // Stores matching the selected criterion (single type + value)
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
      totalSales: criteriaStores.reduce((sum, s) => sum + s.sales_2025, 0),
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
      totalSales: cityStores.reduce((sum, s) => sum + s.sales_2025, 0),
      count,
    };
  }, [cityStores]);

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

  const radarData = useMemo((): ComparisonDataPoint[] => {
    if (selectedStores.length === 0) return [];
    const normalize = (value: number, min: number, max: number) =>
      Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
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

  // Month selection for CompareTable - use metadata months
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

  const addAllCityStores = useCallback(() => {
    const toAdd = cityStores.filter(
      (s) => !selectedStores.find((ss) => ss.id === s.id),
    );
    setSelectedStores((prev) => [...prev, ...toAdd]);
  }, [cityStores, selectedStores]);

  const addAllCriteriaStores = useCallback(() => {
    const toAdd = criteriaStores.filter(
      (s) => !selectedStores.find((ss) => ss.id === s.id),
    );
    setSelectedStores((prev) => [...prev, ...toAdd]);
  }, [criteriaStores, selectedStores]);

  const addAllFilteredStores = useCallback(() => {
    const toAdd = filteredStores.filter(
      (s) => !selectedStores.find((ss) => ss.id === s.id),
    );
    setSelectedStores((prev) => [...prev, ...toAdd]);
    setShowStoreSelector(false);
  }, [filteredStores, selectedStores]);

  const updateFilter = useCallback(
    <K extends keyof CompareFilters>(key: K, value: CompareFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

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

  const metricsPeriodLabels = useMemo(() => {
    const months = metadata?.metrics_months || metadata?.months_list || [];
    return months.length ? generateMetricsPeriodLabels(months) : null;
  }, [metadata]);

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

  const setMonthSelection = useCallback(
    (s: MonthSelection) => setMonthSelectionState(s),
    [],
  );

  return {
    isLoading,
    error,
    cities,
    allStores,
    filteredStores,
    filters,
    filterOptions,
    showFilters,
    setShowFilters,
    updateFilter,
    clearFilters,
    activeFiltersCount,
    selectedCity,
    setSelectedCity,
    selectedCriteriaType,
    setSelectedCriteriaType,
    selectedCriteriaValue,
    setSelectedCriteriaValue,
    criteriaValueOptions,
    criteriaStores,
    criteriaStats,
    selectedStores,
    showStoreSelector,
    setShowStoreSelector,
    viewMode,
    setViewMode,
    monthSelection: effectiveMonthSelection,
    setMonthSelection,
    storeSearch,
    setStoreSearch,
    searchResults,
    cityStores,
    cityStats,
    comparisonData,
    radarData,
    addStore,
    removeStore,
    clearAllStores,
    addAllCityStores,
    addAllCriteriaStores,
    addAllFilteredStores,
    getPeriodLabel,
    metricsPeriodLabels,
    periodLabel,
    criteriaListTitle,
  };
}
