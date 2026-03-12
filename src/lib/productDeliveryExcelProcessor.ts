// ============================================================
// PRODUCT DELIVERY EXCEL PROCESSOR
// מעבד קובץ "פירוט מוצרים" — נתונים שבועיים לפי חנות+מוצר
//
// Column layout (as seen in the file):
//   0  מסמך           (document type — "תעודת משלוח")
//   1  תאריך מסמך     (delivery date  — "DD-MM-YYYY")
//   2  חודש
//   3  שבוע            (week start date — "YYYY-MM-DD")
//   4  יום
//   5  מזהה לקוח      (store external ID)
//   6  שם לקוח        (store name)
//   7  רשת
//   8  עיר
//   9  שם מוצר        (product name)
//  10  קטגורית מוצרים
//  11  כמות            (gross qty)
//  12  החזרות          (returns qty)
//  13  חזרות(%)
//  14  סהכ כמות        (net qty)
//  15  הנחה
//  16  סהכ לפני הנחה
//  17  סהכ
//  18  קו
//  19  נהג
// ============================================================

import { loadXlsx } from "./loadXlsx";
import type {
  AggregatedWeeklyRecord,
  StoreDeliveryAggregate,
  ProductDeliveryProcessingResult,
} from "@/types/productDeliveries";

// Compute ISO week number (1-53) from a Date
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// ============================================================
// REQUIRED COLUMN NAMES
// ============================================================

const REQUIRED_COLS = {
  documentDate: "תאריך מסמך",
  customerId:   "מזהה לקוח",
  customerName: "שם לקוח",
  productName:  "שם מוצר",
  grossQty:     "כמות",
  returnsQty:   "החזרות",
  netQty:       "סהכ כמות",
  weekStart:    "שבוע",
} as const;

// Alternative spellings that appear in the file
const COL_ALIASES: Record<string, string[]> = {
  netQty:     ["סהכ כמות", "סה\"כ כמות", "סה'כ כמות"],
  grossQty:   ["כמות"],
  returnsQty: ["החזרות"],
  weekStart:  ["שבוע"],
};

// Networks to exclude from processing (wholesale/non-distribution channels)
const EXCLUDED_NETWORKS = new Set(["בלנדר איגור"]);

// ============================================================
// NORMALISE HELPERS
// ============================================================

function normalizeHeader(v: unknown): string {
  return String(v ?? "").trim();
}

function normalizeProductName(name: string): string {
  return name.trim().toLowerCase();
}

// Parse week start date from the "שבוע" column.
// The file stores it as "YYYY-MM-DD" string or as an Excel date serial.
function parseWeekDate(
  v: unknown,
  XLSX?: { SSF?: { parse_date_code?: (n: number) => unknown } },
): { weekStartDate: string; year: number; month: number } | null {
  if (v == null || v === "") return null;

  // Already a JS Date (cellDates: true)
  if (v instanceof Date && !isNaN(v.getTime())) {
    const year  = v.getFullYear();
    const month = v.getMonth() + 1;
    const day   = v.getDate();
    return {
      weekStartDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      year,
      month,
    };
  }

  // String "YYYY-MM-DD" or "DD-MM-YYYY" or "YYYY/MM/DD"
  if (typeof v === "string") {
    const s = v.trim();
    // YYYY-MM-DD
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) {
      const year = parseInt(m[1]!, 10);
      const month = parseInt(m[2]!, 10);
      const day = parseInt(m[3]!, 10);
      if (year >= 2000 && year <= 2040) {
        return {
          weekStartDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          year,
          month,
        };
      }
    }
    // DD-MM-YYYY or DD/MM/YYYY
    m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (m) {
      const day   = parseInt(m[1]!, 10);
      const month = parseInt(m[2]!, 10);
      const year  = parseInt(m[3]!, 10);
      if (year >= 2000 && year <= 2040) {
        return {
          weekStartDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          year,
          month,
        };
      }
    }
  }

  // Excel serial number
  if (typeof v === "number" && v > 36526 && v < 58849) {
    let date: Date | null = null;
    if (XLSX?.SSF?.parse_date_code) {
      const p = XLSX.SSF.parse_date_code(v);
      if (p && typeof p === "object" && "y" in p) {
        const ep = p as { y: number; m: number; d: number };
        date = new Date(ep.y, ep.m - 1, ep.d);
      }
    } else {
      const epoch = new Date(1899, 11, 30);
      date = new Date(epoch.getTime() + v * 86400000);
    }
    if (date && !isNaN(date.getTime())) {
      const year  = date.getFullYear();
      const month = date.getMonth() + 1;
      const day   = date.getDate();
      return {
        weekStartDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        year,
        month,
      };
    }
  }

  return null;
}

