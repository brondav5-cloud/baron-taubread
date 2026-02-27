import { loadXlsx } from "./loadXlsx";
import {
  buildRolling24Window,
  buildRollingPairWindow,
  buildRollingYoYWindow,
} from "@/lib/periods";
import type {
  ExcelRow,
  ParsedPeriod,
  AggregatedStore,
  AggregatedProduct,
  AggregatedStoreProduct,
  ProcessingResult,
  MonthlyData,
  StoreMetrics,
  ProductMetrics,
} from "@/types/supabase";

// ============================================
// PERIOD PARSING
// ============================================

/**
 * Parse period string like "1 - 2025" to structured data
 */
export function parsePeriod(periodStr: string): ParsedPeriod | null {
  // Handle formats: "1 - 2025", "01/2025", "2025-01"
  const patterns = [
    /^(\d{1,2})\s*-\s*(\d{4})$/, // "1 - 2025"
    /^(\d{1,2})\/(\d{4})$/, // "01/2025"
    /^(\d{4})-(\d{1,2})$/, // "2025-01"
  ];

  for (const pattern of patterns) {
    const match = periodStr.trim().match(pattern);
    if (match && match[1] && match[2]) {
      const isYearFirst = pattern === patterns[2];
      const month = parseInt(isYearFirst ? match[2] : match[1], 10);
      const year = parseInt(isYearFirst ? match[1] : match[2], 10);

      if (month >= 1 && month <= 12 && year >= 2020 && year <= 2100) {
        const key = `${year}${String(month).padStart(2, "0")}`;
        return { month, year, key };
      }
    }
  }

  return null;
}

/**
 * Get all unique periods sorted
 */
export function extractPeriods(rows: ExcelRow[]): string[] {
  const periodsSet = new Set<string>();

  for (const row of rows) {
    const periodVal = row["חודש ושנה"] ?? row["חודש"] ?? "";
    const period = parsePeriod(String(periodVal));
    if (period) {
      periodsSet.add(period.key);
    }
  }

  return Array.from(periodsSet).sort();
}

// ============================================
// METRICS CALCULATION
// ============================================

/**
 * Calculate status based on metric value
 */
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

/**
 * Calculate percentage change
 */
function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/**
 * Sum values for specific months
 */
function sumMonths(data: MonthlyData, months: string[]): number {
  return months.reduce((sum, m) => sum + (data[m] || 0), 0);
}

