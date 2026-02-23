"use client";

import { useState, useMemo, useCallback } from "react";
import { useSupabaseData } from "./useSupabaseData";

export interface SearchResult {
  type: "store" | "product";
  id: number | string;
  name: string;
  subtitle: string;
  href: string;
}

export function useGlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const { stores, products } = useSupabaseData();

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim() || query.length < 2) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const matchedResults: SearchResult[] = [];

    const matchedStores = stores
      .filter(
        (store) =>
          store.name.toLowerCase().includes(normalizedQuery) ||
          (store.city ?? "").toLowerCase().includes(normalizedQuery) ||
          store.external_id.toString().includes(normalizedQuery),
      )
      .slice(0, 5);

    matchedStores.forEach((store) => {
      matchedResults.push({
        type: "store",
        id: store.external_id,
        name: store.name,
        subtitle: `${store.city ?? ""} • ${store.agent ?? ""}`.replace(/ • $/, ""),
        href: `/dashboard/stores/${store.id}`,
      });
    });

    const matchedProducts = products
      .filter(
        (product) =>
          product.name.toLowerCase().includes(normalizedQuery) ||
          (product.category ?? "").toLowerCase().includes(normalizedQuery) ||
          product.external_id.toString().includes(normalizedQuery),
      )
      .slice(0, 5);

    matchedProducts.forEach((product) => {
      matchedResults.push({
        type: "product",
        id: product.external_id,
        name: product.name,
        subtitle: product.category ?? "",
        href: `/dashboard/products/${product.id}`,
      });
    });

    return matchedResults;
  }, [query, stores, products]);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (value.length >= 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setQuery("");
    setIsOpen(false);
  }, []);

  const closeResults = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    query,
    results,
    isOpen,
    handleSearch,
    clearSearch,
    closeResults,
  };
}
