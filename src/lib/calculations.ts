import type {
  StoreData,
  ProductData,
  StatusLong,
  StatusShort,
  StoreWithStatus,
  ProductWithStatus,
} from "@/types/data";
import { MONTH_NAMES_SHORT, MONTH_NAMES_FULL } from "@/lib/periodUtils";
import { formatNumber } from "@/lib/utils";

// ============================================
// LONG TERM STATUS CALCULATION (based on 12v12)
// ============================================

/**
 * Calculate long term status based on 12v12 metric
 *
 * Thresholds:
 * - עליה חדה: >= 20%
 * - צמיחה: >= 10%
 * - יציב: between -10% and 10%
 * - ירידה: < -10%
 * - התרסקות: < -30%
 */
export function calculateStatusLong(
  metric_12v12: number | null | undefined,
): StatusLong {
  const value = metric_12v12 ?? 0;

  if (value >= 20) return "עליה_חדה";
  if (value >= 10) return "צמיחה";
  if (value >= -10) return "יציב";
  if (value >= -30) return "ירידה";
  return "התרסקות";
}

// ============================================
// SHORT TERM STATUS CALCULATION (based on 2v2)
// ============================================

/**
 * Calculate short term status based on 2v2 metric
 *
 * Thresholds:
 * - עליה חדה: >= 15%
 * - יציב: >= -10%
 * - ירידה: >= -25%
 * - אזעקה: < -25%
 */
export function calculateStatusShort(
  metric_2v2: number | null | undefined,
): StatusShort {
  const value = metric_2v2 ?? 0;

  if (value >= 15) return "עליה_חדה";
  if (value >= -10) return "יציב";
  if (value >= -25) return "ירידה";
  return "אזעקה";
}

// ============================================
// ADD STATUS TO STORE/PRODUCT
// ============================================

export function addStatusToStore(store: StoreData): StoreWithStatus {
  return {
    ...store,
    status_long: calculateStatusLong(store.metric_12v12),
    status_short: calculateStatusShort(store.metric_2v2),
  };
}

export function addStatusToProduct(product: ProductData): ProductWithStatus {
  return {
    ...product,
    status_long: calculateStatusLong(product.metric_12v12),
    status_short: calculateStatusShort(product.metric_2v2),
  };
}

export function addStatusToStores(stores: StoreData[]): StoreWithStatus[] {
  return stores.map(addStatusToStore);
}

export function addStatusToProducts(
  products: ProductData[],
): ProductWithStatus[] {
  return products.map(addStatusToProduct);
}

// ============================================
// METRIC COLOR HELPERS
// ============================================

/**
 * Get color class for metric value
 */
export function getMetricColor(value: number | null | undefined): string {
  if (value === null || value === undefined) return "text-gray-400";
  if (value >= 10) return "text-emerald-600";
  if (value >= 0) return "text-green-600";
  if (value >= -10) return "text-gray-600";
  if (value >= -20) return "text-orange-600";
  return "text-red-600";
}

/**
 * Get background color class for metric value
 */
export function getMetricBgColor(value: number | null | undefined): string {
  if (value === null || value === undefined) return "bg-gray-50";
  if (value >= 10) return "bg-emerald-50";
  if (value >= 0) return "bg-green-50";
  if (value >= -10) return "bg-gray-50";
  if (value >= -20) return "bg-orange-50";
  return "bg-red-50";
}

// ============================================
// FORMATTERS
// ============================================

// formatNumber is re-exported from utils.ts (canonical source)
export { formatNumber } from "@/lib/utils";

/**
 * Format currency (ILS) — uses Intl style:currency for locale-correct symbol placement.
 * Note: utils.ts has a different variant (always ₪ prefix); kept separate to preserve display.
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage with sign (showSign=true by default for metric displays).
 * Note: utils.ts has a variant with showSign=false default; kept separate to preserve sign behavior.
 */
export function formatPercent(
  value: number | null | undefined,
  showSign = true,
): string {
  if (value === null || value === undefined) return "-";
  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * Format compact number (K, M)
 */
export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";

  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return formatNumber(value);
}

// ============================================
// AGGREGATIONS
// ============================================

/**
 * Calculate average of metrics across items
 */
export function calculateAverageMetric(
  items: Array<{ [key: string]: number | null | undefined }>,
  metricKey: string,
): number {
  const validItems = items.filter(
    (item) => item[metricKey] !== null && item[metricKey] !== undefined,
  );

  if (validItems.length === 0) return 0;

  const sum = validItems.reduce(
    (acc, item) => acc + (item[metricKey] as number),
    0,
  );
  return sum / validItems.length;
}

/**
 * Count items by status
 */
export function countByStatus<T extends { status_long: StatusLong }>(
  items: T[],
): Record<StatusLong, number> {
  const counts: Record<StatusLong, number> = {
    עליה_חדה: 0,
    צמיחה: 0,
    יציב: 0,
    ירידה: 0,
    התרסקות: 0,
  };

  items.forEach((item) => {
    counts[item.status_long]++;
  });

  return counts;
}

