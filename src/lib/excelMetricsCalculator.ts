import {
  buildRolling24Window,
  buildRollingPairWindow,
  buildRollingYoYWindow,
} from "@/lib/periods";
import type { MonthlyData, StoreMetrics, ProductMetrics } from "@/types/supabase";

// ============================================
// HELPERS
// ============================================

function calculateStatusLong(metric12v12: number): string {
  if (metric12v12 >= 20) return "עליה_חדה";
  if (metric12v12 >= 10) return "צמיחה";
  if (metric12v12 >= -10) return "יציב";
  if (metric12v12 >= -30) return "ירידה";
  return "התרסקות";
}

function calculateStatusShort(metric2v2: number): string {
  if (metric2v2 >= 15) return "עליה_חדה";
  if (metric2v2 >= -10) return "יציב";
  if (metric2v2 >= -25) return "ירידה";
  return "אזעקה";
}

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function sumMonths(data: MonthlyData, months: string[]): number {
  return months.reduce((sum, m) => sum + (data[m] || 0), 0);
}

// ============================================
// STORE METRICS
// ============================================

/**
 * Calculate all metrics for a store.
 *
 * LOGIC:
 * - 12v12: Last 12 months vs Previous 12 months
 * - 6v6:   Last 6 months vs Previous 6 months (NOT H1 vs H2!)
 * - 3v3:   Last 3 months vs SAME 3 months previous year
 * - 2v2:   Last 2 months vs Previous 2 months
 */
export function calculateStoreMetrics(
  monthlyQty: MonthlyData,
  monthlyGross: MonthlyData,
  monthlyReturns: MonthlyData,
  periods: string[],
  currentYear: number,
  previousYear: number,
  storeIdentity?: { storeKey: number; storeMeta?: { storeName?: string } },
): StoreMetrics {
  if (!storeIdentity) {
    console.warn(
      "[calculateStoreMetrics] Missing storeIdentity (storeKey). Metrics will be unkeyed.",
    );
  }
  const { sorted: sortedPeriods } = buildRolling24Window(periods);
  const w12 = buildRollingPairWindow(periods, 12);
  const w6 = buildRollingPairWindow(periods, 6);
  const w2 = buildRollingPairWindow(periods, 2);
  const yoy3 = buildRollingYoYWindow(periods, 3);

  const qtyLast12 = sumMonths(monthlyQty, w12.current);
  const qtyPrev12 = sumMonths(monthlyQty, w12.previous);
  const metric12v12 = calcChange(qtyLast12, qtyPrev12);

  const qtyLast6 = sumMonths(monthlyQty, w6.current);
  const qtyPrev6 = sumMonths(monthlyQty, w6.previous);
  const metric6v6 = calcChange(qtyLast6, qtyPrev6);

  const qtyLast3 = sumMonths(monthlyQty, yoy3.current);
  const qtySame3PrevYear = sumMonths(monthlyQty, yoy3.previousYear);
  const metric3v3 = calcChange(qtyLast3, qtySame3PrevYear);

  const qtyLast2 = sumMonths(monthlyQty, w2.current);
  const qtyPrev2 = sumMonths(monthlyQty, w2.previous);
  const metric2v2 = calcChange(qtyLast2, qtyPrev2);

  const currentYearMonths = sortedPeriods.filter((p) =>
    p.startsWith(String(currentYear)),
  );
  const previousYearMonths = sortedPeriods.filter((p) =>
    p.startsWith(String(previousYear)),
  );
  const qtyCurrentYear = sumMonths(monthlyQty, currentYearMonths);
  const qtyPreviousYear = sumMonths(monthlyQty, previousYearMonths);

  const grossCurrent = sumMonths(monthlyGross, currentYearMonths);
  const grossPrevious = sumMonths(monthlyGross, previousYearMonths);
  const returnsCurrent = sumMonths(monthlyReturns, currentYearMonths);
  const returnsPrevious = sumMonths(monthlyReturns, previousYearMonths);
  const salesCurrentYear = grossCurrent - returnsCurrent;
  const salesPreviousYear = grossPrevious - returnsPrevious;

  const qtyValues = Object.values(monthlyQty).filter((v) => v > 0);
  const peakValue = qtyValues.length > 0 ? Math.max(...qtyValues) : 0;
  const lastPeriod = sortedPeriods[sortedPeriods.length - 1];
  const currentValue = lastPeriod ? monthlyQty[lastPeriod] || 0 : 0;
  const metricPeakDistance =
    peakValue > 0 ? calcChange(currentValue, peakValue) : 0;

  const grossLast6 = sumMonths(monthlyGross, w6.current);
  const returnsLast6 = sumMonths(monthlyReturns, w6.current);
  const grossPrev6Months = sumMonths(monthlyGross, w6.previous);
  const returnsPrev6Months = sumMonths(monthlyReturns, w6.previous);

  const returnsPctCurrent =
    grossLast6 > 0 ? Math.round((returnsLast6 / grossLast6) * 1000) / 10 : 0;
  const returnsPctPrevious =
    grossPrev6Months > 0
      ? Math.round((returnsPrev6Months / grossPrev6Months) * 1000) / 10
      : 0;

  return {
    qty_current_year: qtyCurrentYear,
    qty_previous_year: qtyPreviousYear,
    sales_current_year: salesCurrentYear,
    sales_previous_year: salesPreviousYear,
    metric_12v12: metric12v12,
    metric_6v6: metric6v6,
    metric_3v3: metric3v3,
    metric_2v2: metric2v2,
    qty_12v12_current: qtyLast12,
    qty_12v12_previous: qtyPrev12,
    qty_6v6_current: qtyLast6,
    qty_6v6_previous: qtyPrev6,
    qty_3v3_current: qtyLast3,
    qty_3v3_previous: qtySame3PrevYear,
    qty_2v2_current: qtyLast2,
    qty_2v2_previous: qtyPrev2,
    metric_peak_distance: metricPeakDistance,
    peak_value: peakValue,
    current_value: currentValue,
    returns_pct_current: returnsPctCurrent,
    returns_pct_previous: returnsPctPrevious,
    returns_change:
      Math.round((returnsPctCurrent - returnsPctPrevious) * 10) / 10,
    status_long: calculateStatusLong(metric12v12),
    status_short: calculateStatusShort(metric2v2),
  };
}