/**
 * Calculate all metrics for a store
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

  // ============================================
  // 12v12: Last 12 months vs Previous 12 months
  // ============================================
  const qtyLast12 = sumMonths(monthlyQty, w12.current);
  const qtyPrev12 = sumMonths(monthlyQty, w12.previous);
  const metric12v12 = calcChange(qtyLast12, qtyPrev12);

  // ============================================
  // 6v6: Last 6 months vs Previous 6 months
  // ============================================
  const qtyLast6 = sumMonths(monthlyQty, w6.current);
  const qtyPrev6 = sumMonths(monthlyQty, w6.previous);
  const metric6v6 = calcChange(qtyLast6, qtyPrev6);

  // ============================================
  // 3v3 / YoY 3M: Last 3 months vs SAME 3 months previous year
  // ============================================
  const qtyLast3 = sumMonths(monthlyQty, yoy3.current);
  const qtySame3PrevYear = sumMonths(monthlyQty, yoy3.previousYear);
  const metric3v3 = calcChange(qtyLast3, qtySame3PrevYear);

  // ============================================
  // 2v2: Last 2 months vs Previous 2 months
  // ============================================
  const qtyLast2 = sumMonths(monthlyQty, w2.current);
  const qtyPrev2 = sumMonths(monthlyQty, w2.previous);
  const metric2v2 = calcChange(qtyLast2, qtyPrev2);

  // ============================================
  // Yearly totals (for display)
  // ============================================
  const currentYearMonths = sortedPeriods.filter((p) =>
    p.startsWith(String(currentYear)),
  );
  const previousYearMonths = sortedPeriods.filter((p) =>
    p.startsWith(String(previousYear)),
  );
  const qtyCurrentYear = sumMonths(monthlyQty, currentYearMonths);
  const qtyPreviousYear = sumMonths(monthlyQty, previousYearMonths);

  // Sales calculations
  const grossCurrent = sumMonths(monthlyGross, currentYearMonths);
  const grossPrevious = sumMonths(monthlyGross, previousYearMonths);
  const returnsCurrent = sumMonths(monthlyReturns, currentYearMonths);
  const returnsPrevious = sumMonths(monthlyReturns, previousYearMonths);
  const salesCurrentYear = grossCurrent - returnsCurrent;
  const salesPreviousYear = grossPrevious - returnsPrevious;

  // ============================================
  // Peak distance
  // ============================================
  const qtyValues = Object.values(monthlyQty).filter((v) => v > 0);
  const peakValue = qtyValues.length > 0 ? Math.max(...qtyValues) : 0;
  const lastPeriod = sortedPeriods[sortedPeriods.length - 1];
  const currentValue = lastPeriod ? monthlyQty[lastPeriod] || 0 : 0;
  const metricPeakDistance =
    peakValue > 0 ? calcChange(currentValue, peakValue) : 0;

  // ============================================
  // Returns percentage
  // ============================================
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
    // Yearly totals
    qty_current_year: qtyCurrentYear,
    qty_previous_year: qtyPreviousYear,
    sales_current_year: salesCurrentYear,
    sales_previous_year: salesPreviousYear,

    // Metrics (percentages)
    metric_12v12: metric12v12,
    metric_6v6: metric6v6,
    metric_3v3: metric3v3,
    metric_2v2: metric2v2,

    // Absolute values for display under percentages
    qty_12v12_current: qtyLast12,
    qty_12v12_previous: qtyPrev12,
    qty_6v6_current: qtyLast6,
    qty_6v6_previous: qtyPrev6,
    qty_3v3_current: qtyLast3,
    qty_3v3_previous: qtySame3PrevYear,
    qty_2v2_current: qtyLast2,
    qty_2v2_previous: qtyPrev2,

    // Peak
    metric_peak_distance: metricPeakDistance,
    peak_value: peakValue,
    current_value: currentValue,

    // Returns
    returns_pct_current: returnsPctCurrent,
    returns_pct_previous: returnsPctPrevious,
    returns_change:
      Math.round((returnsPctCurrent - returnsPctPrevious) * 10) / 10,

    // Status
    status_long: calculateStatusLong(metric12v12),
    status_short: calculateStatusShort(metric2v2),
  };
}

/**
 * Calculate metrics for a product
 * Same logic as stores
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

  // 12v12
  const qtyLast12 = sumMonths(monthlyQty, w12.current);
  const qtyPrev12 = sumMonths(monthlyQty, w12.previous);
  const metric12v12 = calcChange(qtyLast12, qtyPrev12);

  // 6v6
  const qtyLast6 = sumMonths(monthlyQty, w6.current);
  const qtyPrev6 = sumMonths(monthlyQty, w6.previous);
  const metric6v6 = calcChange(qtyLast6, qtyPrev6);

  // 3v3 / YoY 3M - Same months previous year
  const qtyLast3 = sumMonths(monthlyQty, yoy3.current);
  const qtySame3PrevYear = sumMonths(monthlyQty, yoy3.previousYear);
  const metric3v3 = calcChange(qtyLast3, qtySame3PrevYear);

  // 2v2
  const qtyLast2 = sumMonths(monthlyQty, w2.current);
  const qtyPrev2 = sumMonths(monthlyQty, w2.previous);
  const metric2v2 = calcChange(qtyLast2, qtyPrev2);

  // Yearly totals
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
    // Absolute values
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

// ============================================
// MAIN PROCESSING FUNCTION
// ============================================

/**
 * Process Excel file and return aggregated data
 */
