// ============================================
// DELIVERY EXCEL PROCESSOR
// מעבד קבצי Excel של תעודות משלוח
// ============================================

import { loadXlsx } from "./loadXlsx";
import type {
  AggregatedDelivery,
  DeliveryProcessingResult,
} from "@/types/deliveries";

// ============================================
// COLUMN NAMES (Hebrew) - כולל וריאציות נפוצות
// ============================================

const COLUMNS = {
  documentDate: "תאריך מסמך",
  type: "סוג",
  customerId: "מזהה לקוח",
  customerName: "שם לקוח",
  week: "שבוע",
  year: "שנה",
  value: "ערך כספי(לפני מעמ)",
  quantity: "כמות", // optional
} as const;

// וריאציות של שמות עמודות (רווחים, ניקוד וכו')
const COLUMN_ALIASES: Record<string, string[]> = {
  documentDate: ["תאריך מסמך", "תאריך מסמך ", " תאריך מסמך"],
  customerId: ["מזהה לקוח", "מזהה לקוח ", " מזהה לקוח"],
  customerName: ["שם לקוח", "שם לקוח ", " שם לקוח"],
  value: [
    "ערך כספי(לפני מעמ)",
    "ערך כספי (לפני מעמ)",
    "ערך כספי(לפני מעמ) ",
    "ערך כספי (לפני מעמ)",
  ],
};

// ============================================
// DATE PARSING
// ============================================

function parseDocumentDate(
  dateValue: unknown,
  // eslint-disable-next-line
  XLSX?: { SSF?: { parse_date_code?: (v: number) => unknown } },
): { year: number; month: number; week: number } | null {
  if (!dateValue) return null;

  let date: Date | null = null;

  // Handle JS Date object (Excel with cellDates: true)
  if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
    date = dateValue;
  }
  // Handle Excel serial number
  else if (typeof dateValue === "number") {
    if (XLSX?.SSF?.parse_date_code) {
      date = XLSX.SSF.parse_date_code(dateValue) as unknown as Date;
    } else {
      const epoch = new Date(1899, 11, 30);
      date = new Date(epoch.getTime() + dateValue * 86400000);
    }
    if (date && typeof date === "object" && "y" in date) {
      const excelDate = date as unknown as { y: number; m: number; d: number };
      date = new Date(excelDate.y, excelDate.m - 1, excelDate.d);
    }
  }
  // Handle string date
  else if (typeof dateValue === "string") {
    // Try DD-MM-YYYY or DD/MM/YYYY
    const patterns = [
      /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/, // DD-MM-YYYY
      /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/, // YYYY-MM-DD
    ];

    for (const pattern of patterns) {
      const match = dateValue.match(pattern);
      if (match) {
        const d = match[1] ?? "0";
        const m = match[2] ?? "0";
        const y = match[3] ?? "0";
        if (pattern === patterns[0]) {
          date = new Date(
            parseInt(y, 10),
            parseInt(m, 10) - 1,
            parseInt(d, 10),
          );
        } else {
          date = new Date(
            parseInt(d, 10),
            parseInt(m, 10) - 1,
            parseInt(y, 10),
          );
        }
        break;
      }
    }
  }

  if (!date || isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  // Calculate week number (ISO week)
  const firstDayOfYear = new Date(year, 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);

  return { year, month, week };
}

// ============================================
// MAIN PROCESSOR
// ============================================

