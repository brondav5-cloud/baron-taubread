"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getStores,
  getStoreById,
  getStoreByStringId,
  getTopStores,
  getBottomStores,
  getAlertStores,
  getStoresByCity,
  getStoresByAgent,
  getStoreRankInCity,
  getOverviewStats,
} from "@/lib/dataLoader";
import { filterStores, type StoreFilterOptions } from "@/lib/calculations";

// ============================================
// QUERY KEYS
// ============================================

export const storeKeys = {
  all: ["stores"] as const,
  lists: () => [...storeKeys.all, "list"] as const,
  list: (filters: StoreFilterOptions) =>
    [...storeKeys.lists(), filters] as const,
  details: () => [...storeKeys.all, "detail"] as const,
  detail: (id: number | string) => [...storeKeys.details(), id] as const,
  top: (limit?: number) => [...storeKeys.all, "top", limit] as const,
  bottom: (limit?: number) => [...storeKeys.all, "bottom", limit] as const,
  alerts: () => [...storeKeys.all, "alerts"] as const,
  byCity: (city: string) => [...storeKeys.all, "city", city] as const,
  byAgent: (agent: string) => [...storeKeys.all, "agent", agent] as const,
  stats: () => [...storeKeys.all, "stats"] as const,
};

// ============================================
// BASIC HOOKS
// ============================================

/**
 * Get all stores
 */
export function useStores() {
  return useQuery({
    queryKey: storeKeys.lists(),
    queryFn: () => getStores(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (was cacheTime)
  });
}

/**
 * Get filtered stores
 */
export function useFilteredStores(filters: StoreFilterOptions) {
  const { data: allStores, ...rest } = useStores();

  return {
    ...rest,
    data: allStores ? filterStores(allStores, filters) : [],
  };
}

/**
 * Get store by ID
 */
export function useStore(id: number | string | undefined) {
  return useQuery({
    queryKey: storeKeys.detail(id ?? ""),
    queryFn: () => {
      if (!id) return null;
      return typeof id === "number" ? getStoreById(id) : getStoreByStringId(id);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// SPECIALIZED HOOKS
// ============================================

/**
 * Get top performing stores
 */
export function useTopStores(limit = 10) {
  return useQuery({
    queryKey: storeKeys.top(limit),
    queryFn: () => getTopStores(limit),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get bottom performing stores (for alerts)
 */
export function useBottomStores(limit = 10) {
  return useQuery({
    queryKey: storeKeys.bottom(limit),
    queryFn: () => getBottomStores(limit),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get stores in alert status
 */
export function useAlertStores() {
  return useQuery({
    queryKey: storeKeys.alerts(),
    queryFn: () => getAlertStores(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get stores by city
 */
export function useStoresByCity(city: string) {
  return useQuery({
    queryKey: storeKeys.byCity(city),
    queryFn: () => getStoresByCity(city),
    enabled: !!city,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get stores by agent
 */
export function useStoresByAgent(agent: string) {
  return useQuery({
    queryKey: storeKeys.byAgent(agent),
    queryFn: () => getStoresByAgent(agent),
    enabled: !!agent,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get overview statistics
 */
export function useOverviewStats() {
  return useQuery({
    queryKey: storeKeys.stats(),
    queryFn: () => getOverviewStats(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get store rank in city
 */
export function useStoreRankInCity(storeId: number | undefined) {
  return useQuery({
    queryKey: ["storeRank", storeId],
    queryFn: () => (storeId ? getStoreRankInCity(storeId) : null),
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// PREFETCH HELPERS
// ============================================

/**
 * Prefetch stores data
 */
export function usePrefetchStores() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: storeKeys.lists(),
      queryFn: () => getStores(),
    });
  };
}

/**
 * Prefetch single store
 */
export function usePrefetchStore() {
  const queryClient = useQueryClient();

  return (id: number | string) => {
    queryClient.prefetchQuery({
      queryKey: storeKeys.detail(id),
      queryFn: () =>
        typeof id === "number" ? getStoreById(id) : getStoreByStringId(id),
    });
  };
}

// ============================================
// HELPER HOOKS
// ============================================

/**
 * Get store counts by status
 */
export function useStoreStatusCounts() {
  const { data: stores, isLoading, error } = useStores();

  const counts = stores?.reduce(
    (acc, store) => {
      acc[store.status_long] = (acc[store.status_long] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    counts,
    isLoading,
    error,
    total: stores?.length ?? 0,
  };
}

/**
 * Search stores by name or city
 */
export function useStoreSearch(searchTerm: string) {
  const { data: stores, ...rest } = useStores();

  const results = searchTerm
    ? stores?.filter(
        (store) =>
          store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          store.city.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : stores;

  return {
    ...rest,
    data: results,
  };
}
