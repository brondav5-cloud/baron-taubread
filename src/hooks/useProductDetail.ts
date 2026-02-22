"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getProductByStringId,
  getStores,
  getHolidayForMonth,
} from "@/lib/dataLoader";
import { DEFAULT_MONTH_SELECTION, type MonthSelection } from "@/components/ui";

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

// ============================================
// HOOK
// ============================================

export function useProductDetail() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  // State
  const [selectedYear, setSelectedYear] = useState<2024 | 2025>(2025);
  const [hideHolidays, setHideHolidays] = useState(false);
  const [storeSearch, setStoreSearch] = useState("");
  const [monthSelection, setMonthSelection] = useState<MonthSelection>(
    DEFAULT_MONTH_SELECTION,
  );

  // Load data
  const product = useMemo(() => getProductByStringId(productId), [productId]);
  const allStores = useMemo(() => getStores(), []);

  // Monthly data for table
  const monthlyData = useMemo((): ProductMonthlyData[] => {
    if (!product) return [];
    return PRODUCT_MONTHS.map((month, i) => {
      const period2024 = `2024${String(i + 1).padStart(2, "0")}`;
      const period2025 = `2025${String(i + 1).padStart(2, "0")}`;
      const holiday = getHolidayForMonth(selectedYear, i + 1);
      return {
        month,
        qty2024: product.monthly_qty?.[period2024] ?? 0,
        qty2025: product.monthly_qty?.[period2025] ?? 0,
        sales2024: product.monthly_sales?.[period2024] ?? 0,
        sales2025: product.monthly_sales?.[period2025] ?? 0,
        holiday: holiday?.name || "-",
      };
    });
  }, [product, selectedYear]);

  // Totals
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

  // Top stores
  const topStores = useMemo((): TopStore[] => {
    const stores = allStores.slice(0, 6).map((s, i) => ({
      id: s.id,
      name: s.name,
      city: s.city,
      productQty: Math.floor((s.qty_2025 / 20) * (1 - i * 0.12)),
      productPct: 0,
    }));

    const totalQty = stores.reduce((s, x) => s + x.productQty, 0);
    stores.forEach((s) => {
      s.productPct = totalQty > 0 ? (s.productQty / totalQty) * 100 : 0;
    });

    return stores;
  }, [allStores]);

  // Filtered stores for table
  const filteredStores = useMemo(() => {
    if (!storeSearch) return allStores.slice(0, 40);
    return allStores
      .filter(
        (s) => s.name.includes(storeSearch) || s.city.includes(storeSearch),
      )
      .slice(0, 40);
  }, [allStores, storeSearch]);

  // Chart data
  const chartData = useMemo((): ProductChartData[] => {
    return monthlyData.map((m) => ({
      month: m.month,
      qty: selectedYear === 2025 ? m.qty2025 : m.qty2024,
      sales: selectedYear === 2025 ? m.sales2025 : m.sales2024,
    }));
  }, [monthlyData, selectedYear]);

  // Navigation
  const goToProductsList = () => router.push("/dashboard/products");

  return {
    // Identifiers
    productId,
    product,

    // State
    selectedYear,
    setSelectedYear,
    hideHolidays,
    setHideHolidays,
    storeSearch,
    setStoreSearch,
    monthSelection,
    setMonthSelection,

    // Computed data
    monthlyData,
    totals,
    topStores,
    filteredStores,
    chartData,
    allStores,

    // Navigation
    goToProductsList,
  };
}