// ============================================
// PERIOD HELPERS
// ============================================

const MONTH_NAMES = MONTH_NAMES_SHORT;

/**
 * Format period (YYYYMM) to Hebrew
 */
export function formatPeriod(period: string): string {
  if (!period || period.length !== 6) return "-";

  const year = period.substring(2, 4);
  const monthIndex = parseInt(period.substring(4, 6), 10) - 1;

  if (monthIndex < 0 || monthIndex > 11) return "-";

  return `${MONTH_NAMES[monthIndex]}'${year}`;
}

/**
 * Format period to full Hebrew
 */
export function formatPeriodFull(period: string): string {
  if (!period || period.length !== 6) return "-";

  const year = period.substring(0, 4);
  const monthIndex = parseInt(period.substring(4, 6), 10) - 1;

  if (monthIndex < 0 || monthIndex > 11) return "-";

  return `${MONTH_NAMES_FULL[monthIndex]} ${year}`;
}

/**
 * Get all periods for a year
 */
export function getYearPeriods(year: number): string[] {
  return Array.from(
    { length: 12 },
    (_, i) => `${year}${(i + 1).toString().padStart(2, "0")}`,
  );
}

/**
 * Get month name by index
 */
export function getMonthName(monthIndex: number, full = false): string {
  if (monthIndex < 0 || monthIndex > 11) return "-";
  const names = full ? MONTH_NAMES_FULL : MONTH_NAMES;
  return names[monthIndex] ?? "-";
}

// ============================================
// SORTING
// ============================================

type SortDirection = "asc" | "desc";

/**
 * Sort stores by metric
 */
export function sortByMetric<T extends Record<string, unknown>>(
  items: T[],
  metricKey: keyof T,
  direction: SortDirection = "desc",
): T[] {
  return [...items].sort((a, b) => {
    const aVal = (a[metricKey] as number) ?? 0;
    const bVal = (b[metricKey] as number) ?? 0;
    return direction === "desc" ? bVal - aVal : aVal - bVal;
  });
}

// ============================================
// FILTERING
// ============================================

export interface StoreFilterOptions {
  search?: string;
  cities?: string[];
  networks?: string[];
  agents?: string[];
  drivers?: string[];
  status_long?: StatusLong[];
  status_short?: StatusShort[];
  minQty?: number;
}

/**
 * Filter stores by multiple criteria (supports multi-select)
 */
export function filterStores(
  stores: StoreWithStatus[],
  filters: StoreFilterOptions,
): StoreWithStatus[] {
  return stores.filter((store) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        store.name.toLowerCase().includes(searchLower) ||
        store.city.toLowerCase().includes(searchLower) ||
        store.network.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // City filter (multi-select)
    if (filters.cities?.length && !filters.cities.includes(store.city))
      return false;

    // Network filter (multi-select)
    if (filters.networks?.length && !filters.networks.includes(store.network))
      return false;

    // Agent filter (multi-select)
    if (filters.agents?.length && !filters.agents.includes(store.agent))
      return false;

    // Driver filter (multi-select)
    if (filters.drivers?.length && !filters.drivers.includes(store.driver))
      return false;

    // Status long filter (multi-select)
    if (
      filters.status_long?.length &&
      !filters.status_long.includes(store.status_long)
    )
      return false;

    // Status short filter (multi-select)
    if (
      filters.status_short?.length &&
      !filters.status_short.includes(store.status_short)
    )
      return false;

    // Min quantity filter
    if (filters.minQty && store.qty_current_year < filters.minQty) return false;

    return true;
  });
}

// ============================================
// METRIC INFO
// ============================================

export const METRIC_INFO = {
  "12v12": {
    label: "שנתי",
    shortLabel: "12v12",
    description: "השוואת סך הכמות בשנה הקודמת מול השנה הנוכחית",
    period: "שנה קודמת → נוכחית",
  },
  "6v6": {
    label: "6 חודשים",
    shortLabel: "6v6",
    description: "השוואת ינו-יונ מול יול-דצמ (H1 מול H2)",
    period: "H1→H2",
  },
  "3v3": {
    label: "3 חודשים",
    shortLabel: "3v3",
    description: "השוואת Q4 השנה הקודמת מול Q4 השנה הנוכחית",
    period: "Q4 שנה קודמת → נוכחית",
  },
  "2v2": {
    label: "2 חודשים",
    shortLabel: "2v2",
    description: "השוואת ספט-אוק מול נוב-דצמ",
    period: "ספט→נוב",
  },
  peak: {
    label: "מרחק מהשיא",
    shortLabel: "שיא",
    description: "החודש האחרון מול ממוצע 4 החודשים הגבוהים",
    period: "",
  },
  returns: {
    label: "חזרות %",
    shortLabel: "חזרות",
    description: "אחוז החזרות מהאספקה",
    period: "",
  },
} as const;
