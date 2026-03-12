"use client";

import { useState, useMemo, useCallback } from "react";
import type { DbStore } from "@/types/supabase";
import type { StoresFilters } from "./useStoresPageSupabase";

const EMPTY_FILTERS: StoresFilters = {
  cities: [],
  networks: [],
  agents: [],
  drivers: [],
  driver_groups: [],
  status_long: [],
  status_short: [],
  minQty: undefined,
};

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

interface DbFilters {
  cities?: string[];
  networks?: string[];
  agents?: string[];
  drivers?: string[];
}

export function useStoresPageFilters(
  allStores: DbStore[],
  dbFilters: DbFilters | null | undefined,
  driverToGroup: Map<string, string>,
) {
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<StoresFilters>(EMPTY_FILTERS);

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

  const filteredStores = useMemo(() => {
    return allStores.filter((store) => {
      if (search) {
        const s = search.toLowerCase();
        const matchesName = store.name.toLowerCase().includes(s);
        const matchesCity = store.city?.toLowerCase().includes(s);
        if (!matchesName && !matchesCity) return false;
      }

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
      if (
        filters.minQty != null &&
        filters.minQty > 0 &&
        (store.metrics?.qty_current_year ?? 0) < filters.minQty
      )
        return false;

      return true;
    });
  }, [allStores, filters, search, driverToGroup]);

  const activeFiltersCount = useMemo(() => {
    return Object.entries(filters).filter(([k, v]) =>
      k === "minQty" ? (v as number) > 0 : (v as string[]).length > 0,
    ).length;
  }, [filters]);

  const toggleFilters = useCallback(() => setShowFilters((prev) => !prev), []);

  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const updateFilter = useCallback(
    <K extends keyof StoresFilters>(key: K, value: StoresFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  return {
    search,
    setSearch,
    showFilters,
    filters,
    filterOptions,
    filteredStores,
    activeFiltersCount,
    toggleFilters,
    clearFilters,
    updateFilter,
  };
}
