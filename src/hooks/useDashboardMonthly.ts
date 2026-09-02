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

function shiftPeriodsBackOneYear(periods: string[]): string[] {
  return periods.map(
    (key) => `${parseInt(key.slice(0, 4), 10) - 1}${key.slice(4)}`,
  );
}

function periodListLabel(periods: string[], fallback: string): string {
  const first = periods[0];
  const last = periods[periods.length - 1];
  if (periods.length >= 2 && first && last) {
    return formatPeriodRange(first, last);
  }
  if (first) {
    return parsePeriodKey(first)?.label ?? fallback;
  }
  return fallback;
}

function sumMonthlyPoints(points: MonthlyDataPoint[]) {
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
  points.forEach((m) => {
    t.grossCurrent += m.grossCurrent;
    t.grossPrevious += m.grossPrevious;
    t.qtyCurrent += m.qtyCurrent;
    t.qtyPrevious += m.qtyPrevious;
    t.returnsCurrent += m.returnsCurrent;
    t.returnsPrevious += m.returnsPrevious;
    t.salesCurrent += m.salesCurrent;
    t.salesPrevious += m.salesPrevious;
  });
  return t;
}

function buildPointsForPeriods(
  stores: DbStore[],
  periods: string[],
): MonthlyDataPoint[] {
  return periods.map((periodKey) => {
    const parsed = parsePeriodKey(periodKey);
    return buildMonthlyPoint(stores, periodKey, parsed?.label ?? periodKey);
  });
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
    // Year comparison is calendar YTD: same months this year vs last year.
    // Do not split the rolling last-12 window by calendar year (that produced
    // unequal ranges like Aug-Dec vs Jan-Jul).
    const yearToDatePeriods =
      monthsList && monthsList.length > 0
        ? [...monthsList]
            .filter((p) => p.startsWith(String(currentYear)))
            .sort()
        : [];
    const comparisonPeriods =
      yearToDatePeriods.length > 0
        ? yearToDatePeriods
        : monthlyData
            .map((m) => m.periodKey)
            .filter((key): key is string => Boolean(key));
    const comparisonPoints =
      yearToDatePeriods.length > 0
        ? buildPointsForPeriods(stores, yearToDatePeriods)
        : monthlyData;

    const t = sumMonthlyPoints(comparisonPoints);
    const previousPeriods = shiftPeriodsBackOneYear(comparisonPeriods);

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
      previousYearPeriodLabel: periodListLabel(
        previousPeriods,
        String(previousYear),
      ),
      currentYearPeriodLabel: periodListLabel(
        comparisonPeriods,
        String(currentYear),
      ),
    };
  }, [stores, monthsList, monthlyData, currentYear, previousYear]);

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

    return {
      h1Qty: h1.qty,
      h2Qty: h2.qty,
      h1Sales: h1.sales,
      h2Sales: h2.sales,
      qtyChange: h1.qty > 0 ? ((h2.qty - h1.qty) / h1.qty) * 100 : 0,
      salesChange: h1.sales > 0 ? ((h2.sales - h1.sales) / h1.sales) * 100 : 0,
      currentYear,
      h1PeriodLabel: periodListLabel(h1Periods, `H1 ${currentYear}`),
      h2PeriodLabel: periodListLabel(h2Periods, `H2 ${currentYear}`),
    };
  }, [monthlyData, currentYear]);

  const chartData = useMemo((): ChartDataPoint[] => {
    return tableMonthlyData.map((m) => ({
      month: m.month,
      gross: m.grossCurrent,
      qty: m.qtyCurrent,
      returns: m.returnsCurrent,
    }));
  }, [tableMonthlyData]);

  return { monthlyData, tableMonthlyData, totals, halfYearData, chartData };
}
