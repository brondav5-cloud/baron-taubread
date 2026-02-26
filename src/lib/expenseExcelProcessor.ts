/**
 * Expense Excel Processor for Hashbshevet (חשבשבת) reports.
 *
 * Expected columns:
 *  - שם (supplier name)
 *  - מפתח (account key / מפתח חשבון)
 *  - ת.אסמכ (reference date)
 *  - פרטים (details)
 *  - קבלות זיכויים (credits)
 *  - חשבוניות ספק חיובים (debits)
 *  - יתרה (balance)
 */

import { loadXlsx } from "./loadXlsx";
import type {
  ParsedExpenseRow,
  ExpenseProcessingResult,
} from "@/types/expenses";

const COLUMN_MAPPINGS: { [key: string]: string[] } & {
  supplierName: string[];
  accountKey: string[];
  referenceDate: string[];
  details: string[];
  credits: string[];
  debits: string[];
  balance: string[];
} = {
  supplierName: ["שם", "שם ספק", "שם חשבון"],
  accountKey: ["מפתח", "מפתח חשבון", "מס חשבון", "מס' חשבון", "קוד ספק"],
  referenceDate: ["ת.אסמכ", "תאריך אסמכתא", "תאריך", "ת. אסמכ"],
  details: ["פרטים", "תיאור", "הערות"],
  credits: ["קבלות זיכויים", "זיכויים", "זכות", "קבלות"],
  debits: [
    "חשבוניות ספק חיובים",
    "חיובים",
    "חובה",
    "חשבוניות ספק",
    "חשבוניות",
  ],
  balance: ["יתרה"],
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

function parseDateString(val: unknown): string | null {
  if (val == null || val === "") return null;
  if (typeof val === "number") {
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
  return str;
}

export async function processExpenseExcel(
  file: File,
): Promise<ExpenseProcessingResult> {
  try {
    const XLSX = await loadXlsx();
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) {
      return {
        success: false,
        rows: [],
        suppliers: [],
        totals: { totalDebits: 0, totalCredits: 0, totalBalance: 0 },
        stats: { rowsCount: 0, suppliersCount: 0 },
        error: "הקובץ ריק — לא נמצאו גיליונות",
      };
    }

    const sheet = wb.Sheets[sheetName]!;
    const rawData: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
    });

    if (rawData.length < 2) {
      return {
        success: false,
        rows: [],
        suppliers: [],
        totals: { totalDebits: 0, totalCredits: 0, totalBalance: 0 },
        stats: { rowsCount: 0, suppliersCount: 0 },
        error: "הקובץ לא מכיל מספיק שורות",
      };
    }

    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(rawData.length, 10); i++) {
      const row = rawData[i];
      if (!row) continue;
      const rowStr = row.map((c) => String(c ?? "").trim());
      const hasName = findColumnIndex(rowStr, COLUMN_MAPPINGS.supplierName!) !== -1;
      const hasKey = findColumnIndex(rowStr, COLUMN_MAPPINGS.accountKey!) !== -1;
      if (hasName && hasKey) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx === -1) {
      return {
        success: false,
        rows: [],
        suppliers: [],
        totals: { totalDebits: 0, totalCredits: 0, totalBalance: 0 },
        stats: { rowsCount: 0, suppliersCount: 0 },
        error:
          'לא נמצאה שורת כותרות מתאימה. ודא שהקובץ מכיל עמודות "שם" ו"מפתח"',
      };
    }

    const headers = (rawData[headerRowIdx] as unknown[]).map((c) =>
      String(c ?? "").trim(),
    );
    const colIdx = {
      name: findColumnIndex(headers, COLUMN_MAPPINGS.supplierName),
      key: findColumnIndex(headers, COLUMN_MAPPINGS.accountKey),
      date: findColumnIndex(headers, COLUMN_MAPPINGS.referenceDate),
      details: findColumnIndex(headers, COLUMN_MAPPINGS.details),
      credits: findColumnIndex(headers, COLUMN_MAPPINGS.credits),
      debits: findColumnIndex(headers, COLUMN_MAPPINGS.debits),
      balance: findColumnIndex(headers, COLUMN_MAPPINGS.balance),
    };

    const rows: ParsedExpenseRow[] = [];
    const supplierMap = new Map<string, { name: string; accountKey: string }>();
    let totalDebits = 0;
    let totalCredits = 0;
    let totalBalance = 0;

    for (let i = headerRowIdx + 1; i < rawData.length; i++) {
      const row = rawData[i] as unknown[];
      if (!row || row.every((c) => c == null || String(c).trim() === ""))
        continue;

      const accountKey = String(row[colIdx.key] ?? "").trim();
      const supplierName = String(row[colIdx.name] ?? "").trim();
      if (!accountKey && !supplierName) continue;

      const credits = parseNumber(colIdx.credits >= 0 ? row[colIdx.credits] : 0);
      const debits = parseNumber(colIdx.debits >= 0 ? row[colIdx.debits] : 0);
      const balance = parseNumber(colIdx.balance >= 0 ? row[colIdx.balance] : 0);

      const parsed: ParsedExpenseRow = {
        supplierName,
        accountKey,
        referenceDate: colIdx.date >= 0 ? parseDateString(row[colIdx.date]) : null,
        details:
          colIdx.details >= 0 ? String(row[colIdx.details] ?? "").trim() || null : null,
        credits,
        debits,
        balance,
      };

      rows.push(parsed);
      totalDebits += debits;
      totalCredits += credits;
      totalBalance += balance;

      if (accountKey && supplierName) {
        supplierMap.set(accountKey, { name: supplierName, accountKey });
      }
    }

    const suppliers = Array.from(supplierMap.values());

    return {
      success: true,
      rows,
      suppliers,
      totals: { totalDebits, totalCredits, totalBalance },
      stats: {
        rowsCount: rows.length,
        suppliersCount: suppliers.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      rows: [],
      suppliers: [],
      totals: { totalDebits: 0, totalCredits: 0, totalBalance: 0 },
      stats: { rowsCount: 0, suppliersCount: 0 },
      error: `שגיאה בעיבוד הקובץ: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
