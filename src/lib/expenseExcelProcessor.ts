/**
 * Expense Excel Processor for Hashbshevet (חשבשבת) reports.
 *
 * File structure (כרטסת הנהלת חשבונות):
 *  - Rows 0-1: metadata (company name, report title)
 *  - Row 2 (main header): "שם ספק" | "מפתח חשבון" | ... | "חובה / זכות (שקל)" (merged) | ...
 *  - Row 3 (sub-header, optional): "" | "" | ... | "זכות" | "חובה" | "הנגה" | ...
 *  - Row 4+: data blocks per supplier:
 *      [Supplier header]  col A = supplier name | col B = account key
 *      [Opening balance]  "יתרת פתיחה" in some cell, no date in col I
 *      [Transaction rows] col I = date | col P = debit amount
 *      [Summary row]      any cell contains "סה"כ"
 *      [blank rows]       skip
 *
 * KEY ALGORITHM:
 *  1. Find header row (has "שם ספק" + "מפתח חשבון")
 *  2. Check the row AFTER the header for sub-header ("חובה", "זכות" exact values)
 *     → used to correct financial column positions (fixes merged-cell confusion)
 *  3. For each row after header:
 *     a. Any cell contains "סה"כ" → summary row, reset supplier, skip
 *     b. Col A + Col B both filled → new supplier header
 *     c. Col I has valid date + Col P has amount → transaction row ✓
 *     d. Otherwise → skip (יתרת פתיחה, blanks, separators)
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

function findColumnIndex(
  headers: string[],
  fieldMappings: string[],
): number {
  const normalized = headers.map((h) =>
    String(h ?? "")
      .trim()
      .replace(/\s+/g, " "),
  );
  // First pass: exact match (avoids false positives from merged cell labels)
  for (const mapping of fieldMappings) {
    const idx = normalized.findIndex((h) => h === mapping);
    if (idx !== -1) return idx;
  }
  // Second pass: substring match (fallback)
  for (const mapping of fieldMappings) {
    const idx = normalized.findIndex(
      (h) => h.includes(mapping),
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

/**
 * Check if ANY cell in the row contains summary text ("סה"כ" etc.)
 * This handles cases where the summary label is in col C (כותרת), not col A.
 */
function hasSummaryText(row: unknown[]): boolean {
  return row.some((cell) => {
    const s = String(cell ?? "").trim();
    return (
      s.includes('סה"כ') ||
      s.includes("סה\"כ") ||
      s.includes("סה״כ") ||
      s.includes("מספר תנועות")
    );
  });
}

/**
 * Detect a supplier header row:
 * Both col A (supplier name) and col B (account key) must be non-empty.
 * This row has no transaction date — it just identifies the supplier block.
 */
