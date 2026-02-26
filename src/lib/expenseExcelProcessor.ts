/**
 * Expense Excel Processor for Hashbshevet (חשבשבת) reports.
 *
 * File structure (Hashbshevet "כרטסת הנהלת חשבונות"):
 *  - Rows 0-2: metadata (company name, report title, date range)
 *  - Row 3: headers
 *  - Row 4+: data in hierarchical blocks per supplier:
 *      [Supplier header]  "שם ספק" | "מפתח ספק" | ...
 *      [Opening balance]  "" | "" | "יתרת פתיחה" | ...
 *      [Transaction rows] "" | "" | "" | data...  (supplier cols empty)
 *      [Summary row]      "סה"כ מפתח חשבון" | ...
 *
 * Key columns:
 *  - שם ספק (col 0) — supplier name, only in header row
 *  - מפתח ספק (col 1) — account key, only in header row
 *  - ת.אסמכ (col 8) — reference date as Excel serial number
 *  - חובה / זכות (שקל) חובה (col 14) — debits
 *  - חובה / זכות (שקל) זכות (col 15) — credits
 *  - יתרה (שקל) (col 16) — balance
 *  - פרטים (col 12) — details
 */

import { loadXlsx } from "./loadXlsx";
import type {
  ParsedExpenseRow,
  ExpenseProcessingResult,
  DetectedMonth,
} from "@/types/expenses";

const COLUMN_MAPPINGS: Record<string, string[]> = {
  supplierName: ["שם ספק", "שם", "שם חשבון"],
  accountKey: [
    "מפתח ספק",
    "מפתח",
    "מפתח חשבון",
    "מס חשבון",
    "מס' חשבון",
    "קוד ספק",
  ],
  referenceDate: ["ת.אסמכ", "תאריך אסמכתא", "תאריך", "ת. אסמכ"],
  details: ["פרטים", "תיאור", "הערות"],
  credits: [
    "חובה / זכות (שקל) זכות",
    "זכות (שקל) זכות",
    "קבלות זיכויים",
    "זיכויים",
    "זכות",
    "קבלות",
  ],
  debits: [
    "חובה / זכות (שקל) חובה",
    "זכות (שקל) חובה",
    "חשבוניות ספק חיובים",
    "חיובים",
    "חובה",
    "חשבוניות ספק",
    "חשבוניות",
  ],
  balance: ["יתרה (שקל)", "יתרה"],
};

const SKIP_PATTERNS = ["סה\"כ", "סה״כ", "יתרת פתיחה", "מספר תנועות"];