// ============================================
// PRODUCT METRICS
// ============================================

/**
 * Calculate metrics for a product (same logic as stores, without returns/gross)
 */
export function calculateProductMetrics(
  monthlyQty: MonthlyData,
  monthlySales: MonthlyData,
  periods: string[],
  currentYear: number,
  previousYear: number,
): ProductMetrics {
  const { sorted: sortedPeriods } = buildRolling24Window(periods);
  const w12 = buildRollingPairWindow(periods, 12);
  const w6 = buildRollingPairWindow(periods, 6);
  const w2 = buildRollingPairWindow(periods, 2);
  const yoy3 = buildRollingYoYWindow(periods, 3);

  const qtyLast12 = sumMonths(monthlyQty, w12.current);
  const qtyPrev12 = sumMonths(monthlyQty, w12.previous);
  const metric12v12 = calcChange(qtyLast12, qtyPrev12);

  const qtyLast6 = sumMonths(monthlyQty, w6.current);
  const qtyPrev6 = sumMonths(monthlyQty, w6.previous);
  const metric6v6 = calcChange(qtyLast6, qtyPrev6);

  const qtyLast3 = sumMonths(monthlyQty, yoy3.current);
  const qtySame3PrevYear = sumMonths(monthlyQty, yoy3.previousYear);
  const metric3v3 = calcChange(qtyLast3, qtySame3PrevYear);

  const qtyLast2 = sumMonths(monthlyQty, w2.current);
  const qtyPrev2 = sumMonths(monthlyQty, w2.previous);
  const metric2v2 = calcChange(qtyLast2, qtyPrev2);

  const currentYearMonths = sortedPeriods.filter((p) =>
    p.startsWith(String(currentYear)),
  );
  const previousYearMonths = sortedPeriods.filter((p) =>
    p.startsWith(String(previousYear)),
  );
  const qtyCurrentYear = sumMonths(monthlyQty, currentYearMonths);
  const qtyPreviousYear = sumMonths(monthlyQty, previousYearMonths);
  const salesCurrentYear = sumMonths(monthlySales, currentYearMonths);
  const salesPreviousYear = sumMonths(monthlySales, previousYearMonths);

  return {
    qty_current_year: qtyCurrentYear,
    qty_previous_year: qtyPreviousYear,
    sales_current_year: salesCurrentYear,
    sales_previous_year: salesPreviousYear,
    metric_12v12: metric12v12,
    metric_6v6: metric6v6,
    metric_3v3: metric3v3,
    metric_2v2: metric2v2,
    qty_12v12_current: qtyLast12,
    qty_12v12_previous: qtyPrev12,
    qty_6v6_current: qtyLast6,
    qty_6v6_previous: qtyPrev6,
    qty_3v3_current: qtyLast3,
    qty_3v3_previous: qtySame3PrevYear,
    qty_2v2_current: qtyLast2,
    qty_2v2_previous: qtyPrev2,
    status_long: calculateStatusLong(metric12v12),
    status_short: calculateStatusShort(metric2v2),
  };
}
