"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getStoreByStringId,
  getProducts,
  getHolidayForMonth,
} from "@/lib/dataLoader";
import { DEFAULT_MONTH_SELECTION, type MonthSelection } from "@/components/ui";

// ============================================
// CONSTANTS
// ============================================

export const MONTHS = [
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
export const DONUT_COLORS = [
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

export interface StoreMonthlyData {
  month: string;
  gross2024: number;
  gross2025: number;
  qty2024: number;
  qty2025: number;
  returns2024: number;
  returns2025: number;
  sales2024: number;
  sales2025: number;
  holiday: string;
}

export interface StoreTotals {
  gross2024: number;
  gross2025: number;
  qty2024: number;
  qty2025: number;
  returns2024: number;
  returns2025: number;
  sales2024: number;
  sales2025: number;
  returnsPct2024: number;
  returnsPct2025: number;
}

export interface StoreChartData {
  month: string;
  gross: number;
  qty: number;
  returns: number;
}

export interface TopProduct {
  id: number;
  name: string;
  category: string;
  storeQty: number;
  storePct: number;
}

// ============================================
// HOOK
// ============================================

export function useStoreDetail() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;

  // State
  const [selectedYear, setSelectedYear] = useState<2024 | 2025>(2025);
  const [hideHolidays, setHideHolidays] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [monthSelection, setMonthSelection] = useState<MonthSelection>(
    DEFAULT_MONTH_SELECTION,
  );

  // Load data
  const store = useMemo(() => getStoreByStringId(storeId), [storeId]);
  const allProducts = useMemo(() => getProducts(), []);

  // Monthly data for table
  const monthlyData = useMemo((): StoreMonthlyData[] => {
    if (!store) return [];
    return MONTHS.map((month, i) => {
      const period2024 = `2024${String(i + 1).padStart(2, "0")}`;
      const period2025 = `2025${String(i + 1).padStart(2, "0")}`;
      const holiday = getHolidayForMonth(selectedYear, i + 1);
      return {
        month,
        gross2024: store.monthly_gross?.[period2024] ?? 0,
        gross2025: store.monthly_gross?.[period2025] ?? 0,
        qty2024: store.monthly_qty?.[period2024] ?? 0,
        qty2025: store.monthly_qty?.[period2025] ?? 0,
        returns2024: store.monthly_returns?.[period2024] ?? 0,
        returns2025: store.monthly_returns?.[period2025] ?? 0,
        sales2024: store.monthly_sales?.[period2024] ?? 0,
        sales2025: store.monthly_sales?.[period2025] ?? 0,
        holiday: holiday?.name || "-",
      };
    });
  }, [store, selectedYear]);

  // Totals
  const totals = useMemo((): StoreTotals => {
    const t = {
      gross2024: 0,
      gross2025: 0,
      qty2024: 0,
      qty2025: 0,
      returns2024: 0,
      returns2025: 0,
      sales2024: 0,
      sales2025: 0,
    };
    monthlyData.forEach((m) => {
      t.gross2024 += m.gross2024;
      t.gross2025 += m.gross2025;
      t.qty2024 += m.qty2024;
      t.qty2025 += m.qty2025;
      t.returns2024 += m.returns2024;
      t.returns2025 += m.returns2025;
      t.sales2024 += m.sales2024;
      t.sales2025 += m.sales2025;
    });
    return {
      ...t,
      returnsPct2024: t.gross2024 > 0 ? (t.returns2024 / t.gross2024) * 100 : 0,
      returnsPct2025: t.gross2025 > 0 ? (t.returns2025 / t.gross2025) * 100 : 0,
    };
  }, [monthlyData]);

  // Top products
  const topProducts = useMemo((): TopProduct[] => {
    const products = allProducts.slice(0, 6).map((p, i) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      storeQty: Math.floor((p.qty_2025 / 50) * (1 - i * 0.15)),
      storePct: 0,
    }));

    const totalQty = products.reduce((s, p) => s + p.storeQty, 0);
    products.forEach((p) => {
      p.storePct = totalQty > 0 ? (p.storeQty / totalQty) * 100 : 0;
    });

    return products;
  }, [allProducts]);

  // Filtered products for table
  const filteredProducts = useMemo(() => {
    if (!productSearch) return allProducts.slice(0, 40);
    return allProducts
      .filter(
        (p) =>
          p.name.includes(productSearch) || p.category.includes(productSearch),
      )
      .slice(0, 40);
  }, [allProducts, productSearch]);

  // Chart data
  const chartData = useMemo((): StoreChartData[] => {
    return monthlyData.map((m) => ({
      month: m.month,
      gross: selectedYear === 2025 ? m.gross2025 : m.gross2024,
      qty: selectedYear === 2025 ? m.qty2025 : m.qty2024,
      returns: selectedYear === 2025 ? m.returns2025 : m.returns2024,
    }));
  }, [monthlyData, selectedYear]);

  // Navigation
  const goToStoresList = () => router.push("/dashboard/stores");

  return {
    // Identifiers
    storeId,
    store,

    // State
    selectedYear,
    setSelectedYear,
    hideHolidays,
    setHideHolidays,
    productSearch,
    setProductSearch,
    monthSelection,
    setMonthSelection,

    // Computed data
    monthlyData,
    totals,
    topProducts,
    filteredProducts,
    chartData,
    allProducts,

    // Navigation
    goToStoresList,
  };
}