function findColumnIndex(
  headers: string[],
  fieldMappings: string[],
): number {
  const normalized = headers.map((h) =>
    String(h ?? "")
      .trim()
      .replace(/\s+/g, " "),
  );
  for (const mapping of fieldMappings) {
    const idx = normalized.findIndex(
      (h) => h === mapping || h.includes(mapping),
    );
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseNumber(val: unknown): number {
  if (val == null || val === "") return 0;
  if (typeof val === "number") return val;
  const str = String(val).replace(/[,₪\s]/g, "").replace(/[()]/g, "-");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function parseExcelDate(val: unknown): string | null {
  if (val == null || val === "") return null;

  if (typeof val === "number" && val > 30000 && val < 60000) {
    const epoch = new Date((val - 25569) * 86400 * 1000);
    if (!isNaN(epoch.getTime())) {
      return epoch.toISOString().split("T")[0] ?? null;
    }
  }

  const str = String(val).trim();
  const ddmmyyyy = str.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (ddmmyyyy && ddmmyyyy[1] && ddmmyyyy[2] && ddmmyyyy[3]) {
    const day = ddmmyyyy[1].padStart(2, "0");
    const month = ddmmyyyy[2].padStart(2, "0");
    let year = ddmmyyyy[3];
    if (year.length === 2) year = "20" + year;
    return `${year}-${month}-${day}`;
  }
  return null;
}

function isSkipRow(row: unknown[]): boolean {
  const first = String(row[0] ?? "").trim();
  const third = String(row[2] ?? "").trim();
  const combined = first + " " + third;
  return SKIP_PATTERNS.some((p) => combined.includes(p));
}

function isSupplierHeaderRow(row: unknown[], nameIdx: number, keyIdx: number): boolean {
  const name = String(row[nameIdx] ?? "").trim();
  const key = String(row[keyIdx] ?? "").trim();
  if (!name || !key) return false;
  if (name.includes("סה\"כ") || name.includes("סה״כ") || name.includes("מספר תנועות")) return false;
  return true;
}

export async function processExpenseExcel(
  file: File,
): Promise<ExpenseProcessingResult> {
  const emptyResult = (error: string): ExpenseProcessingResult => ({
    success: false,
    rows: [],
    suppliers: [],
    totals: { totalDebits: 0, totalCredits: 0, totalBalance: 0 },
    detectedMonths: [],
    dateRange: { from: null, to: null },
    stats: { rowsCount: 0, suppliersCount: 0, monthsCount: 0 },
    error,
  });

  try {
    const XLSX = await loadXlsx();
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) {
      return emptyResult("הקובץ ריק — לא נמצאו גיליונות");
    }

    const sheet = wb.Sheets[sheetName]!;
    const rawData: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
    });

    if (rawData.length < 2) {
      return emptyResult("הקובץ לא מכיל מספיק שורות");
    }

    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(rawData.length, 10); i++) {
      const row = rawData[i];
      if (!row) continue;
      const rowStr = row.map((c) => String(c ?? "").trim().replace(/\s+/g, " "));
      const hasName = findColumnIndex(rowStr, COLUMN_MAPPINGS.supplierName!) !== -1;
      const hasKey = findColumnIndex(rowStr, COLUMN_MAPPINGS.accountKey!) !== -1;
      if (hasName && hasKey) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx === -1) {
      return emptyResult(
        'לא נמצאה שורת כותרות מתאימה. ודא שהקובץ מכיל עמודות "שם ספק" ו"מפתח ספק"',
      );
    }

    const headers = (rawData[headerRowIdx] as unknown[]).map((c) =>
      String(c ?? "")
        .trim()
        .replace(/\s+/g, " "),
    );

    const colIdx = {
      name: findColumnIndex(headers, COLUMN_MAPPINGS.supplierName!),
      key: findColumnIndex(headers, COLUMN_MAPPINGS.accountKey!),
      date: findColumnIndex(headers, COLUMN_MAPPINGS.referenceDate!),
      details: findColumnIndex(headers, COLUMN_MAPPINGS.details!),
      credits: findColumnIndex(headers, COLUMN_MAPPINGS.credits!),
      debits: findColumnIndex(headers, COLUMN_MAPPINGS.debits!),
      balance: findColumnIndex(headers, COLUMN_MAPPINGS.balance!),
    };

    const rows: ParsedExpenseRow[] = [];
    const supplierMap = new Map<string, { name: string; accountKey: string }>();
    const monthCountMap = new Map<string, number>();
    let totalDebits = 0;
    let totalCredits = 0;
    let totalBalance = 0;
    let minDate: string | null = null;
    let maxDate: string | null = null;

    let currentSupplierName = "";
    let currentAccountKey = "";

    for (let i = headerRowIdx + 1; i < rawData.length; i++) {
      const row = rawData[i] as unknown[];
      if (!row || row.every((c) => c == null || String(c).trim() === ""))
        continue;

      if (isSkipRow(row)) continue;

      if (isSupplierHeaderRow(row, colIdx.name, colIdx.key)) {
        currentSupplierName = String(row[colIdx.name] ?? "").trim();
        currentAccountKey = String(row[colIdx.key] ?? "").trim();
        if (currentAccountKey && currentSupplierName) {
          supplierMap.set(currentAccountKey, {
            name: currentSupplierName,
            accountKey: currentAccountKey,
          });
        }
        continue;
      }

      if (!currentAccountKey || !currentSupplierName) continue;

      const credits = parseNumber(colIdx.credits >= 0 ? row[colIdx.credits] : 0);
      const debits = parseNumber(colIdx.debits >= 0 ? row[colIdx.debits] : 0);
      const balance = parseNumber(colIdx.balance >= 0 ? row[colIdx.balance] : 0);

      if (credits === 0 && debits === 0 && balance === 0) continue;

      const refDate = colIdx.date >= 0 ? parseExcelDate(row[colIdx.date]) : null;

      const parsed: ParsedExpenseRow = {
        supplierName: currentSupplierName,
        accountKey: currentAccountKey,
        referenceDate: refDate,
        details:
          colIdx.details >= 0
            ? String(row[colIdx.details] ?? "").trim() || null
            : null,
        credits,
        debits,
        balance,
      };

      rows.push(parsed);
      totalDebits += debits;
      totalCredits += credits;
      totalBalance += balance;

      if (refDate && refDate.length >= 7) {
        const d = new Date(refDate);
        if (!isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          monthCountMap.set(key, (monthCountMap.get(key) || 0) + 1);
          if (!minDate || refDate < minDate) minDate = refDate;
          if (!maxDate || refDate > maxDate) maxDate = refDate;
        }
      }
    }

    const suppliers = Array.from(supplierMap.values());

    const detectedMonths: DetectedMonth[] = Array.from(monthCountMap.entries())
      .map(([key, count]) => {
        const [y, m] = key.split("-");
        const monthNum = parseInt(m!, 10);
        const yearNum = parseInt(y!, 10);
        return {
          month: monthNum,
          year: yearNum,
          label: new Date(yearNum, monthNum - 1).toLocaleString("he-IL", {
            month: "long",
            year: "numeric",
          }),
          rowCount: count,
        };
      })
      .sort((a, b) =>
        a.year !== b.year ? a.year - b.year : a.month - b.month,
      );

    return {
      success: true,
      rows,
      suppliers,
      totals: { totalDebits, totalCredits, totalBalance },
      detectedMonths,
      dateRange: { from: minDate, to: maxDate },
      stats: {
        rowsCount: rows.length,
        suppliersCount: suppliers.length,
        monthsCount: detectedMonths.length,
      },
    };
  } catch (err) {
    return emptyResult(
      `שגיאה בעיבוד הקובץ: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
