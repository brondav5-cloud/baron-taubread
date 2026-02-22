"use client";

import { useState, useMemo, useCallback } from "react";
import { getStores, getProducts } from "@/lib/dataLoader";
import type { StoreWithStatus, ProductWithStatus } from "@/types/data";

export interface SearchResult {
  type: "store" | "product";
  id: number;
  name: string;
  subtitle: string;
  href: string;
}

export function useGlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const stores = useMemo(() => getStores(), []);
  const products = useMemo(() => getProducts(), []);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim() || query.length < 2) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const matchedResults: SearchResult[] = [];

    // Search stores
    const matchedStores = stores
      .filter(
        (store: StoreWithStatus) =>
          store.name.toLowerCase().includes(normalizedQuery) ||
          store.city.toLowerCase().includes(normalizedQuery) ||
          store.id.toString().includes(normalizedQuery),
      )
      .slice(0, 5);

    matchedStores.forEach((store: StoreWithStatus) => {
      matchedResults.push({
        type: "store",
        id: store.id,
        name: store.name,
        subtitle: `${store.city} • ${store.agent}`,
        href: `/dashboard/stores/${store.id}`,
      });
    });

    // Search products
    const matchedProducts = products
      .filter(
        (product: ProductWithStatus) =>
          product.name.toLowerCase().includes(normalizedQuery) ||
          product.category.toLowerCase().includes(normalizedQuery) ||
          product.id.toString().includes(normalizedQuery),
      )
      .slice(0, 5);

    matchedProducts.forEach((product: ProductWithStatus) => {
      matchedResults.push({
        type: "product",
        id: product.id,
        name: product.name,
        subtitle: product.category,
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