// ============================================================
// HEADER DETECTION
// ============================================================

interface ColMap {
  documentDate: number;
  customerId:   number;
  customerName: number;
  productName:  number;
  grossQty:     number;
  returnsQty:   number;
  netQty:       number;
  weekStart:    number;
  network:      number; // -1 if column not present in file
}

function findHeaderRow(rawRows: unknown[][]): {
  headerRowIndex: number;
  colMap: ColMap;
  missingColumns: string[];
} | null {
  const maxScan = Math.min(10, rawRows.length);

  for (let rowIdx = 0; rowIdx < maxScan; rowIdx++) {
    const row = rawRows[rowIdx];
    if (!Array.isArray(row) || row.length < 5) continue;

    const headers = row.map((c, i) => ({ norm: normalizeHeader(c), i }));

    const find = (key: keyof typeof REQUIRED_COLS): number => {
      const label = REQUIRED_COLS[key];
      const aliases = COL_ALIASES[key] ?? [label];
      const all = [label, ...aliases].map(normalizeHeader);
      return headers.find((h) => all.includes(h.norm))?.i ?? -1;
    };

    const findOptional = (name: string): number =>
      headers.find((h) => h.norm === normalizeHeader(name))?.i ?? -1;

    const colMap: ColMap = {
      documentDate: find("documentDate"),
      customerId:   find("customerId"),
      customerName: find("customerName"),
      productName:  find("productName"),
      grossQty:     find("grossQty"),
      returnsQty:   find("returnsQty"),
      netQty:       find("netQty"),
      weekStart:    find("weekStart"),
      network:      findOptional("רשת"),
    };

    const missing: string[] = [];
    for (const [k, idx] of Object.entries(colMap)) {
      if (k === "network") continue; // optional column
      if (idx === -1) missing.push(REQUIRED_COLS[k as keyof typeof REQUIRED_COLS]);
    }

    if (missing.length === 0) {
      return { headerRowIndex: rowIdx, colMap, missingColumns: [] };
    }
  }

  return {
    headerRowIndex: 0,
    colMap: {} as ColMap,
    missingColumns: Object.values(REQUIRED_COLS),
  };
}

// ============================================================
// AGGREGATION
// ============================================================

interface AggKey {
  storeId:               number;
  storeName:             string;
  productName:           string;
  productNameNormalized: string;
  weekStartDate:         string;
  year:                  number;
  month:                 number;
}

interface AggData {
  grossQty:      number;
  returnsQty:    number;
  netQty:        number;
  uniqueDates:   Set<string>; // for delivery_count
}

interface StoreWeekData {
  storeExternalId: number;
  storeName: string;
  year: number;
  month: number;
  weekStartDate: string;
  uniqueDates: Set<string>;
  totalNetQty: number;
}

