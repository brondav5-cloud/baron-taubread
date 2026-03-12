"use client";

import { useState, useMemo, useCallback } from "react";
import type { ComparisonStore, CompareFilters } from "@/types/comparison";

const EMPTY_FILTERS: CompareFilters = {
  cities: [],
  networks: [],
  agents: [],
  drivers: [],
  driver_groups: [],
  status_long: [],
  status_short: [],
};

interface DbFilters {
  cities?: string[];
  networks?: string[];
  agents?: string[];
  drivers?: string[];
}

export function useComparisonFilters(
  allStores: ComparisonStore[],
  dbFilters: DbFilters | null | undefined,
) {
  const [filters, setFilters] = useState<CompareFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(true);

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

  const activeFiltersCount = useMemo(
    () => Object.values(filters).filter((arr) => arr.length > 0).length,
    [filters],
  );

  const cities = useMemo(() => {
    const citySet = new Set<string>();
    filteredStores.forEach((s) => {
      if (s.city) citySet.add(s.city);
    });
    return Array.from(citySet).sort((a, b) => a.localeCompare(b, "he"));
  }, [filteredStores]);

  const updateFilter = useCallback(
    <K extends keyof CompareFilters>(key: K, value: CompareFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  return {
    filters,
    filteredStores,
    filterOptions,
    activeFiltersCount,
    cities,
    showFilters,
    setShowFilters,
    updateFilter,
    clearFilters,
  };
}
