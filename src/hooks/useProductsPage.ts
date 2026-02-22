"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { DbProduct } from "@/types/supabase";
import {
  STATUS_DISPLAY_LONG,
  STATUS_DISPLAY_SHORT,
  type StatusLong,
  type StatusShort,
  type ProductWithStatus,
} from "@/types/data";
import {
  DEFAULT_MONTH_SELECTION,
  calcMonthlyTotals,
  type MonthSelection,
} from "@/components/ui";

function dbProductToProductWithStatus(p: DbProduct): ProductWithStatus {
  const m = p.metrics || {};
  const qty2024 = m.qty_previous_year ?? 0;
  const qty2025 = m.qty_current_year ?? 0;
  const sales2024 = m.sales_previous_year ?? 0;
  const sales2025 = m.sales_current_year ?? 0;
  return {
    id: p.external_id,
    name: p.name,
    category: p.category ?? "",
    qty_2024: qty2024,
    qty_2025: qty2025,
    qty_total: qty2024 + qty2025,
    sales_2024: sales2024,
    sales_2025: sales2025,
    qty_prev6: m.qty_6v6_previous ?? 0,
    qty_last6: m.qty_6v6_current ?? 0,
    qty_prev3: m.qty_3v3_previous ?? 0,
    qty_last3: m.qty_3v3_current ?? 0,
    qty_prev2: m.qty_2v2_previous ?? 0,
    qty_last2: m.qty_2v2_current ?? 0,
    metric_12v12: m.metric_12v12 ?? 0,
    metric_6v6: m.metric_6v6 ?? 0,
    metric_3v3: m.metric_3v3 ?? 0,
    metric_2v2: m.metric_2v2 ?? 0,
    metric_peak_distance:
      (m as unknown as Record<string, number>).metric_peak_distance ?? 0,
    peak_value: (m as unknown as Record<string, number>).peak_value ?? 0,
    current_value: (m as unknown as Record<string, number>).current_value ?? 0,
    returns_pct_prev6:
      (m as unknown as Record<string, number>).returns_pct_previous ?? 0,
    returns_pct_last6:
      (m as unknown as Record<string, number>).returns_pct_current ?? 0,
    returns_change:
      (m as unknown as Record<string, number>).returns_change ?? 0,
    monthly_qty: p.monthly_qty || {},
    monthly_sales: p.monthly_sales || {},
    status_long: (m.status_long || "יציב") as ProductWithStatus["status_long"],
    status_short: (m.status_short ||
      "יציב") as ProductWithStatus["status_short"],
  };
}

// ============================================
// TYPES
// ============================================

export type ProductsViewMode = "metrics" | "data";

export interface ProductsFilters {
  categories?: string[];
  status_long?: StatusLong[];
  status_short?: StatusShort[];
  minQty?: number;
}

export interface ProductsTotals {
  count: number;
  metric_12v12: number;
  metric_6v6: number;
  metric_3v3: number;
  metric_2v2: number;
  metric_peak_distance: number;
  returns_pct_last6: number;
  main: { qty: number; sales: number };
  comp: { qty: number; sales: number } | null;
}

// ============================================
// HOOK
// ============================================