function aggregateRecords(
  rawRows: unknown[][],
  headerRowIndex: number,
  colMap: ColMap,
  XLSX?: { SSF?: { parse_date_code?: (n: number) => unknown } },
): {
  records: AggregatedWeeklyRecord[];
  storeDeliveries: StoreDeliveryAggregate[];
  stats: Omit<ProductDeliveryProcessingResult["stats"], "processingTimeMs">;
} {
  const map = new Map<string, { key: AggKey; data: AggData }>();
  const storeWeekMap = new Map<string, StoreWeekData>();

  let rowsProcessed = 0;
  let rowsSkipped   = 0;
  let minDate = "9999-99-99";
  let maxDate = "0000-00-00";

  const dataRows = rawRows.slice(headerRowIndex + 1);

  for (const row of dataRows) {
    if (!Array.isArray(row)) { rowsSkipped++; continue; }

    // Skip summary row (row 1 in file, right after header, has empty customer ID)
    const rawCustomerId = row[colMap.customerId];
    const storeId = Number(rawCustomerId);
    if (!storeId || isNaN(storeId) || storeId <= 0) { rowsSkipped++; continue; }

    // Skip excluded networks (e.g. wholesale channels that distort distribution data)
    if (colMap.network >= 0) {
      const network = String(row[colMap.network] ?? "").trim();
      if (EXCLUDED_NETWORKS.has(network)) { rowsSkipped++; continue; }
    }

    const storeName = String(row[colMap.customerName] ?? "").trim();
    if (!storeName) { rowsSkipped++; continue; }

    const rawProductName = String(row[colMap.productName] ?? "").trim();
    if (!rawProductName) { rowsSkipped++; continue; }

    const weekInfo = parseWeekDate(row[colMap.weekStart], XLSX);
    if (!weekInfo) { rowsSkipped++; continue; }

    const grossQty   = Number(row[colMap.grossQty])   || 0;
    const returnsQty = Number(row[colMap.returnsQty]) || 0;
    const netQty     = Number(row[colMap.netQty])     || 0;

    // Delivery date string for counting unique visits
    const deliveryDateRaw = String(row[colMap.documentDate] ?? "").trim();

    rowsProcessed++;

    const normalized = normalizeProductName(rawProductName);
    const mapKey     = `${storeId}|${normalized}|${weekInfo.weekStartDate}`;

    const existing = map.get(mapKey);
    if (existing) {
      existing.data.grossQty   += grossQty;
      existing.data.returnsQty += returnsQty;
      existing.data.netQty     += netQty;
      // Only count as a delivery visit if actual goods were supplied (not return-only)
      if (deliveryDateRaw && grossQty > 0) existing.data.uniqueDates.add(deliveryDateRaw);
    } else {
      const dates = new Set<string>();
      if (deliveryDateRaw && grossQty > 0) dates.add(deliveryDateRaw);
      map.set(mapKey, {
        key: {
          storeId,
          storeName,
          productName:           rawProductName,
          productNameNormalized: normalized,
          weekStartDate:         weekInfo.weekStartDate,
          year:                  weekInfo.year,
          month:                 weekInfo.month,
        },
        data: { grossQty, returnsQty, netQty, uniqueDates: dates },
      });
    }

    if (weekInfo.weekStartDate < minDate) minDate = weekInfo.weekStartDate;
    if (weekInfo.weekStartDate > maxDate) maxDate = weekInfo.weekStartDate;

    // Store-level aggregation for store_deliveries
    const storeWeekKey = `${storeId}|${weekInfo.weekStartDate}`;
    const existingSW = storeWeekMap.get(storeWeekKey);
    if (existingSW) {
      if (deliveryDateRaw && grossQty > 0) existingSW.uniqueDates.add(deliveryDateRaw);
      existingSW.totalNetQty += netQty;
    } else {
      const dates = new Set<string>();
      if (deliveryDateRaw && grossQty > 0) dates.add(deliveryDateRaw);
      storeWeekMap.set(storeWeekKey, {
        storeExternalId: storeId,
        storeName,
        year: weekInfo.year,
        month: weekInfo.month,
        weekStartDate: weekInfo.weekStartDate,
        uniqueDates: dates,
        totalNetQty: netQty,
      });
    }
  }

  // Build output records
  const records: AggregatedWeeklyRecord[] = Array.from(map.values()).map(
    ({ key, data }) => ({
      storeExternalId:       key.storeId,
      storeName:             key.storeName,
      productName:           key.productName,
      productNameNormalized: key.productNameNormalized,
      weekStartDate:         key.weekStartDate,
      year:                  key.year,
      month:                 key.month,
      grossQty:              data.grossQty,
      returnsQty:            data.returnsQty,
      netQty:                data.netQty,
      deliveryCount:         data.uniqueDates.size,
    }),
  );

  const uniqueStores   = new Set(records.map((r) => r.storeExternalId));
  const uniqueProducts = new Set(records.map((r) => r.productNameNormalized));
  const uniqueWeeks    = new Set(records.map((r) => r.weekStartDate));

  // Weekly store_deliveries records
  const weeklyDeliveries: StoreDeliveryAggregate[] = Array.from(storeWeekMap.values()).map((sw) => ({
    storeExternalId: sw.storeExternalId,
    storeName: sw.storeName,
    year: sw.year,
    month: sw.month,
    week: getISOWeek(new Date(sw.weekStartDate)),
    deliveriesCount: sw.uniqueDates.size,
    totalValue: 0,
    totalQuantity: sw.totalNetQty,
  }));

  // Monthly store_deliveries records (aggregate weekly per store+month)
  const storeMonthMap = new Map<string, {
    storeExternalId: number;
    storeName: string;
    year: number;
    month: number;
    allDates: Set<string>;
    totalNetQty: number;
  }>();
  Array.from(storeWeekMap.values()).forEach((sw) => {
    const monthKey = `${sw.storeExternalId}|${sw.year}|${sw.month}`;
    const existing = storeMonthMap.get(monthKey);
    if (existing) {
      sw.uniqueDates.forEach((d) => existing.allDates.add(d));
      existing.totalNetQty += sw.totalNetQty;
    } else {
      storeMonthMap.set(monthKey, {
        storeExternalId: sw.storeExternalId,
        storeName: sw.storeName,
        year: sw.year,
        month: sw.month,
        allDates: new Set(sw.uniqueDates),
        totalNetQty: sw.totalNetQty,
      });
    }
  });
  const monthlyDeliveries: StoreDeliveryAggregate[] = Array.from(storeMonthMap.values()).map((sm) => ({
    storeExternalId: sm.storeExternalId,
    storeName: sm.storeName,
    year: sm.year,
    month: sm.month,
    week: null,
    deliveriesCount: sm.allDates.size,
    totalValue: 0,
    totalQuantity: sm.totalNetQty,
  }));

  const storeDeliveries = [...weeklyDeliveries, ...monthlyDeliveries];

  return {
    records,
    storeDeliveries,
    stats: {
      rowsProcessed,
      rowsSkipped,
      storesCount:   uniqueStores.size,
      productsCount: uniqueProducts.size,
      weeksCount:    uniqueWeeks.size,
      totalGrossQty:   records.reduce((s, r) => s + r.grossQty,   0),
      totalReturnsQty: records.reduce((s, r) => s + r.returnsQty, 0),
      periodStart: minDate === "9999-99-99" ? "" : minDate,
      periodEnd:   maxDate === "0000-00-00" ? "" : maxDate,
    },
  };
}

