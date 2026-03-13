import { loadXlsx } from "./loadXlsx";
import { parsePeriod } from "./excelPeriodParser";
import { aggregateRows } from "./excelRowAggregator";
import type { ProcessingResult } from "@/types/supabase";

// Re-export so existing imports keep working
export { parsePeriod, extractPeriods } from "./excelPeriodParser";
export {
  calculateStoreMetrics,
  calculateProductMetrics,
} from "./excelMetricsCalculator";

// ============================================
// MAIN PROCESSING FUNCTION
// ============================================

function makeEmptyError(error: string, processingTimeMs = 0): ProcessingResult {
  return {
    success: false,
    error,
    stores: [],
    products: [],
    storeProducts: [],
    filters: { cities: [], networks: [], drivers: [], agents: [], categories: [] },
    periods: { all: [], start: "", end: "", currentYear: 0, previousYear: 0 },
    stats: { rowsCount: 0, storesCount: 0, productsCount: 0, processingTimeMs },
  };
}

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
    if (!sheetName) return makeEmptyError("הקובץ ריק");

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return makeEmptyError("גיליון לא נמצא");

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
    if (rows.length === 0) return makeEmptyError("אין נתונים בקובץ");

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

    // Validate required columns
    const requiredGroups: string[][] = [
      ["חודש ושנה", "חודש"],
      ["מזהה לקוח"],
      ["שם לקוח", "לקוח"],
      ["מזהה מוצר"],
      ["מוצר"],
    ];
    const missing = requiredGroups
      .filter((group) => group.every((k) => !columnMap[k.trim()]))
      .map((group) => group[0]);
    if (missing.length > 0) {
      return makeEmptyError(`חסרות עמודות נדרשות: ${missing.join(", ")}`);
    }

    // Extract periods
    const periodsSet = new Set<string>();
    for (const row of rows) {
      const p = parsePeriod(String(getVal(row, ["חודש ושנה", "חודש"]) ?? ""));
      if (p) periodsSet.add(p.key);
    }
    const periods = Array.from(periodsSet).sort();
    if (periods.length === 0) {
      return makeEmptyError(
        "לא נמצאו תאריכים תקינים (פורמט: 1 - 2025 או 01/2025)",
      );
    }

    const periodStart = periods[0]!;
    const periodEnd = periods[periods.length - 1]!;
    const currentYear = parseInt(periodEnd.slice(0, 4), 10);
    const previousYear = currentYear - 1;

    // Aggregate rows
    const { storesMap, productsMap, storeProductsMap, cities, networks, drivers, agents, categories, rowsSkipped, skipReasons } =
      aggregateRows(rows, getVal);

    if (storesMap.size === 0) return makeEmptyError("אין נתונים בקובץ");

    const processingTimeMs = Date.now() - startTime;

    // Compute file-level totals for validation (from aggregated store data only)
    let totalGrossQty = 0;
    let totalNetQty = 0;
    let totalReturnsQty = 0;
    let totalSalesAmount = 0;
    Array.from(storesMap.values()).forEach((store) => {
      Object.values(store.monthly_gross).forEach((v) => { totalGrossQty += v; });
      Object.values(store.monthly_qty).forEach((v) => { totalNetQty += v; });
      Object.values(store.monthly_returns).forEach((v) => { totalReturnsQty += v; });
      Object.values(store.monthly_sales).forEach((v) => { totalSalesAmount += v; });
    });

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
        rowsSkipped,
        skipReasons,
        storesCount: storesMap.size,
        productsCount: productsMap.size,
        storeProductsCount: storeProductsMap.size,
        totalGrossQty,
        totalNetQty,
        totalReturnsQty,
        totalSalesAmount,
        processingTimeMs,
      },
    };
  } catch (error) {
    return makeEmptyError(
      error instanceof Error ? error.message : "שגיאה לא ידועה",
      Date.now() - startTime,
    );
  }
}
