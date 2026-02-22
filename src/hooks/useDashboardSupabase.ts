"use client";

import { useMemo, useState, useEffect } from "react";
import { useSupabaseData } from "./useSupabaseData";
import { parsePeriodKey, formatPeriodRange } from "@/lib/periodUtils";
import type { DbStore } from "@/types/supabase";

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

// Status display mapping
const STATUS_DISPLAY: Record<string, string> = {
  עליה_חדה: "עליה חדה",
  צמיחה: "צמיחה",
  יציב: "יציב",
  ירידה: "ירידה",
  התרסקות: "התרסקות",
};

// ============================================
// TYPES
// ============================================

export interface MonthlyDataPoint {
  month: string;
  periodKey: string;
  grossCurrent: number;
  grossPrevious: number;
  qtyCurrent: number;
  qtyPrevious: number;
  returnsCurrent: number;
  returnsPrevious: number;
  salesCurrent: number;
  salesPrevious: number;
  returnsPctCurrent: number;
  returnsPctPrevious: number;
  holiday: string;
}

export interface TotalsData {
  grossCurrent: number;
  grossPrevious: number;
  qtyCurrent: number;
  qtyPrevious: number;
  returnsCurrent: number;
  returnsPrevious: number;
  salesCurrent: number;
  salesPrevious: number;
  returnsPctCurrent: number;
  returnsPctPrevious: number;
  qtyChange: number;
  salesChange: number;
  currentYear: number;
  previousYear: number;
  previousYearPeriodLabel?: string;
  currentYearPeriodLabel?: string;
}

export interface HalfYearData {
  h1Qty: number;
  h2Qty: number;
  h1Sales: number;
  h2Sales: number;
  qtyChange: number;
  salesChange: number;
  currentYear: number;
  h1PeriodLabel: string;
  h2PeriodLabel: string;
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
  status: string;
}

export interface ChartDataPoint {
  month: string;
  gross: number;
  qty: number;
  returns: number;
}

