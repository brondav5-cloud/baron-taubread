"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getProducts,
  getProductById,
  getProductByStringId,
  getProductsByCategory,
  getCategories,
} from "@/lib/dataLoader";
import type { StatusLong, StatusShort } from "@/types/data";

// ============================================
// QUERY KEYS
// ============================================

export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (filters?: ProductFilterOptions) =>
    [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, "detail"] as const,
  detail: (id: number | string) => [...productKeys.details(), id] as const,
  categories: () => [...productKeys.all, "categories"] as const,
  byCategory: (category: string) =>
    [...productKeys.all, "category", category] as const,
  top: (limit?: number) => [...productKeys.all, "top", limit] as const,
  bottom: (limit?: number) => [...productKeys.all, "bottom", limit] as const,
};

// ============================================
// TYPES
// ============================================

export interface ProductFilterOptions {
  search?: string;
  categories?: string[];
  status_long?: StatusLong[];
  status_short?: StatusShort[];
  minQty?: number;
}

// ============================================
// BASIC HOOKS
// ============================================

/**
 * Get all products
 */
export function useProducts() {
  return useQuery({
    queryKey: productKeys.lists(),
    queryFn: () => getProducts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Get filtered products
 */
export function useFilteredProducts(filters: ProductFilterOptions) {
  const { data: allProducts, ...rest } = useProducts();

  const filteredProducts = allProducts?.filter((product) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (
        !product.name.toLowerCase().includes(searchLower) &&
        !product.category.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }

    // Category filter
    if (
      filters.categories?.length &&
      !filters.categories.includes(product.category)
    ) {
      return false;
    }

    // Status long filter
    if (
      filters.status_long?.length &&
      !filters.status_long.includes(product.status_long)
    ) {
      return false;
    }

    // Status short filter
    if (
      filters.status_short?.length &&
      !filters.status_short.includes(product.status_short)
    ) {
      return false;
    }

    // Min quantity filter
    if (filters.minQty && product.qty_2025 < filters.minQty) {
      return false;
    }

    return true;
  });

  return {
    ...rest,
    data: filteredProducts ?? [],
  };
}

/**
 * Get product by ID
 */
export function useProduct(id: number | string | undefined) {
  return useQuery({
    queryKey: productKeys.detail(id ?? ""),
    queryFn: () => {
      if (!id) return null;
      return typeof id === "number"
        ? getProductById(id)
        : getProductByStringId(id);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// CATEGORY HOOKS
// ============================================

/**
 * Get all categories
 */
export function useCategories() {
  return useQuery({
    queryKey: productKeys.categories(),
    queryFn: () => getCategories(),
    staleTime: 10 * 60 * 1000, // 10 minutes - categories don't change often
  });
}

/**
 * Get products by category
 */
export function useProductsByCategory(category: string) {
  return useQuery({
    queryKey: productKeys.byCategory(category),
    queryFn: () => getProductsByCategory(category),
    enabled: !!category,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// SPECIALIZED HOOKS
// ============================================

/**
 * Get top performing products
 */
export function useTopProducts(limit = 10) {
  const { data: products, ...rest } = useProducts();

  const topProducts = products
    ?.slice()
    .sort((a, b) => b.metric_12v12 - a.metric_12v12)
    .slice(0, limit);

  return {
    ...rest,
    data: topProducts ?? [],
  };
}

/**
 * Get bottom performing products
 */
export function useBottomProducts(limit = 10) {
  const { data: products, ...rest } = useProducts();

  const bottomProducts = products
    ?.slice()
    .sort((a, b) => a.metric_12v12 - b.metric_12v12)
    .slice(0, limit);

  return {
    ...rest,
    data: bottomProducts ?? [],
  };
}

/**
 * Get products count
 */
export function useProductsCount() {
  const { data: products, ...rest } = useProducts();

  return {
    ...rest,
    count: products?.length ?? 0,
  };
}

// ============================================
// STATUS HOOKS
// ============================================

/**
 * Get product counts by status
 */
export function useProductStatusCounts() {
  const { data: products, isLoading, error } = useProducts();

  const counts = products?.reduce(
    (acc, product) => {
      acc[product.status_long] = (acc[product.status_long] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    counts,
    isLoading,
    error,
    total: products?.length ?? 0,
  };
}

/**
 * Get products by status
 */
export function useProductsByStatus(status: StatusLong) {
  const { data: products, ...rest } = useProducts();

  const filteredProducts = products?.filter((p) => p.status_long === status);

  return {
    ...rest,
    data: filteredProducts ?? [],
  };
}

// ============================================
// PREFETCH HELPERS
// ============================================

/**
 * Prefetch products data
 */
export function usePrefetchProducts() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: productKeys.lists(),
      queryFn: () => getProducts(),
    });
  };
}

/**
 * Prefetch single product
 */
export function usePrefetchProduct() {
  const queryClient = useQueryClient();

  return (id: number | string) => {
    queryClient.prefetchQuery({
      queryKey: productKeys.detail(id),
      queryFn: () =>
        typeof id === "number" ? getProductById(id) : getProductByStringId(id),
    });
  };
}

// ============================================
// SEARCH HOOKS
// ============================================

/**
 * Search products by name
 */
export function useProductSearch(searchTerm: string) {
  const { data: products, ...rest } = useProducts();

  const results = searchTerm
    ? products?.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : products;

  return {
    ...rest,
    data: results ?? [],
  };
}

/**
 * Get category distribution
 */
export function useCategoryDistribution() {
  const { data: products, ...rest } = useProducts();

  const distribution = products?.reduce(
    (acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    ...rest,
    data: distribution ?? {},
  };
}
