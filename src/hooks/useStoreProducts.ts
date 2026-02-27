"use client";

import { useState, useEffect, useMemo } from "react";
import type { DbStore, MonthlyData } from "@/types/supabase";

// ============================================
// TYPES
// ============================================

export interface StoreProduct {
  product_external_id: number;
  product_name: string;
  product_category: string;
  monthly_qty: MonthlyData;
  monthly_sales: MonthlyData;
  total_qty: number;
  total_sales: number;
}

export interface MissingProduct {
  external_id: number;
  name: string;
  category: string | null;
  total_qty_global: number;
}

// ============================================
// HOOK
// ============================================

/**
 * Fetches store products via API (uses service_role, bypasses RLS).
 */
export function useStoreProducts(store: DbStore | null) {
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [missingProducts, setMissingProducts] = useState<MissingProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [missingSearch, setMissingSearch] = useState("");

  useEffect(() => {
    const storeId = store?.id;
    if (!storeId) return;

    async function fetchProducts() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/stores/${storeId}/products`);
        const data = await res.json();

        if (!res.ok) {
          setError(data?.error || "שגיאה בטעינת מוצרים");
          setStoreProducts([]);
          setMissingProducts([]);
          return;
        }

        setStoreProducts(data.storeProducts || []);
        setMissingProducts(data.missingProducts || []);
      } catch (err) {
        console.error("Error fetching store products:", err);
        setError("שגיאה בטעינת מוצרים");
        setStoreProducts([]);
        setMissingProducts([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
  }, [store?.id]);

  // Filtered store products
  const filteredProducts = useMemo(() => {
    if (!productSearch) return storeProducts;
    const q = productSearch.toLowerCase();
    return storeProducts.filter(
      (p) =>
        p.product_name.toLowerCase().includes(q) ||
        p.product_category.toLowerCase().includes(q),
    );
  }, [storeProducts, productSearch]);

  // Filtered missing products
  const filteredMissing = useMemo(() => {
    if (!missingSearch) return missingProducts;
    const q = missingSearch.toLowerCase();
    return missingProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category?.toLowerCase().includes(q) ?? false),
    );
  }, [missingProducts, missingSearch]);

  return {
    storeProducts: filteredProducts,
    missingProducts: filteredMissing,
    totalProducts: storeProducts.length,
    totalMissing: missingProducts.length,
    isLoading,
    error,
    productSearch,
    setProductSearch,
    missingSearch,
    setMissingSearch,
  };
}
