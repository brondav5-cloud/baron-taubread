"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSupabaseData } from "./useSupabaseData";
import { DEFAULT_MONTH_SELECTION, type MonthSelection } from "@/components/ui";
import type { DbProduct, DbStore } from "@/types/supabase";
import type { StatusLong, StatusShort } from "@/types/data";

// ============================================
// CONSTANTS
// ============================================

export const PRODUCT_MONTHS = [
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
export const PRODUCT_DONUT_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f97316",
  "#ef4444",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#eab308",
];

// ============================================
// TYPES
// ============================================

export interface ProductMonthlyData {
  month: string;
  qty2024: number;
  qty2025: number;
  sales2024: number;
  sales2025: number;
  holiday: string;
}

export interface ProductTotals {
  qty2024: number;
  qty2025: number;
  sales2024: number;
  sales2025: number;
}

export interface ProductChartData {
  month: string;
  qty: number;
  sales: number;
}

export interface TopStore {
  id: number;
  name: string;
  city: string;
  productQty: number;
  productPct: number;
}

function dbProductToLegacy(p: DbProduct) {
  const m = p.metrics ?? {};
  const mx = m as unknown as Record<string, unknown>;
  return {
    ...p,
    id: p.external_id,
    category: p.category ?? "",
    qty_2024: m.qty_previous_year ?? 0,
    qty_2025: m.qty_current_year ?? 0,
    qty_total: (m.qty_previous_year ?? 0) + (m.qty_current_year ?? 0),
    sales_2024: m.sales_previous_year ?? 0,
    sales_2025: m.sales_current_year ?? 0,
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
    metric_peak_distance: 0,
    peak_value: 0,
    current_value: m.qty_current_year ?? 0,
    returns_pct_prev6: 0,
    returns_pct_last6: 0,
    returns_change: 0,
    status_long: (mx.status_long ?? "יציב") as StatusLong,
    status_short: (mx.status_short ?? "יציב") as StatusShort,
    monthly_qty: p.monthly_qty ?? {},
    monthly_sales: p.monthly_sales ?? {},
  };
}

function dbStoreToLegacy(s: DbStore) {
  const m = s.metrics ?? {};
  const mx = m as unknown as Record<string, unknown>;
  return {
    id: s.external_id,
    name: s.name,
    city: s.city ?? "",
    agent: s.agent ?? "",
    network: s.network ?? "",
    driver: s.driver ?? "",
    status_long: (mx.status_long ?? "יציב") as StatusLong,
    status_short: (mx.status_short ?? "יציב") as StatusShort,
    qty_2024: m.qty_previous_year ?? 0,
    qty_2025: m.qty_current_year ?? 0,
    qty_total: (m.qty_previous_year ?? 0) + (m.qty_current_year ?? 0),
    sales_2024: m.sales_previous_year ?? 0,
    sales_2025: m.sales_current_year ?? 0,
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
    metric_peak_distance: m.metric_peak_distance ?? 0,
    peak_value: m.peak_value ?? 0,
    current_value: m.current_value ?? 0,
    returns_pct_prev6: m.returns_pct_previous ?? 0,
    returns_pct_last6: m.returns_pct_current ?? 0,
    returns_change: m.returns_change ?? 0,
    monthly_qty: s.monthly_qty ?? {},
    monthly_sales: s.monthly_sales ?? {},
    monthly_gross: {},
    monthly_returns: {},
  };
}

// ============================================
// HOOK
// ============================================

export function useProductDetail() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const { products, stores, metadata } = useSupabaseData();

  const [selectedYear, setSelectedYear] = useState<2024 | 2025>(2025);
  const [hideHolidays, setHideHolidays] = useState(false);
  const [storeSearch, setStoreSearch] = useState("");
  const [monthSelection, setMonthSelection] = useState<MonthSelection>(
    DEFAULT_MONTH_SELECTION,
  );

  const product = useMemo(() => {
    const dbProduct = products.find((p) => String(p.external_id) === productId);
    return dbProduct ? dbProductToLegacy(dbProduct) : null;
  }, [products, productId]);

  const allStores = useMemo(() => stores.map(dbStoreToLegacy), [stores]);

  const currentYear = metadata?.current_year ?? 2025;
  const previousYear = metadata?.previous_year ?? 2024;

  const monthlyData = useMemo((): ProductMonthlyData[] => {
    if (!product) return [];
    return PRODUCT_MONTHS.map((month, i) => {
      const periodPrev = `${previousYear}${String(i + 1).padStart(2, "0")}`;
      const periodCur = `${currentYear}${String(i + 1).padStart(2, "0")}`;
      return {
        month,
        qty2024: product.monthly_qty?.[periodPrev] ?? 0,
        qty2025: product.monthly_qty?.[periodCur] ?? 0,
        sales2024: product.monthly_sales?.[periodPrev] ?? 0,
        sales2025: product.monthly_sales?.[periodCur] ?? 0,
        holiday: "-",
      };
    });
  }, [product, currentYear, previousYear]);

  const totals = useMemo((): ProductTotals => {
    const t = { qty2024: 0, qty2025: 0, sales2024: 0, sales2025: 0 };
    monthlyData.forEach((m) => {
      t.qty2024 += m.qty2024;
      t.qty2025 += m.qty2025;
      t.sales2024 += m.sales2024;
      t.sales2025 += m.sales2025;
    });
    return t;
  }, [monthlyData]);

  const topStores = useMemo((): TopStore[] => {
    const top = allStores.slice(0, 6).map((s) => ({
      id: s.id,
      name: s.name,
      city: s.city,
      productQty: 0,
      productPct: 0,
    }));
    return top;
  }, [allStores]);

  const filteredStores = useMemo(() => {
    if (!storeSearch) return allStores.slice(0, 40);
    const q = storeSearch.toLowerCase();
    return allStores
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [allStores, storeSearch]);

  const chartData = useMemo((): ProductChartData[] => {
    return monthlyData.map((m) => ({
      month: m.month,
      qty: selectedYear === currentYear ? m.qty2025 : m.qty2024,
      sales: selectedYear === currentYear ? m.sales2025 : m.sales2024,
    }));
  }, [monthlyData, selectedYear, currentYear]);

  const goToProductsList = () => router.push("/dashboard/products");

  return {
    productId,
    product,
    selectedYear,
    setSelectedYear,
    hideHolidays,
    setHideHolidays,
    storeSearch,
    setStoreSearch,
    monthSelection,
    setMonthSelection,
    monthlyData,
    totals,
    topStores,
    filteredStores,
    chartData,
    allStores,
    goToProductsList,
  };
}