export async function processExcelFile(file: File): Promise<ProcessingResult> {
  const startTime = Date.now();

  try {
    const XLSX = await loadXlsx();
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return {
        success: false,
        error: "הקובץ ריק",
        stores: [],
        products: [],
        storeProducts: [],
        filters: {
          cities: [],
          networks: [],
          drivers: [],
          agents: [],
          categories: [],
        },
        periods: {
          all: [],
          start: "",
          end: "",
          currentYear: 0,
          previousYear: 0,
        },
        stats: {
          rowsCount: 0,
          storesCount: 0,
          productsCount: 0,
          processingTimeMs: 0,
        },
      };
    }
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      return {
        success: false,
        error: "גיליון לא נמצא",
        stores: [],
        products: [],
        storeProducts: [],
        filters: {
          cities: [],
          networks: [],
          drivers: [],
          agents: [],
          categories: [],
        },
        periods: {
          all: [],
          start: "",
          end: "",
          currentYear: 0,
          previousYear: 0,
        },
        stats: {
          rowsCount: 0,
          storesCount: 0,
          productsCount: 0,
          processingTimeMs: 0,
        },
      };
    }
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

    if (rows.length === 0) {
      return {
        success: false,
        error: "אין נתונים בקובץ",
        stores: [],
        products: [],
        storeProducts: [],
        filters: {
          cities: [],
          networks: [],
          drivers: [],
          agents: [],
          categories: [],
        },
        periods: {
          all: [],
          start: "",
          end: "",
          currentYear: 0,
          previousYear: 0,
        },
        stats: {
          rowsCount: 0,
          storesCount: 0,
          productsCount: 0,
          processingTimeMs: 0,
        },
      };
    }

    // Strip invisible Unicode characters (RTL marks, BOM, zero-width spaces, etc.)
    const normalizeCol = (s: string) =>
      s
        .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF\u00A0]/g, "")
        .trim()
        .replace(/\s+/g, " ");

    // Build columnMap from ALL rows — some columns (e.g. "רשת") may be empty
    // in the first row and would be missed if we only scan rows[0]
    const columnMap: Record<string, string> = {};
    for (const row of rows) {
      for (const col of Object.keys(row)) {
        const normalized = normalizeCol(col);
        if (!columnMap[normalized]) columnMap[normalized] = col;
      }
    }
    const getVal = (
      row: Record<string, unknown>,
      keys: string[],
    ): string | number | undefined => {
      for (const key of keys) {
        const excelCol = columnMap[normalizeCol(key)];
        if (excelCol && row[excelCol] !== undefined && row[excelCol] !== null)
          return row[excelCol] as string | number;
      }
      return undefined;
    };
    // Support multiple column name variants (old and new formats)
    const requiredGroups: string[][] = [
      ["חודש ושנה", "חודש"],
      ["מזהה לקוח"],
      ["שם לקוח", "לקוח"],
      ["מזהה מוצר"],
      ["מוצר"],
    ];
    const missing = requiredGroups.filter((group) =>
      group.every((k) => !columnMap[k.trim()]),
    ).map((group) => group[0]);
    if (missing.length > 0) {
      return {
        success: false,
        error: `חסרות עמודות נדרשות: ${missing.join(", ")}`,
        stores: [],
        products: [],
        storeProducts: [],
        filters: {
          cities: [],
          networks: [],
          drivers: [],
          agents: [],
          categories: [],
        },
        periods: {
          all: [],
          start: "",
          end: "",
          currentYear: 0,
          previousYear: 0,
        },
        stats: {
          rowsCount: 0,
          storesCount: 0,
          productsCount: 0,
          processingTimeMs: 0,
        },
      };
    }

    const periodsSet = new Set<string>();
    for (const row of rows) {
      const p = parsePeriod(String(getVal(row, ["חודש ושנה", "חודש"]) ?? ""));
      if (p) periodsSet.add(p.key);
    }
    const periods = Array.from(periodsSet).sort();
    if (periods.length === 0) {
      return {
        success: false,
        error: "לא נמצאו תאריכים תקינים (פורמט: 1 - 2025 או 01/2025)",
        stores: [],
        products: [],
        storeProducts: [],
        filters: {
          cities: [],
          networks: [],
          drivers: [],
          agents: [],
          categories: [],
        },
        periods: {
          all: [],
          start: "",
          end: "",
          currentYear: 0,
          previousYear: 0,
        },
        stats: {
          rowsCount: 0,
          storesCount: 0,
          productsCount: 0,
          processingTimeMs: 0,
        },
      };
    }
    const periodStart = periods[0]!;
    const periodEnd = periods[periods.length - 1]!;
    const currentYear = parseInt(periodEnd.slice(0, 4), 10);
    const previousYear = currentYear - 1;

    const storesMap = new Map<number, AggregatedStore>();
    const productsMap = new Map<number, AggregatedProduct>();
    const storeProductsMap = new Map<string, AggregatedStoreProduct>();
    const cities = new Set<string>();
    const networks = new Set<string>();
    const drivers = new Set<string>();
    const agents = new Set<string>();
    const categories = new Set<string>();
    const qtyNetKeys = ["כמות נטו", "כמות נטו ", "סה\"כ כמות", "סהכ כמות"];
    const salesKeys = ["סך מחזור מכירות", "סך מחזור מכירות ", "סהכ", "סה\"כ"];
    const qtySuppliedKeys = ["כמות שסופק", "כמות שסופק ", "כמות"];
    const periodKeys = ["חודש ושנה", "חודש"];
    const storeNameKeys = ["שם לקוח", "לקוח"];

    for (const row of rows) {
      const period = parsePeriod(String(getVal(row, periodKeys) ?? ""));
      if (!period) continue;
      const storeIdRaw = getVal(row, ["מזהה לקוח"]);
      const productIdRaw = getVal(row, ["מזהה מוצר"]);
      const storeId =
        typeof storeIdRaw === "number"
          ? storeIdRaw
          : parseInt(String(storeIdRaw ?? 0), 10);
      const productId =
        typeof productIdRaw === "number"
          ? productIdRaw
          : parseInt(String(productIdRaw ?? 0), 10);
      if (!storeId || !productId) continue;
      const city = String(getVal(row, ["עיר"]) ?? "").trim();
      const network = String(getVal(row, ["רשת"]) ?? "").trim();
      const driver = String(getVal(row, ["נהג"]) ?? "").trim();
      const agent = String(getVal(row, ["סוכן"]) ?? "").trim();
      const category = String(getVal(row, ["קטגורית מוצרים"]) ?? "").trim();
      if (city) cities.add(city);
      if (network) networks.add(network);
      if (driver) drivers.add(driver);
      if (agent) agents.add(agent);
      if (category) categories.add(category);
      const parseNum = (v: unknown): number => {
        if (typeof v === "number") return v;
        if (typeof v === "string") return Number(v.replace(/[₪,\s]/g, "")) || 0;
        return 0;
      };
      const qtyNet = parseNum(getVal(row, qtyNetKeys));
      const sales = parseNum(getVal(row, salesKeys));
      const qtySupplied = parseNum(getVal(row, qtySuppliedKeys));
      const returnsVal = parseNum(getVal(row, ["חזרות"]));
      if (!storesMap.has(storeId)) {
        storesMap.set(storeId, {
          external_id: storeId,
          name: String(getVal(row, storeNameKeys) ?? `לקוח ${storeId}`),
          city,
          network,
          driver,
          agent,
          monthly_qty: {},
          monthly_sales: {},
          monthly_gross: {},
          monthly_returns: {},
        });
      }
      const store = storesMap.get(storeId)!;
      store.monthly_qty[period.key] =
        (store.monthly_qty[period.key] || 0) + qtyNet;
      store.monthly_sales[period.key] =
        (store.monthly_sales[period.key] || 0) + sales;
      store.monthly_gross[period.key] =
        (store.monthly_gross[period.key] || 0) + qtySupplied;
      store.monthly_returns[period.key] =
        (store.monthly_returns[period.key] || 0) + returnsVal;
      if (!productsMap.has(productId)) {
        productsMap.set(productId, {
          external_id: productId,
          name: String(getVal(row, ["מוצר"]) ?? `מוצר ${productId}`),
          category,
          monthly_qty: {},
          monthly_sales: {},
        });
      }
      const product = productsMap.get(productId)!;
      product.monthly_qty[period.key] =
        (product.monthly_qty[period.key] || 0) + qtyNet;
      product.monthly_sales[period.key] =
        (product.monthly_sales[period.key] || 0) + sales;
      const spKey = `${storeId}_${productId}`;
      const productName = String(getVal(row, ["מוצר"]) ?? `מוצר ${productId}`);
      if (!storeProductsMap.has(spKey)) {
        storeProductsMap.set(spKey, {
          store_external_id: storeId,
          product_external_id: productId,
          product_name: productName,
          product_category: category,
          monthly_qty: {},
          monthly_sales: {},
        });
      }
      const sp = storeProductsMap.get(spKey)!;
      sp.monthly_qty[period.key] = (sp.monthly_qty[period.key] || 0) + qtyNet;
      sp.monthly_sales[period.key] =
        (sp.monthly_sales[period.key] || 0) + sales;
    }

    if (storesMap.size === 0) {
      return {
        success: false,
        error: "אין נתונים בקובץ",
        stores: [],
        products: [],
        storeProducts: [],
        filters: {
          cities: [],
          networks: [],
          drivers: [],
          agents: [],
          categories: [],
        },
        periods: {
          all: [],
          start: "",
          end: "",
          currentYear: 0,
          previousYear: 0,
        },
        stats: {
          rowsCount: 0,
          storesCount: 0,
          productsCount: 0,
          processingTimeMs: 0,
        },
      };
    }

    const processingTimeMs = Date.now() - startTime;

    return {
      success: true,
      stores: Array.from(storesMap.values()),
      products: Array.from(productsMap.values()),
      storeProducts: Array.from(storeProductsMap.values()),
      filters: {
        cities: Array.from(cities).sort((a, b) => a.localeCompare(b, "he")),
        networks: Array.from(networks).sort((a, b) => a.localeCompare(b, "he")),
        drivers: Array.from(drivers).sort((a, b) => a.localeCompare(b, "he")),
        agents: Array.from(agents).sort((a, b) => a.localeCompare(b, "he")),
        categories: Array.from(categories).sort((a, b) =>
          a.localeCompare(b, "he"),
        ),
      },
      periods: {
        all: periods,
        start: periodStart,
        end: periodEnd,
        currentYear,
        previousYear,
      },
      stats: {
        rowsCount: rows.length,
        storesCount: storesMap.size,
        productsCount: productsMap.size,
        processingTimeMs,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "שגיאה לא ידועה",
      stores: [],
      products: [],
      storeProducts: [],
      filters: {
        cities: [],
        networks: [],
        drivers: [],
        agents: [],
        categories: [],
      },
      periods: { all: [], start: "", end: "", currentYear: 0, previousYear: 0 },
      stats: {
        rowsCount: 0,
        storesCount: 0,
        productsCount: 0,
        processingTimeMs: Date.now() - startTime,
      },
    };
  }
}