export function useProductsPage() {
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;

  // State
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [viewMode, setViewMode] = useState<ProductsViewMode>("metrics");
  const [monthSelection, setMonthSelection] = useState<MonthSelection>(
    DEFAULT_MONTH_SELECTION,
  );
  const [filters, setFilters] = useState<ProductsFilters>({});
  const [allProducts, setAllProducts] = useState<ProductWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!companyId) {
      setIsLoading(false);
      setAllProducts([]);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("products")
        .select("*")
        .eq("company_id", companyId)
        .order("name");
      if (err) throw new Error(err.message);
      const mapped = (data || []).map(dbProductToProductWithStatus);
      setAllProducts(mapped);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError(err instanceof Error ? err.message : "שגיאה בטעינת מוצרים");
      setAllProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (auth.status === "loading") return;
    if (!companyId) {
      setIsLoading(false);
      setAllProducts([]);
      setError(null);
      return;
    }
    fetchProducts();
  }, [auth.status, companyId, fetchProducts]);

  const categories = useMemo(() => {
    const cats = new Set(allProducts.map((p) => p.category).filter(Boolean));
    return Array.from(cats).sort((a, b) => a.localeCompare(b, "he"));
  }, [allProducts]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      if (search) {
        const s = search.toLowerCase();
        if (
          !product.name.toLowerCase().includes(s) &&
          !product.category.toLowerCase().includes(s)
        )
          return false;
      }
      if (
        filters.categories?.length &&
        !filters.categories.includes(product.category)
      )
        return false;
      if (
        filters.status_long?.length &&
        !filters.status_long.includes(product.status_long)
      )
        return false;
      if (
        filters.status_short?.length &&
        !filters.status_short.includes(product.status_short)
      )
        return false;
      if (filters.minQty && product.qty_2025 < filters.minQty) return false;
      return true;
    });
  }, [allProducts, filters, search]);

  // Computed values
  const activeFiltersCount = Object.values(filters).filter((v) =>
    Array.isArray(v) ? v.length > 0 : Boolean(v),
  ).length;
  const isCompare =
    monthSelection.isCompareMode && monthSelection.compareMonths.length > 0;
  const displayMode = monthSelection.compareDisplayMode;

  // Status options
  const statusLongOptions = Object.keys(STATUS_DISPLAY_LONG) as StatusLong[];
  const statusShortOptions = Object.keys(STATUS_DISPLAY_SHORT) as StatusShort[];

  // Totals
  const totals = useMemo((): ProductsTotals | null => {
    if (filteredProducts.length === 0) return null;
    const count = filteredProducts.length;
    let mainQty = 0,
      mainSales = 0;
    let compQty = 0,
      compSales = 0;

    filteredProducts.forEach((product) => {
      const main = calcMonthlyTotals(product, monthSelection.months);
      mainQty += main.qty;
      mainSales += main.sales;
      if (isCompare) {
        const comp = calcMonthlyTotals(product, monthSelection.compareMonths);
        compQty += comp.qty;
        compSales += comp.sales;
      }
    });

    return {
      count,
      metric_12v12:
        filteredProducts.reduce((s, x) => s + x.metric_12v12, 0) / count,
      metric_6v6:
        filteredProducts.reduce((s, x) => s + x.metric_6v6, 0) / count,
      metric_3v3:
        filteredProducts.reduce((s, x) => s + x.metric_3v3, 0) / count,
      metric_2v2:
        filteredProducts.reduce((s, x) => s + x.metric_2v2, 0) / count,
      metric_peak_distance:
        filteredProducts.reduce((s, x) => s + x.metric_peak_distance, 0) /
        count,
      returns_pct_last6:
        filteredProducts.reduce((s, x) => s + x.returns_pct_last6, 0) / count,
      main: { qty: mainQty, sales: mainSales },
      comp: isCompare ? { qty: compQty, sales: compSales } : null,
    };
  }, [filteredProducts, monthSelection, isCompare]);

  // Helper functions
  const calcChange = (a: number, b: number) =>
    b === 0 ? 0 : ((a - b) / b) * 100;

  const getMonthsLabel = (months: string[]) => {
    if (months.length <= 2)
      return months
        .map((m) => {
          const month = parseInt(m.slice(4));
          const year = m.slice(2, 4);
          const names = [
            "ינו",
            "פבר",
            "מרץ",
            "אפר",
            "מאי",
            "יונ",
            "יול",
            "אוג",
            "ספט",
            "אוק",
            "נוב",
            "דצמ",
          ];
          return `${names[month - 1]} ${year}`;
        })
        .join(", ");
    return `${months.length} חודשים`;
  };

  const clearFilters = () => setFilters({});

  return {
    // State
    search,
    setSearch,
    showFilters,
    setShowFilters,
    viewMode,
    setViewMode,
    monthSelection,
    setMonthSelection,
    filters,
    setFilters,

    // Data
    allProducts,
    filteredProducts,
    categories,
    totals,
    isLoading,
    error,
    refetch: fetchProducts,

    // Options
    statusLongOptions,
    statusShortOptions,

    // Computed
    activeFiltersCount,
    isCompare,
    displayMode,

    // Helpers
    calcChange,
    getMonthsLabel,
    clearFilters,
  };
}
