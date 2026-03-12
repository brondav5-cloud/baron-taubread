"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSupabaseData } from "./useSupabaseData";
import { DEFAULT_MONTH_SELECTION, type MonthSelection } from "@/components/ui";
import { MONTH_NAMES_SHORT as PRODUCT_MONTHS } from "@/lib/periodUtils";
import type { DbProduct, DbStore, MonthlyData } from "@/types/supabase";
import type { StatusLong, StatusShort } from "@/types/data";
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
  qtyCurrent: number;
  qtyPrevious: number;
  salesCurrent: number;
  salesPrevious: number;
  holiday: string;
}

export interface ProductTotals {
  qtyCurrent: number;
  qtyPrevious: number;
  salesCurrent: number;
  salesPrevious: number;
  currentYear: number;
  previousYear: number;
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

export interface ProductStore {
  store_external_id: number;
  store_uuid: string;
  store_name: string;
  store_city: string | null;
  monthly_qty: MonthlyData;
  monthly_sales: MonthlyData;
  total_qty: number;
  total_sales: number;
  // Computed metrics
  qty_current_year: number;
  qty_previous_year: number;
  metric_12v12: number;
  metric_6v6: number;
  metric_3v3: number;
  metric_2v2: number;
  sales_current_year: number;
}

function sumPeriods(monthly: MonthlyData, periods: string[]): number {
  return periods.reduce((sum, p) => sum + (monthly[p] ?? 0), 0);
}

function calcMetric(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function computeProductStoreMetrics(
  row: Omit<ProductStore, "qty_current_year" | "qty_previous_year" | "metric_12v12" | "metric_6v6" | "metric_3v3" | "metric_2v2" | "sales_current_year">,
  currentYear: number,
  previousYear: number,
): ProductStore {
  // Derive periods directly from the row's monthly_qty keys — no need for monthsList
  const currStr = String(currentYear);
  const prevStr = String(previousYear);

  const allQtyPeriods = Object.keys(row.monthly_qty).sort();
  const currPeriods = allQtyPeriods.filter((p) => p.startsWith(currStr));
  const prevPeriods = allQtyPeriods.filter((p) => p.startsWith(prevStr));

  // Last N current periods, matching previous-year months
  const last6curr = currPeriods.slice(-6);
  const last6prev = last6curr.map((p) => `${prevStr}${p.slice(4)}`);
  const last3curr = currPeriods.slice(-3);
  const last3prev = last3curr.map((p) => `${prevStr}${p.slice(4)}`);
  const last2curr = currPeriods.slice(-2);
  const last2prev = last2curr.map((p) => `${prevStr}${p.slice(4)}`);

  const qty_current_year = sumPeriods(row.monthly_qty, currPeriods);
  const qty_previous_year = sumPeriods(row.monthly_qty, prevPeriods);
  const sales_current_year = sumPeriods(row.monthly_sales, currPeriods);

  return {
    ...row,
    qty_current_year,
    qty_previous_year,
    sales_current_year,
    metric_12v12: calcMetric(qty_current_year, qty_previous_year),
    metric_6v6: calcMetric(
      sumPeriods(row.monthly_qty, last6curr),
      sumPeriods(row.monthly_qty, last6prev),
    ),
    metric_3v3: calcMetric(
      sumPeriods(row.monthly_qty, last3curr),
      sumPeriods(row.monthly_qty, last3prev),
    ),
    metric_2v2: calcMetric(
      sumPeriods(row.monthly_qty, last2curr),
      sumPeriods(row.monthly_qty, last2prev),
    ),
  };
}

function computePeakDistance(
  monthlyQty: Record<string, number>,
): { metric_peak_distance: number; peak_value: number; current_value: number } {
  const entries = Object.entries(monthlyQty).filter(([, v]) => v > 0);
  if (entries.length === 0) return { metric_peak_distance: 0, peak_value: 0, current_value: 0 };

  const peak_value = Math.max(...entries.map(([, v]) => v));
  // Most recent non-zero month
  const sorted = entries.sort((a, b) => b[0].localeCompare(a[0]));
  const current_value = sorted[0]?.[1] ?? 0;
  const metric_peak_distance =
    peak_value > 0 ? ((current_value - peak_value) / peak_value) * 100 : 0;

  return { metric_peak_distance, peak_value, current_value };
}

function dbProductToLegacy(p: DbProduct) {
  const m = p.metrics ?? {};
  const mx = m as unknown as Record<string, unknown>;
  const { metric_peak_distance, peak_value, current_value } = computePeakDistance(
    p.monthly_qty ?? {},
  );
  return {
    ...p,
    id: p.external_id,
    category: p.category ?? "",
    qty_previous_year: m.qty_previous_year ?? 0,
    qty_current_year: m.qty_current_year ?? 0,
    qty_total: (m.qty_previous_year ?? 0) + (m.qty_current_year ?? 0),
    sales_previous_year: m.sales_previous_year ?? 0,
    sales_current_year: m.sales_current_year ?? 0,
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
    metric_peak_distance,
    peak_value,
    current_value,
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
    qty_previous_year: m.qty_previous_year ?? 0,
    qty_current_year: m.qty_current_year ?? 0,
    qty_total: (m.qty_previous_year ?? 0) + (m.qty_current_year ?? 0),
    sales_previous_year: m.sales_previous_year ?? 0,
    sales_current_year: m.sales_current_year ?? 0,
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

  // Derive years first so they're available for useState initialization
  const currentYear = metadata?.current_year ?? new Date().getFullYear();
  const previousYear = metadata?.previous_year ?? currentYear - 1;

  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [hideHolidays, setHideHolidays] = useState(false);
  const [storeSearch, setStoreSearch] = useState("");
  const [monthSelection, setMonthSelection] = useState<MonthSelection>(
    DEFAULT_MONTH_SELECTION,
  );

  // Sync selectedYear when metadata loads
  useEffect(() => {
    if (metadata?.current_year) setSelectedYear(metadata.current_year);
  }, [metadata?.current_year]);

  // Product-specific stores data
  const [rawProductStores, setRawProductStores] = useState<Omit<ProductStore, "qty_current_year" | "qty_previous_year" | "metric_12v12" | "metric_6v6" | "metric_3v3" | "metric_2v2" | "sales_current_year">[]>([]);
  const [productStoresLoading, setProductStoresLoading] = useState(false);

  useEffect(() => {
    if (!productId) return;
    setProductStoresLoading(true);
    fetch(`/api/products/${productId}/stores`)
      .then((r) => r.json())
      .then((data) => {
        setRawProductStores(data.productStores ?? []);
      })
      .catch(() => setRawProductStores([]))
      .finally(() => setProductStoresLoading(false));
  }, [productId]);

  const product = useMemo(() => {
    const dbProduct = products.find((p) => String(p.external_id) === productId);
    return dbProduct ? dbProductToLegacy(dbProduct) : null;
  }, [products, productId]);

  const allStores = useMemo(() => stores.map(dbStoreToLegacy), [stores]);

  // All years that have data for this product — always include currentYear
  const availableYears = useMemo((): number[] => {
    const yearsSet = new Set<number>([currentYear]);
    if (product?.monthly_qty) {
      Object.keys(product.monthly_qty).forEach((period) => {
        const y = parseInt(period.slice(0, 4), 10);
        if (!isNaN(y)) yearsSet.add(y);
      });
    }
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [product?.monthly_qty, currentYear]);

  // Monthly data for the selected year (current = selectedYear, previous = selectedYear-1)
  const monthlyData = useMemo((): ProductMonthlyData[] => {
    if (!product) return [];
    const prevYear = selectedYear - 1;
    return PRODUCT_MONTHS.map((month, i) => {
      const periodCur = `${selectedYear}${String(i + 1).padStart(2, "0")}`;
      const periodPrev = `${prevYear}${String(i + 1).padStart(2, "0")}`;
      return {
        month,
        qtyCurrent: product.monthly_qty?.[periodCur] ?? 0,
        qtyPrevious: product.monthly_qty?.[periodPrev] ?? 0,
        salesCurrent: product.monthly_sales?.[periodCur] ?? 0,
        salesPrevious: product.monthly_sales?.[periodPrev] ?? 0,
        holiday: "-",
      };
    });
  }, [product, selectedYear]);

  const totals = useMemo((): ProductTotals => {
    const t = { qtyCurrent: 0, qtyPrevious: 0, salesCurrent: 0, salesPrevious: 0 };
    monthlyData.forEach((m) => {
      t.qtyCurrent += m.qtyCurrent;
      t.qtyPrevious += m.qtyPrevious;
      t.salesCurrent += m.salesCurrent;
      t.salesPrevious += m.salesPrevious;
    });
    return { ...t, currentYear: selectedYear, previousYear: selectedYear - 1 };
  }, [monthlyData, selectedYear]);

  // Compute product-specific metrics for each store
  const productStores = useMemo((): ProductStore[] => {
    if (!rawProductStores.length) return [];
    return rawProductStores.map((row) =>
      computeProductStoreMetrics(row, currentYear, previousYear),
    );
  }, [rawProductStores, currentYear, previousYear]);

  const topStores = useMemo((): TopStore[] => {
    const sorted = [...productStores].sort(
      (a, b) => b.qty_current_year - a.qty_current_year,
    );
    const top10 = sorted.slice(0, 10);
    const totalQty = top10.reduce((s, r) => s + r.qty_current_year, 0);
    return top10.map((r) => ({
      id: r.store_external_id,
      name: r.store_name,
      city: r.store_city ?? "",
      productQty: r.qty_current_year,
      productPct: totalQty > 0 ? (r.qty_current_year / totalQty) * 100 : 0,
    }));
  }, [productStores]);

  const filteredStores = useMemo(() => {
    const sorted = [...productStores].sort(
      (a, b) => b.qty_current_year - a.qty_current_year,
    );
    if (!storeSearch) return sorted;
    const q = storeSearch.toLowerCase();
    return sorted.filter(
      (s) =>
        s.store_name.toLowerCase().includes(q) ||
        (s.store_city ?? "").toLowerCase().includes(q),
    );
  }, [productStores, storeSearch]);

  const chartData = useMemo((): ProductChartData[] => {
    return monthlyData.map((m) => ({
      month: m.month,
      qty: m.qtyCurrent,
      sales: m.salesCurrent,
    }));
  }, [monthlyData]);

  const goToProductsList = () => router.push("/dashboard/products");

  return {
    productId,
    product,
    selectedYear,
    setSelectedYear,
    availableYears,
    currentYear,
    previousYear,
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
    productStores,
    productStoresLoading,
    chartData,
    allStores,
    goToProductsList,
  };
}
