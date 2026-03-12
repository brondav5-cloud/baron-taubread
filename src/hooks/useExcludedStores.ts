"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_PREFIX = "excluded_stores";

export function useExcludedStores(companyId: string | null) {
  const storageKey = companyId
    ? `${STORAGE_PREFIX}_${companyId}`
    : STORAGE_PREFIX;

  const [excludedIds, setExcludedIds] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set<number>();
    try {
      const stored = localStorage.getItem(storageKey);
      return stored
        ? new Set<number>(JSON.parse(stored) as number[])
        : new Set<number>();
    } catch {
      return new Set<number>();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(excludedIds)));
    } catch {
      // Ignore storage errors
    }
  }, [excludedIds, storageKey]);

  const toggleExclude = useCallback((storeId: number) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) {
        next.delete(storeId);
      } else {
        next.add(storeId);
      }
      return next;
    });
  }, []);

  const removeExclusion = useCallback((storeId: number) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      next.delete(storeId);
      return next;
    });
  }, []);

  const clearExclusions = useCallback(() => setExcludedIds(new Set<number>()), []);

  const isExcluded = useCallback(
    (storeId: number) => excludedIds.has(storeId),
    [excludedIds],
  );

  return {
    excludedIds,
    toggleExclude,
    removeExclusion,
    clearExclusions,
    isExcluded,
    excludedCount: excludedIds.size,
  };
}