function isSupplierHeaderRow(
  row: unknown[],
  nameIdx: number,
  keyIdx: number,
): boolean {
  if (nameIdx < 0 || keyIdx < 0) return false;
  const name = String(row[nameIdx] ?? "").trim();
  const key = String(row[keyIdx] ?? "").trim();
  if (!name || !key) return false;
  // Extra guard: column header values should not be treated as supplier names
  if (
    name === "שם ספק" ||
    name === "שם חשבון" ||
    name === "שם" ||
    key === "מפתח חשבון" ||
    key === "מפתח ספק" ||
    key === "מפתח"
  ) {
    return false;
  }
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

    // ─────────────────────────────────────────
    // STEP 1: Find main header row
    // ─────────────────────────────────────────
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(rawData.length, 10); i++) {
      const row = rawData[i];
      if (!row) continue;
      const rowStr = row.map((c) =>
        String(c ?? "")
          .trim()
          .replace(/\s+/g, " "),
      );
      const hasName =
        findColumnIndex(rowStr, COLUMN_MAPPINGS.supplierName!) !== -1;
      const hasKey =
        findColumnIndex(rowStr, COLUMN_MAPPINGS.accountKey!) !== -1;
      if (hasName && hasKey) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx === -1) {
      return emptyResult(
        'לא נמצאה שורת כותרות. ודא שהקובץ מכיל עמודות "שם ספק" ו"מפתח חשבון"',
      );
    }

    const headers = (rawData[headerRowIdx] as unknown[]).map((c) =>
      String(c ?? "")
        .trim()
        .replace(/\s+/g, " "),
    );

    // ─────────────────────────────────────────
    // STEP 2: Detect column positions from main header
    // ─────────────────────────────────────────
    const colIdx = {
      name: findColumnIndex(headers, COLUMN_MAPPINGS.supplierName!),
      key: findColumnIndex(headers, COLUMN_MAPPINGS.accountKey!),
      date: findColumnIndex(headers, COLUMN_MAPPINGS.referenceDate!),
      details: findColumnIndex(headers, COLUMN_MAPPINGS.details!),
      credits: findColumnIndex(headers, COLUMN_MAPPINGS.credits!),
      debits: findColumnIndex(headers, COLUMN_MAPPINGS.debits!),
      balance: findColumnIndex(headers, COLUMN_MAPPINGS.balance!),
    };

    // ─────────────────────────────────────────
    // STEP 2b: Check sub-header row for exact "חובה" / "זכות" positions.
    // This fixes the merged-cell problem where main header has
    // "חובה / זכות (שקל)" as one cell, hiding the individual sub-columns.
    // ─────────────────────────────────────────
    const subHeaderRow = rawData[headerRowIdx + 1];
    if (subHeaderRow) {
      const subHeaders = (subHeaderRow as unknown[]).map((c) =>
        String(c ?? "")
          .trim()
          .replace(/\s+/g, " "),
      );
      // Only override if the sub-header row has column-label-like content
      // (empty in A/B cols, specific labels in financial cols)
      const nameInSub = subHeaders[colIdx.name] ?? "";
      const keyInSub = subHeaders[colIdx.key] ?? "";
      const subHasNoSupplier = !nameInSub && !keyInSub;

      if (subHasNoSupplier) {
        const debitExact = subHeaders.findIndex((h) => h === "חובה");
        const creditExact = subHeaders.findIndex((h) => h === "זכות");
        const dateExact = findColumnIndex(
          subHeaders,
          COLUMN_MAPPINGS.referenceDate!,
        );
        const balanceExact = subHeaders.findIndex(
          (h) => h === "יתרה" || h === "יתרה (שקל)",
        );

        if (debitExact !== -1) colIdx.debits = debitExact;
        if (creditExact !== -1) colIdx.credits = creditExact;
        if (dateExact !== -1) colIdx.date = dateExact;
        if (balanceExact !== -1) colIdx.balance = balanceExact;
      }
    }

    // ─────────────────────────────────────────
    // STEP 3: Process rows
    // ─────────────────────────────────────────
    const rows: ParsedExpenseRow[] = [];
    const supplierMap = new Map<
      string,
      { name: string; accountKey: string }
    >();
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

      // Skip completely empty rows
      if (!row || row.every((c) => c == null || String(c).trim() === ""))
        continue;

      // ── a. Summary row: any cell has "סה"כ" → end supplier block
      if (hasSummaryText(row)) {
        currentSupplierName = "";
        currentAccountKey = "";
        continue;
      }

      // ── b. New supplier header: col A + col B both filled
      if (isSupplierHeaderRow(row, colIdx.name, colIdx.key)) {
        currentSupplierName = String(row[colIdx.name] ?? "").trim();
        currentAccountKey = String(row[colIdx.key] ?? "").trim();
        if (currentSupplierName && currentAccountKey) {
          supplierMap.set(currentAccountKey, {
            name: currentSupplierName,
            accountKey: currentAccountKey,
          });
        }
        continue;
      }

      // No supplier yet → skip (opening lines before first supplier)
      if (!currentSupplierName || !currentAccountKey) continue;

      // ── c. Transaction row: must have valid date in col I
      const refDate =
        colIdx.date >= 0 ? parseExcelDate(row[colIdx.date]) : null;
      if (!refDate) continue; // No date = יתרת פתיחה, separator, etc.

      const debits = parseNumber(
        colIdx.debits >= 0 ? row[colIdx.debits] : 0,
      );
      const credits = parseNumber(
        colIdx.credits >= 0 ? row[colIdx.credits] : 0,
      );

      // Skip rows with no financial movement
      if (debits === 0 && credits === 0) continue;

      const balance = parseNumber(
        colIdx.balance >= 0 ? row[colIdx.balance] : 0,
      );

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

      const d = new Date(refDate);
      if (!isNaN(d.getTime())) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthCountMap.set(key, (monthCountMap.get(key) || 0) + 1);
        if (!minDate || refDate < minDate) minDate = refDate;
        if (!maxDate || refDate > maxDate) maxDate = refDate;
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