export async function processDeliveryExcel(
  file: File,
): Promise<DeliveryProcessingResult> {
  const startTime = performance.now();

  try {
    const XLSX = await loadXlsx();
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return {
        success: false,
        deliveries: [],
        stats: getEmptyStats(),
        error: "הקובץ ריק",
      };
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      return {
        success: false,
        deliveries: [],
        stats: getEmptyStats(),
        error: "לא נמצא גיליון בקובץ",
      };
    }
    // קרא כ-array של arrays כדי לאתר שורת כותרות (לפעמים לא בשורה הראשונה)
    const rawRows = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      defval: "",
    });
    if (rawRows.length === 0) {
      return {
        success: false,
        deliveries: [],
        stats: getEmptyStats(),
        error: "לא נמצאו שורות בקובץ",
      };
    }

    const { headerRowIndex, columnMap, missingColumns } =
      findHeaderRowAndMap(rawRows);
    if (missingColumns.length > 0) {
      return {
        success: false,
        deliveries: [],
        stats: getEmptyStats(),
        error: `עמודות חסרות: ${missingColumns.join(", ")}`,
      };
    }

    // המר ל-objects לפי המיפוי
    const rows = rawRows
      .slice(headerRowIndex + 1)
      .filter(
        (r): r is string[] =>
          Array.isArray(r) &&
          r.some((c) => c != null && String(c).trim() !== ""),
      )
      .map((row) => {
        const obj: Record<string, unknown> = {};
        for (const [key, colIndex] of Object.entries(columnMap)) {
          const val = row[colIndex];
          obj[key] =
            val !== undefined && val !== null && val !== "" ? val : undefined;
        }
        return obj;
      });

    if (rows.length === 0) {
      return {
        success: false,
        deliveries: [],
        stats: getEmptyStats(),
        error: "לא נמצאו שורות נתונים אחרי שורת הכותרות",
      };
    }

    // Process rows
    const { deliveries, stats } = aggregateDeliveries(rows, columnMap);

    const processingTime = Math.round(performance.now() - startTime);

    return {
      success: true,
      deliveries,
      stats: {
        ...stats,
        processingTimeMs: processingTime,
      },
    };
  } catch (error) {
    console.error("[deliveryExcelProcessor] Error:", error);
    return {
      success: false,
      deliveries: [],
      stats: getEmptyStats(),
      error: error instanceof Error ? error.message : "שגיאה בעיבוד הקובץ",
    };
  }
}

// ============================================
// HEADER ROW DETECTION & COLUMN MAPPING
// ============================================

function normalizeHeader(val: unknown): string {
  return String(val ?? "").trim();
}

function findHeaderRowAndMap(rawRows: string[][]): {
  headerRowIndex: number;
  columnMap: Record<string, number>;
  missingColumns: string[];
} {
  const required = [
    "documentDate",
    "customerId",
    "customerName",
    "value",
  ] as const;
  const requiredLabels = [
    COLUMNS.documentDate,
    COLUMNS.customerId,
    COLUMNS.customerName,
    COLUMNS.value,
  ];

  // סרוק את 15 השורות הראשונות
  const maxScan = Math.min(15, rawRows.length);
  for (let rowIdx = 0; rowIdx < maxScan; rowIdx++) {
    const row = rawRows[rowIdx];
    if (!Array.isArray(row) || row.length === 0) continue;

    const normalizedHeaders = row.map((c, i) => ({
      raw: c,
      normalized: normalizeHeader(c),
      index: i,
    }));
    const columnMap: Record<string, number> = {};
    const missing: string[] = [];

    for (let i = 0; i < required.length; i++) {
      const key = required[i];
      const expected = requiredLabels[i] ?? "";
      const aliases = (key &&
        (COLUMN_ALIASES as Record<string, string[]>)[key]) ?? [expected];
      const found = normalizedHeaders.find(
        (h) =>
          aliases.some((a) => normalizeHeader(a) === h.normalized) ||
          normalizeHeader(expected) === h.normalized,
      );
      if (found && key) {
        columnMap[key] = found.index;
      } else {
        missing.push(expected);
      }
    }

    if (missing.length === 0) {
      const qIdx = normalizedHeaders.find(
        (h) => normalizeHeader(COLUMNS.quantity) === h.normalized,
      )?.index;
      if (qIdx !== undefined && qIdx >= 0) columnMap.quantity = qIdx;
      return { headerRowIndex: rowIdx, columnMap, missingColumns: [] };
    }
  }

  return { headerRowIndex: 0, columnMap: {}, missingColumns: requiredLabels };
}

// ============================================
// AGGREGATION
// ============================================

interface AggregationKey {
  storeId: number;
  storeName: string;
  year: number;
  month: number;
  week: number;
}

interface AggregationData {
  count: number;
  value: number;
  quantity: number;
}