// ============================================================
// MAIN EXPORT
// ============================================================

export async function processProductDeliveryExcel(
  file: File,
): Promise<ProductDeliveryProcessingResult> {
  const startTime = performance.now();

  try {
    const XLSX = await loadXlsx();

    const buffer   = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return failure("הקובץ ריק — לא נמצאו גיליונות");
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      return failure("לא נמצא גיליון בקובץ");
    }

    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
    });

    if (rawRows.length < 2) {
      return failure("הקובץ ריק — פחות משתי שורות");
    }

    const headerResult = findHeaderRow(rawRows);
    if (!headerResult || headerResult.missingColumns.length > 0) {
      const missing = headerResult?.missingColumns ?? Object.values(REQUIRED_COLS);
      return failure(`עמודות חסרות: ${missing.join(", ")}`);
    }

    const { headerRowIndex, colMap } = headerResult;
    const { records, storeDeliveries, stats } = aggregateRecords(rawRows, headerRowIndex, colMap, XLSX);

    if (records.length === 0) {
      return failure("לא נמצאו שורות תקינות בקובץ");
    }

    return {
      success: true,
      records,
      storeDeliveries,
      stats: { ...stats, processingTimeMs: Math.round(performance.now() - startTime) },
    };
  } catch (err) {
    console.error("[productDeliveryExcelProcessor]", err);
    return failure(
      err instanceof Error ? err.message : "שגיאה לא ידועה בעיבוד הקובץ",
    );
  }
}

function failure(error: string): ProductDeliveryProcessingResult {
  return {
    success: false,
    records: [],
    storeDeliveries: [],
    stats: {
      rowsProcessed: 0,
      rowsSkipped:   0,
      storesCount:   0,
      productsCount: 0,
      weeksCount:    0,
      totalGrossQty:   0,
      totalReturnsQty: 0,
      periodStart: "",
      periodEnd:   "",
      processingTimeMs: 0,
    },
    error,
  };
}
