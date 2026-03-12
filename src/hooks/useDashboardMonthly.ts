"use client";

import { useMemo } from "react";
import { parsePeriodKey, formatPeriodRange, MONTH_NAMES_SHORT as MONTHS } from "@/lib/periodUtils";
import type { DbStore } from "@/types/supabase";
import type {
  MonthlyDataPoint,
  TotalsData,
  HalfYearData,
  ChartDataPoint,
} from "./useDashboardSupabase";

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

function buildMonthlyPoint(
  stores: DbStore[],
  periodKey: string,
  month: string,
): MonthlyDataPoint {
  const prevYear = parseInt(periodKey.slice(0, 4), 10) - 1;
  const periodPrevious = `${prevYear}${periodKey.slice(4)}`;

  const grossCurrent = sumMonthlyData(stores, "monthly_gross", periodKey);
  const grossPrevious = sumMonthlyData(stores, "monthly_gross", periodPrevious);
  const qtyCurrent = sumMonthlyData(stores, "monthly_qty", periodKey);
  const qtyPrevious = sumMonthlyData(stores, "monthly_qty", periodPrevious);
  const returnsCurrent = sumMonthlyData(stores, "monthly_returns", periodKey);
  const returnsPrevious = sumMonthlyData(
    stores,
    "monthly_returns",
    periodPrevious,
  );
  const salesCurrent = sumMonthlyData(stores, "monthly_sales", periodKey);
  const salesPrevious = sumMonthlyData(stores, "monthly_sales", periodPrevious);

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
}

export function useDashboardMonthly(
  stores: DbStore[],
  monthsList: string[] | null | undefined,
  selectedYear: number,
  currentYear: number,
  previousYear: number,
) {
  const monthlyData = useMemo((): MonthlyDataPoint[] => {
    if (!monthsList || monthsList.length === 0) {
      return MONTHS.map((month, i) => {
        const monthNum = String(i + 1).padStart(2, "0");
        const periodKey = `${currentYear}${monthNum}`;
        return buildMonthlyPoint(stores, periodKey, month);
      });
    }
    const sorted = [...monthsList].sort();
    return sorted.slice(-12).map((periodKey) => {
      const parsed = parsePeriodKey(periodKey);
      const month = parsed?.label ?? periodKey;
      return buildMonthlyPoint(stores, periodKey, month);
    });
  }, [stores, currentYear, monthsList]);

  const tableMonthlyData = useMemo((): MonthlyDataPoint[] => {
    if (!monthsList || monthsList.length === 0) return monthlyData;
    const yearStr = String(selectedYear);
    const yearPeriods = monthsList.filter((p) => p.startsWith(yearStr)).sort();
    if (yearPeriods.length === 0) return monthlyData;
    return yearPeriods.map((periodKey) => {
      const parsed = parsePeriodKey(periodKey);
      const month = parsed?.label ?? periodKey;
      return buildMonthlyPoint(stores, periodKey, month);
    });
  }, [stores, monthsList, selectedYear, monthlyData]);

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

  return { monthlyData, tableMonthlyData, totals, halfYearData, chartData };
}