export interface TopStore {
  id: number;
  name: string;
  city: string;
  metric_12v12: number;
  sales: number;
  status: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function sumMonthlyData(
  stores: DbStore[],
  field: "monthly_qty" | "monthly_sales" | "monthly_gross" | "monthly_returns",
  period: string,
): number {
  return stores.reduce((sum, store) => {
    const data = store[field] as Record<string, number> | null;
    return sum + (data?.[period] || 0);
  }, 0);
}

// ============================================
// HOOK
// ============================================

export function useDashboardSupabase() {
  const { stores, products, metadata, periodLabel, isLoading, error } =
    useSupabaseData();

  // Dynamic years from metadata
  const currentYear = metadata?.current_year || new Date().getFullYear();
  const previousYear = metadata?.previous_year || currentYear - 1;

  // Get all unique years from the data
  const availableYears = useMemo((): number[] => {
    if (!metadata?.months_list || metadata.months_list.length === 0) {
      return [currentYear, previousYear];
    }
    const yearsSet = new Set<number>();
    metadata.months_list.forEach((period) => {
      const year = parseInt(period.slice(0, 4), 10);
      if (!isNaN(year)) yearsSet.add(year);
    });
    return Array.from(yearsSet).sort((a, b) => b - a); // Descending order (newest first)
  }, [metadata?.months_list, currentYear, previousYear]);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [hideHolidays, setHideHolidays] = useState(false);

  // Update selectedYear when metadata changes
  useEffect(() => {
    if (metadata?.current_year) {
      setSelectedYear(metadata.current_year);
    }
  }, [metadata?.current_year]);

  // ============================================
  // STATS
  // ============================================

  const stats = useMemo(
    () => ({
      totalStores: stores.length,
      totalProducts: products.length,
    }),
    [stores.length, products.length],
  );

  // ============================================
  // TOP/BOTTOM STORES
  // ============================================

  const topStores = useMemo((): TopStore[] => {
    return [...stores]
      .sort(
        (a, b) =>
          (b.metrics?.metric_12v12 || 0) - (a.metrics?.metric_12v12 || 0),
      )
      .slice(0, 20)
      .map((s) => ({
        id: s.external_id,
        name: s.name,
        city: s.city || "",
        metric_12v12: s.metrics?.metric_12v12 || 0,
        sales: s.metrics?.sales_current_year || 0,
        status: s.metrics?.status_long || "יציב",
      }));
  }, [stores]);

  const bottomStores = useMemo((): TopStore[] => {
    return [...stores]
      .sort(
        (a, b) =>
          (a.metrics?.metric_12v12 || 0) - (b.metrics?.metric_12v12 || 0),
      )
      .slice(0, 20)
      .map((s) => ({
        id: s.external_id,
        name: s.name,
        city: s.city || "",
        metric_12v12: s.metrics?.metric_12v12 || 0,
        sales: s.metrics?.sales_current_year || 0,
        status: s.metrics?.status_long || "יציב",
      }));
  }, [stores]);

  const alertStores = useMemo(() => {
    return stores.filter(
      (s) =>
        s.metrics?.status_long === "התרסקות" ||
        s.metrics?.status_long === "ירידה",
    );
  }, [stores]);

  // ============================================
  // STATUS DISTRIBUTION
  // ============================================

  const statusDistribution = useMemo((): StatusDistributionItem[] => {
    const counts: Record<string, number> = {
      עליה_חדה: 0,
      צמיחה: 0,
      יציב: 0,
      ירידה: 0,
      התרסקות: 0,
    };

    stores.forEach((s) => {
      const status = s.metrics?.status_long || "יציב";
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });

    return Object.entries(counts).map(([status, value]) => ({
      name: STATUS_DISPLAY[status] || status,
      value,
      status,
    }));
  }, [stores]);

  // ============================================
  // MONTHLY DATA (Dynamic from months_list!)
  // ============================================

  const monthlyData = useMemo((): MonthlyDataPoint[] => {
    const monthsList = metadata?.months_list;
    if (!monthsList || monthsList.length === 0) {
      // Fallback: use 12 months of current year
      return MONTHS.map((month, i) => {
        const monthNum = String(i + 1).padStart(2, "0");
        const periodCurrent = `${currentYear}${monthNum}`;
        const periodPrevious = `${previousYear}${monthNum}`;
        const grossCurrent = sumMonthlyData(
          stores,
          "monthly_gross",
          periodCurrent,
        );
        const grossPrevious = sumMonthlyData(
          stores,
          "monthly_gross",
          periodPrevious,
        );
        const qtyCurrent = sumMonthlyData(stores, "monthly_qty", periodCurrent);
        const qtyPrevious = sumMonthlyData(
          stores,
          "monthly_qty",
          periodPrevious,
        );
        const returnsCurrent = sumMonthlyData(
          stores,
          "monthly_returns",
          periodCurrent,
        );
        const returnsPrevious = sumMonthlyData(
          stores,
          "monthly_returns",
          periodPrevious,
        );
        const salesCurrent = sumMonthlyData(
          stores,
          "monthly_sales",
          periodCurrent,
        );
        const salesPrevious = sumMonthlyData(
          stores,
          "monthly_sales",
          periodPrevious,
        );
        return {
          month,
          periodKey: periodCurrent,
          grossCurrent,
          grossPrevious,
          qtyCurrent,
          qtyPrevious,
          returnsCurrent,
          returnsPrevious,
          salesCurrent,
          salesPrevious,
          returnsPctCurrent:
            grossCurrent > 0 ? (returnsCurrent / grossCurrent) * 100 : 0,
          returnsPctPrevious:
            grossPrevious > 0 ? (returnsPrevious / grossPrevious) * 100 : 0,
          holiday: "-",
        };
      });
    }

    const sorted = [...monthsList].sort();
    const displayPeriods = sorted.slice(-12); // Last 12 months

    return displayPeriods.map((periodKey) => {
      const parsed = parsePeriodKey(periodKey);
      const month = parsed?.label ?? periodKey;
      const prevYear = parseInt(periodKey.slice(0, 4), 10) - 1;
      const periodPrevious = `${prevYear}${periodKey.slice(4)}`;

      const grossCurrent = sumMonthlyData(stores, "monthly_gross", periodKey);
      const grossPrevious = sumMonthlyData(
        stores,
        "monthly_gross",
        periodPrevious,
      );
      const qtyCurrent = sumMonthlyData(stores, "monthly_qty", periodKey);
      const qtyPrevious = sumMonthlyData(stores, "monthly_qty", periodPrevious);
      const returnsCurrent = sumMonthlyData(
        stores,
        "monthly_returns",
        periodKey,
      );
      const returnsPrevious = sumMonthlyData(
        stores,
        "monthly_returns",
        periodPrevious,
      );
      const salesCurrent = sumMonthlyData(stores, "monthly_sales", periodKey);
      const salesPrevious = sumMonthlyData(
        stores,
        "monthly_sales",
        periodPrevious,
      );

      return {
        month,
        periodKey,
        grossCurrent,
        grossPrevious,
        qtyCurrent,
        qtyPrevious,
        returnsCurrent,
        returnsPrevious,
        salesCurrent,
        salesPrevious,
        returnsPctCurrent:
          grossCurrent > 0 ? (returnsCurrent / grossCurrent) * 100 : 0,
        returnsPctPrevious:
          grossPrevious > 0 ? (returnsPrevious / grossPrevious) * 100 : 0,
        holiday: "-",
      };
    });
  }, [stores, currentYear, previousYear, metadata?.months_list]);

  // ============================================
  // TOTALS
  // ============================================

  const totals = useMemo((): TotalsData => {
    const t = {
      grossCurrent: 0,
      grossPrevious: 0,
      qtyCurrent: 0,
      qtyPrevious: 0,
      returnsCurrent: 0,
      returnsPrevious: 0,
      salesCurrent: 0,
      salesPrevious: 0,
    };

    monthlyData.forEach((m) => {
      t.grossCurrent += m.grossCurrent;
      t.grossPrevious += m.grossPrevious;
      t.qtyCurrent += m.qtyCurrent;
      t.qtyPrevious += m.qtyPrevious;
      t.returnsCurrent += m.returnsCurrent;
      t.returnsPrevious += m.returnsPrevious;
      t.salesCurrent += m.salesCurrent;
      t.salesPrevious += m.salesPrevious;
    });

    const prevYearPeriods = monthlyData
      .filter(
        (m) =>
          m.periodKey && parseInt(m.periodKey.slice(0, 4), 10) === previousYear,
      )
      .map((m) => m.periodKey!);
    const currYearPeriods = monthlyData
      .filter(
        (m) =>
          m.periodKey && parseInt(m.periodKey.slice(0, 4), 10) === currentYear,
      )
      .map((m) => m.periodKey!);
    const prevFirst = prevYearPeriods[0];
    const prevLast = prevYearPeriods[prevYearPeriods.length - 1];
    const currFirst = currYearPeriods[0];
    const currLast = currYearPeriods[currYearPeriods.length - 1];
    const previousYearPeriodLabel =
      prevYearPeriods.length >= 2 && prevFirst && prevLast
        ? formatPeriodRange(prevFirst, prevLast)
        : prevFirst
          ? (parsePeriodKey(prevFirst)?.label ?? String(previousYear))
          : String(previousYear);
    const currentYearPeriodLabel =
      currYearPeriods.length >= 2 && currFirst && currLast
        ? formatPeriodRange(currFirst, currLast)
        : currFirst
          ? (parsePeriodKey(currFirst)?.label ?? String(currentYear))
          : String(currentYear);

    return {
      ...t,
      returnsPctCurrent:
        t.grossCurrent > 0 ? (t.returnsCurrent / t.grossCurrent) * 100 : 0,
      returnsPctPrevious:
        t.grossPrevious > 0 ? (t.returnsPrevious / t.grossPrevious) * 100 : 0,
      qtyChange:
        t.qtyPrevious > 0
          ? ((t.qtyCurrent - t.qtyPrevious) / t.qtyPrevious) * 100
          : 0,
      salesChange:
        t.salesPrevious > 0
          ? ((t.salesCurrent - t.salesPrevious) / t.salesPrevious) * 100
          : 0,
      currentYear,
      previousYear,
      previousYearPeriodLabel,
      currentYearPeriodLabel,
    };
  }, [monthlyData, currentYear, previousYear]);

  // ============================================
  // HALF YEAR DATA
  // ============================================

  const halfYearData = useMemo((): HalfYearData => {
    const h1 = { qty: 0, sales: 0 };
    const h2 = { qty: 0, sales: 0 };
    const h1Periods = monthlyData
      .slice(0, 6)
      .map((m) => m.periodKey)
      .filter(Boolean) as string[];
    const h2Periods = monthlyData
      .slice(6, 12)
      .map((m) => m.periodKey)
      .filter(Boolean) as string[];

    monthlyData.forEach((m, i) => {
      if (i < 6) {
        h1.qty += m.qtyCurrent;
        h1.sales += m.salesCurrent;
      } else {
        h2.qty += m.qtyCurrent;
        h2.sales += m.salesCurrent;
      }
    });

    const h1First = h1Periods[0];
    const h1Last = h1Periods[h1Periods.length - 1];
    const h2First = h2Periods[0];
    const h2Last = h2Periods[h2Periods.length - 1];
    const h1PeriodLabel =
      h1Periods.length >= 2 && h1First && h1Last
        ? formatPeriodRange(h1First, h1Last)
        : h1First
          ? (parsePeriodKey(h1First)?.label ?? "")
          : "";
    const h2PeriodLabel =
      h2Periods.length >= 2 && h2First && h2Last
        ? formatPeriodRange(h2First, h2Last)
        : h2First
          ? (parsePeriodKey(h2First)?.label ?? "")
          : "";

    return {
      h1Qty: h1.qty,
      h2Qty: h2.qty,
      h1Sales: h1.sales,
      h2Sales: h2.sales,
      qtyChange: h1.qty > 0 ? ((h2.qty - h1.qty) / h1.qty) * 100 : 0,
      salesChange: h1.sales > 0 ? ((h2.sales - h1.sales) / h1.sales) * 100 : 0,
      currentYear,
      h1PeriodLabel: h1PeriodLabel || `H1 ${currentYear}`,
      h2PeriodLabel: h2PeriodLabel || `H2 ${currentYear}`,
    };
  }, [monthlyData, currentYear]);

  // ============================================
  // CITY SALES
  // ============================================

  const citySales = useMemo((): CitySalesData[] => {
    const cityMap: Record<
      string,
      { qty: number; sales: number; stores: number }
    > = {};

    stores.forEach((s) => {
      const city = s.city || "לא ידוע";
      if (!cityMap[city]) {
        cityMap[city] = { qty: 0, sales: 0, stores: 0 };
      }
      cityMap[city].qty += s.metrics?.qty_current_year || 0;
      cityMap[city].sales += s.metrics?.sales_current_year || 0;
      cityMap[city].stores++;
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
    return monthlyData.map((m) => {
      const periodYear = m.periodKey
        ? parseInt(m.periodKey.slice(0, 4), 10)
        : currentYear;
      const useCurrent = selectedYear === periodYear;
      return {
        month: m.month,
        gross: useCurrent ? m.grossCurrent : m.grossPrevious,
        qty: useCurrent ? m.qtyCurrent : m.qtyPrevious,
        returns: useCurrent ? m.returnsCurrent : m.returnsPrevious,
      };
    });
  }, [monthlyData, selectedYear, currentYear]);

  // ============================================
  // RETURN
  // ============================================

  return {
    // Loading state
    isLoading,
    error,

    // State
    selectedYear,
    setSelectedYear,
    hideHolidays,
    setHideHolidays,

    // Dynamic periods
    currentYear,
    previousYear,
    availableYears,
    periodLabel,

    // Data
    stores,
    products,
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