function aggregateDeliveries(
  rows: Record<string, unknown>[],
  _columnMap?: Record<string, number>,
): {
  deliveries: AggregatedDelivery[];
  stats: Omit<DeliveryProcessingResult["stats"], "processingTimeMs">;
} {
  const weeklyMap = new Map<
    string,
    { key: AggregationKey } & AggregationData
  >();
  const monthlyMap = new Map<
    string,
    { key: Omit<AggregationKey, "week"> } & AggregationData
  >();

  let rowsProcessed = 0;
  let rowsFiltered = 0;
  let totalValue = 0;
  let minPeriod = "999999";
  let maxPeriod = "000000";
  const hasQuantityColumn =
    rows.length > 0 &&
    "quantity" in (rows[0] ?? {}) &&
    (rows[0]?.quantity ?? "") !== "";

  for (const row of rows) {
    const value = Number(row.value) || 0;

    const customerId = Number(row.customerId);
    const customerName = String(row.customerName || "");

    if (!customerId || !customerName) {
      rowsFiltered++;
      continue;
    }

    if (value === 0) {
      rowsFiltered++;
      continue;
    }

    // Parse date
    const dateInfo = parseDocumentDate(row.documentDate);
    if (!dateInfo) {
      rowsFiltered++;
      continue;
    }

    const quantity = hasQuantityColumn ? Number(row.quantity) || 0 : 0;

    rowsProcessed++;
    totalValue += value;

    const { year, month, week } = dateInfo;
    const periodKey = `${year}${String(month).padStart(2, "0")}`;

    if (periodKey < minPeriod) minPeriod = periodKey;
    if (periodKey > maxPeriod) maxPeriod = periodKey;

    // Weekly aggregation
    const weekKey = `${customerId}-${year}-${month}-${week}`;
    const existingWeek = weeklyMap.get(weekKey);
    if (existingWeek) {
      existingWeek.count++;
      existingWeek.value += value;
      existingWeek.quantity += quantity;
    } else {
      weeklyMap.set(weekKey, {
        key: {
          storeId: customerId,
          storeName: customerName,
          year,
          month,
          week,
        },
        count: 1,
        value,
        quantity,
      });
    }

    // Monthly aggregation
    const monthKey = `${customerId}-${year}-${month}`;
    const existingMonth = monthlyMap.get(monthKey);
    if (existingMonth) {
      existingMonth.count++;
      existingMonth.value += value;
      existingMonth.quantity += quantity;
    } else {
      monthlyMap.set(monthKey, {
        key: { storeId: customerId, storeName: customerName, year, month },
        count: 1,
        value,
        quantity,
      });
    }
  }

  // Convert to delivery arrays
  const deliveries: AggregatedDelivery[] = [];

  // Add weekly records
  Array.from(weeklyMap.values()).forEach(({ key, count, value, quantity }) => {
    deliveries.push({
      storeExternalId: key.storeId,
      storeName: key.storeName,
      year: key.year,
      month: key.month,
      week: key.week,
      deliveriesCount: count,
      totalValue: value,
      totalQuantity: quantity,
    });
  });

  // Add monthly totals (week = null)
  Array.from(monthlyMap.values()).forEach(({ key, count, value, quantity }) => {
    deliveries.push({
      storeExternalId: key.storeId,
      storeName: key.storeName,
      year: key.year,
      month: key.month,
      week: null,
      deliveriesCount: count,
      totalValue: value,
      totalQuantity: quantity,
    });
  });

  // Count unique stores
  const uniqueStores = new Set(deliveries.map((d) => d.storeExternalId));

  return {
    deliveries,
    stats: {
      rowsProcessed,
      rowsFiltered,
      storesCount: uniqueStores.size,
      totalDeliveries: rowsProcessed,
      totalValue,
      periodStart: minPeriod === "999999" ? "" : minPeriod,
      periodEnd: maxPeriod === "000000" ? "" : maxPeriod,
    },
  };
}

// ============================================
// HELPERS
// ============================================

function getEmptyStats(): DeliveryProcessingResult["stats"] {
  return {
    rowsProcessed: 0,
    rowsFiltered: 0,
    storesCount: 0,
    totalDeliveries: 0,
    totalValue: 0,
    periodStart: "",
    periodEnd: "",
    processingTimeMs: 0,
  };
}
