import { shiftMonthKeyYYYYMM } from "@/lib/periods/monthShift";
import { parsePeriodKey } from "@/lib/periodUtils";
import {
  calculateProductMetrics,
  calculateStoreMetrics,
} from "@/lib/excelMetricsCalculator";
import type { DataMetadata, DbProduct, DbStore, MonthlyData } from "@/types/db";

export const RETURNS_SETTLE_DAY = 15;

export interface MetricsWindow {
  openMonth: string;
  lastClosedMonth: string;
  settledMonth: string;
  pendingReturnsMonth: string | null;
  isManualReady: boolean;
  autoReadyLabel: string | null;
}

function jerusalemParts(now = new Date()) {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return {
    ymd,
    year: Number(ymd.slice(0, 4)),
    month: Number(ymd.slice(5, 7)),
    day: Number(ymd.slice(8, 10)),
    monthKey: `${ymd.slice(0, 4)}${ymd.slice(5, 7)}`,
  };
}

export function formatMonthLabelHe(yyyymm: string): string {
  return parsePeriodKey(yyyymm)?.labelFull ?? yyyymm;
}

export function resolveMetricsWindow(
  manualReadyMonth?: string | null,
  now = new Date(),
): MetricsWindow {
  const { monthKey: openMonth, day } = jerusalemParts(now);
  const lastClosedMonth = shiftMonthKeyYYYYMM(openMonth, -1);
  const waitingForReturns = day < RETURNS_SETTLE_DAY;
  const manual =
    typeof manualReadyMonth === "string" &&
    /^\d{6}$/.test(manualReadyMonth) &&
    manualReadyMonth === lastClosedMonth;
  const settledMonth =
    !waitingForReturns || manual
      ? lastClosedMonth
      : shiftMonthKeyYYYYMM(lastClosedMonth, -1);
  const pendingReturnsMonth =
    waitingForReturns && !manual ? lastClosedMonth : null;
  const autoReadyMonth = pendingReturnsMonth
    ? shiftMonthKeyYYYYMM(pendingReturnsMonth, 1)
    : null;
  const autoReadyInfo = autoReadyMonth ? parsePeriodKey(autoReadyMonth) : null;

  return {
    openMonth,
    lastClosedMonth,
    settledMonth,
    pendingReturnsMonth,
    isManualReady: Boolean(manual),
    autoReadyLabel: autoReadyInfo
      ? `${RETURNS_SETTLE_DAY} ב${autoReadyInfo.labelFull}`
      : null,
  };
}

export function filterSettledPeriods(
  periods: string[],
  settledMonth: string,
): string[] {
  return periods.filter((period) => /^\d{6}$/.test(period) && period <= settledMonth);
}

function uniqueMonthKeys(...maps: Array<MonthlyData | null | undefined>): string[] {
  const keys = new Set<string>();
  for (const map of maps) {
    if (!map) continue;
    for (const key of Object.keys(map)) keys.add(key);
  }
  return Array.from(keys);
}

export function metricsYearsFromWindow(window: MetricsWindow): {
  currentYear: number;
  previousYear: number;
} {
  const currentYear = Number(window.settledMonth.slice(0, 4));
  return { currentYear, previousYear: currentYear - 1 };
}

export function applySettledStoreMetrics(
  store: DbStore,
  window: MetricsWindow,
): DbStore {
  const { currentYear, previousYear } = metricsYearsFromWindow(window);
  const periods = filterSettledPeriods(
    uniqueMonthKeys(
      store.monthly_qty,
      store.monthly_sales,
      store.monthly_gross,
      store.monthly_returns,
    ),
    window.settledMonth,
  );
  return {
    ...store,
    metrics: calculateStoreMetrics(
      store.monthly_qty ?? {},
      store.monthly_gross ?? {},
      store.monthly_returns ?? {},
      periods,
      currentYear,
      previousYear,
      { storeKey: store.external_id, storeMeta: { storeName: store.name } },
    ),
  };
}

export function applySettledProductMetrics(
  product: DbProduct,
  window: MetricsWindow,
): DbProduct {
  const { currentYear, previousYear } = metricsYearsFromWindow(window);
  const periods = filterSettledPeriods(
    uniqueMonthKeys(product.monthly_qty, product.monthly_sales),
    window.settledMonth,
  );
  return {
    ...product,
    metrics: calculateProductMetrics(
      product.monthly_qty ?? {},
      product.monthly_sales ?? {},
      periods,
      currentYear,
      previousYear,
    ),
  };
}

export function metricsPeriodInfoFromMetadata(
  metadata: Pick<
    DataMetadata,
    | "metrics_period_start"
    | "metrics_period_end"
    | "metrics_months"
    | "months_list"
    | "period_start"
    | "period_end"
    | "metrics_manual_ready_month"
  > | null,
) {
  if (!metadata) return null;
  const window = resolveMetricsWindow(metadata.metrics_manual_ready_month);
  const raw = metadata.metrics_months?.length
    ? metadata.metrics_months
    : metadata.months_list ?? [];
  const metricsMonths = filterSettledPeriods(raw, window.settledMonth);
  return {
    metricsPeriodStart: metricsMonths[0] || metadata.metrics_period_start || metadata.period_start,
    metricsPeriodEnd:
      metricsMonths[metricsMonths.length - 1] ||
      window.settledMonth ||
      metadata.metrics_period_end ||
      metadata.period_end,
    metricsMonths,
  };
}
