"use client";

import { useMemo, useState } from "react";
import {
  getStores,
  getOverviewStats,
  getTopStores,
  getBottomStores,
  getAlertStores,
  getHolidayForMonth,
} from "@/lib/dataLoader";
import { STATUS_DISPLAY_LONG, type StatusLong } from "@/types/data";

// ============================================
// CONSTANTS
// ============================================

export const DASHBOARD_CHART_COLORS = [
  "#10b981",
  "#84cc16",
  "#6b7280",
  "#f59e0b",
  "#ef4444",
];
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

// ============================================
// TYPES
// ============================================

export interface MonthlyDataPoint {
  month: string;
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
  holiday: string;
}

export interface TotalsData {
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
  qtyChange: number;
  salesChange: number;
}

export interface HalfYearData {
  h1Qty: number;
  h2Qty: number;
  h1Sales: number;
  h2Sales: number;
  qtyChange: number;
  salesChange: number;
}

export interface CitySalesData {
  city: string;
  qty: number;
  sales: number;
  stores: number;
}

export interface StatusDistributionItem {
  name: string;
  value: number;
  status: StatusLong;
}

export interface ChartDataPoint {
  month: string;
  gross: number;
  qty: number;
  returns: number;
}

// ============================================
// HOOK
// ============================================

export function useDashboard() {
  const [selectedYear, setSelectedYear] = useState<2024 | 2025>(2025);
  const [hideHolidays, setHideHolidays] = useState(false);

  // ============================================
  // LOAD DATA
  // ============================================

  const stores = useMemo(() => getStores(), []);
  const stats = useMemo(() => getOverviewStats(), []);
  const topStores = useMemo(() => getTopStores(20), []);
  const bottomStores = useMemo(() => getBottomStores(20), []);
  const alertStores = useMemo(() => getAlertStores(), []);

  // ============================================
  // STATUS DISTRIBUTION
  // ============================================

  const statusDistribution = useMemo((): StatusDistributionItem[] => {
    const counts: Record<StatusLong, number> = {
      עליה_חדה: 0,
      צמיחה: 0,
      יציב: 0,
      ירידה: 0,
      התרסקות: 0,
    };
    stores.forEach((s) => {
      if (counts[s.status_long] !== undefined) counts[s.status_long]++;
    });
    return Object.entries(counts).map(([status, value]) => ({
      name: STATUS_DISPLAY_LONG[status as StatusLong],
      value,
      status: status as StatusLong,
    }));
  }, [stores]);

  // ============================================
  // MONTHLY DATA
  // ============================================

  const monthlyData = useMemo((): MonthlyDataPoint[] => {
    return MONTHS.map((month, i) => {
      const period2024 = `2024${String(i + 1).padStart(2, "0")}`;
      const period2025 = `2025${String(i + 1).padStart(2, "0")}`;

      let gross2024 = 0,
        gross2025 = 0;
      let qty2024 = 0,
        qty2025 = 0;
      let returns2024 = 0,
        returns2025 = 0;
      let sales2024 = 0,
        sales2025 = 0;

      stores.forEach((s) => {
        gross2024 += s.monthly_gross?.[period2024] ?? 0;
        gross2025 += s.monthly_gross?.[period2025] ?? 0;
        qty2024 += s.monthly_qty?.[period2024] ?? 0;
        qty2025 += s.monthly_qty?.[period2025] ?? 0;
        returns2024 += s.monthly_returns?.[period2024] ?? 0;
        returns2025 += s.monthly_returns?.[period2025] ?? 0;
        sales2024 += s.monthly_sales?.[period2024] ?? 0;
        sales2025 += s.monthly_sales?.[period2025] ?? 0;
      });

      const holiday = getHolidayForMonth(selectedYear, i + 1);

      return {
        month,
        gross2024,
        gross2025,
        qty2024,
        qty2025,
        returns2024,
        returns2025,
        sales2024,
        sales2025,
        returnsPct2024: gross2024 > 0 ? (returns2024 / gross2024) * 100 : 0,
        returnsPct2025: gross2025 > 0 ? (returns2025 / gross2025) * 100 : 0,
        holiday: holiday?.name || "-",
      };
    });
  }, [stores, selectedYear]);

  // ============================================
  // TOTALS
  // ============================================

  const totals = useMemo((): TotalsData => {
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
      qtyChange:
        t.qty2024 > 0 ? ((t.qty2025 - t.qty2024) / t.qty2024) * 100 : 0,
      salesChange:
        t.sales2024 > 0 ? ((t.sales2025 - t.sales2024) / t.sales2024) * 100 : 0,
    };
  }, [monthlyData]);

  // ============================================
  // HALF YEAR DATA
  // ============================================

  const halfYearData = useMemo((): HalfYearData => {
    const h1 = { qty: 0, sales: 0 };
    const h2 = { qty: 0, sales: 0 };
    monthlyData.forEach((m, i) => {
      if (i < 6) {
        h1.qty += m.qty2025;
        h1.sales += m.sales2025;
      } else {
        h2.qty += m.qty2025;
        h2.sales += m.sales2025;
      }
    });
    return {
      h1Qty: h1.qty,
      h2Qty: h2.qty,
      h1Sales: h1.sales,
      h2Sales: h2.sales,
      qtyChange: h1.qty > 0 ? ((h2.qty - h1.qty) / h1.qty) * 100 : 0,
      salesChange: h1.sales > 0 ? ((h2.sales - h1.sales) / h1.sales) * 100 : 0,
    };
  }, [monthlyData]);

  // ============================================
  // CITY SALES
  // ============================================

  const citySales = useMemo((): CitySalesData[] => {
    const cityMap: Record<
      string,
      { qty: number; sales: number; stores: number }
    > = {};
    stores.forEach((s) => {
      if (!cityMap[s.city]) {
        cityMap[s.city] = { qty: 0, sales: 0, stores: 0 };
      }
      const city = cityMap[s.city]!;
      city.qty += s.qty_2025;
      city.sales += s.sales_2025;
      city.stores++;
    });
    return Object.entries(cityMap)
      .map(([city, data]) => ({ city, ...data }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  }, [stores]);

  // ============================================
  // CHART DATA
  // ============================================

  const chartData = useMemo((): ChartDataPoint[] => {
    return monthlyData.map((m) => ({
      month: m.month,
      gross: selectedYear === 2025 ? m.gross2025 : m.gross2024,
      qty: selectedYear === 2025 ? m.qty2025 : m.qty2024,
      returns: selectedYear === 2025 ? m.returns2025 : m.returns2024,
    }));
  }, [monthlyData, selectedYear]);

  // ============================================
  // RETURN
  // ============================================

  return {
    // State
    selectedYear,
    setSelectedYear,
    hideHolidays,
    setHideHolidays,

    // Data
    stores,
    stats,
    topStores,
    bottomStores,
    alertStores,
    statusDistribution,
    monthlyData,
    totals,
    halfYearData,
    citySales,
    chartData,
  };
}
