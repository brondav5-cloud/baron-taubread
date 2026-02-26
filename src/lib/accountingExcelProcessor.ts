/**
 * Accounting Ledger Processor — כרטסת הנהלת חשבונות
 *
 * File structure per spec (fixed column indices):
 *
 * ACCOUNT HEADER ROW: col0=name, col1=code, col2=group_code
 * OPENING BALANCE:    col2 = "יתרת פתיחה"
 * TRANSACTION ROW:    col3=header_num, col4=movement_num, col7=counter_account,
 *                     col8=transaction_date, col9=value_date, col10=reference,
 *                     col11=reference2, col12=description, col14=debit, col15=credit
 * SUMMARY ROW:        col0 contains 'סה"כ מפתח חשבון' → skip + 2 rows
 * REPORT END:         col0 contains 'סה"כ לדו"ח' or 'מספר תנועות' → skip
 *
 * account_type: group_code starts with "6" → revenue, else → expense
 */

import { loadXlsx } from "./loadXlsx";
import type {
  ParsedAccount,
  ParsedTransaction,
  ParsedAccountingResult,
} from "@/types/accounting";

function parseExcelDate(val: unknown): string | null {
  if (val == null || val === "") return null;

  // Excel serial date number
  if (typeof val === "number" && val > 30000 && val < 70000) {
    const epoch = new Date((val - 25569) * 86400 * 1000);
    if (!isNaN(epoch.getTime())) {
      return epoch.toISOString().split("T")[0] ?? null;
    }
  }

  const str = String(val).trim();

  // ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmy = str.match(/^(\d{1,2})[/\-.]+(\d{1,2})[/\-.]+(\d{2,4})$/);
  if (dmy && dmy[1] && dmy[2] && dmy[3]) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    let year = dmy[3];
    if (year.length === 2) year = "20" + year;
    const result = `${year}-${month}-${day}`;
    const d = new Date(result);
    if (!isNaN(d.getTime())) return result;
  }

  return null;
}

function parseNumber(val: unknown): number {
  if (val == null || val === "") return 0;
  if (typeof val === "number") return val;
  const str = String(val).replace(/[,₪\s]/g, "").replace(/[()]/g, "-");
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

function cellStr(row: unknown[], idx: number): string {
  return String(row[idx] ?? "").trim();
}

function isAccountHeaderRow(row: unknown[]): boolean {
  // col0 = name (non-empty text), col1 = code (non-empty), col2 = group_code (numeric-ish)
  const name = cellStr(row, 0);
  const code = cellStr(row, 1);
  const gc   = cellStr(row, 2);

  if (!name || !code || !gc) return false;

  // col2 must be a number (group codes are like 600, 700, 702…)
  if (!/^\d+$/.test(gc)) return false;

  // Skip summary/report rows
  const nameLower = name;
  if (
    nameLower.includes('סה"כ') ||
    nameLower.includes("סה״כ") ||
    nameLower.includes("מספר תנועות") ||
    nameLower.includes('לדו"ח')
  ) {
    return false;
  }

  return true;
}

function isReportEndRow(row: unknown[]): boolean {
  const c0 = cellStr(row, 0);
  return (
    c0.includes('סה"כ לדו"ח') ||
    c0.includes('סה״כ לדו״ח') ||
    c0.includes("מספר תנועות בדו") ||
    c0 === "מספר תנועות"
  );
}

function isSummaryRow(row: unknown[]): boolean {
  // The account summary row starts with 'סה"כ מפתח חשבון'
  const c0 = cellStr(row, 0);
  return (
    c0.includes('סה"כ מפתח') ||
    c0.includes('סה״כ מפתח') ||
    c0.startsWith('סה"כ') ||
    c0.startsWith("סה״כ")
  );
}

function isOpeningBalance(row: unknown[]): boolean {
  return cellStr(row, 2) === "יתרת פתיחה";
}

function isHeaderRow(row: unknown[]): boolean {
  // The column header row of the file (e.g. "כותרת", "תנועה", etc.)
  const c3 = cellStr(row, 3);
  const c4 = cellStr(row, 4);
  return (c3 === "כותרת" && c4 === "תנועה") || (c3 === "כותרת" || c4 === "תנועה");
}

export async function processAccountingExcel(
  file: File,
): Promise<ParsedAccountingResult> {
  const empty = (error: string): ParsedAccountingResult => ({
    success: false,
    accounts: [],
    transactions: [],
    stats: { rowsCount: 0, accountsCount: 0, dateRange: { from: null, to: null } },
    error,
  });

  try {
    const XLSX = await loadXlsx();
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array", cellDates: false });

    const sheetName = wb.SheetNames[0];
    if (!sheetName) return empty("הקובץ ריק — לא נמצאו גיליונות");

    const sheet = wb.Sheets[sheetName]!;
    const rawData: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: true,
    });

    if (rawData.length < 3) return empty("הקובץ לא מכיל מספיק שורות");

    const accountsMap = new Map<string, ParsedAccount>(); // code → account
    const transactions: ParsedTransaction[] = [];
    let minDate: string | null = null;
    let maxDate: string | null = null;

    let currentAccount: ParsedAccount | null = null;
    let skipRows = 0;

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i] as unknown[];

      // Skip completely empty rows
      if (!row || row.every((c) => c == null || String(c).trim() === "")) continue;

      // Skip N rows (after summary rows)
      if (skipRows > 0) {
        skipRows--;
        continue;
      }

      // Report-end markers → stop processing
      if (isReportEndRow(row)) break;

      // Opening balance → skip
      if (isOpeningBalance(row)) continue;

      // File column-header row → skip
      if (isHeaderRow(row)) continue;

      // Summary row → skip this + 2 rows (חובה, זכות, הפרש rows)
      if (isSummaryRow(row)) {
        currentAccount = null;
        skipRows = 2;
        continue;
      }

      // Account header row
      if (isAccountHeaderRow(row)) {
        const code = cellStr(row, 1);
        const name = cellStr(row, 0);
        const groupCode = cellStr(row, 2);
        const accountType = groupCode.startsWith("6") ? "revenue" : "expense";

        currentAccount = { code, name, group_code: groupCode, account_type: accountType };

        // Always update name and group_code to latest (last file wins)
        accountsMap.set(code, currentAccount);
        continue;
      }

      // Transaction row: must have a valid date in col 8
      if (!currentAccount) continue;

      const txDate = parseExcelDate(row[8]);
      if (!txDate) continue;

      const debit  = parseNumber(row[14]);
      const credit = parseNumber(row[15]);

      // Skip zero-movement rows
      if (debit === 0 && credit === 0) continue;

      const tx: ParsedTransaction = {
        account_code: currentAccount.code,
        group_code: currentAccount.group_code,
        original_account_name: currentAccount.name,
        transaction_date: txDate,
        value_date: parseExcelDate(row[9]),
        debit,
        credit,
        description: cellStr(row, 12) || null,
        counter_account: cellStr(row, 7) || null,
        reference_number: cellStr(row, 10) || null,
        header_number: cellStr(row, 3) || null,
        movement_number: cellStr(row, 4) || null,
      };

      transactions.push(tx);

      if (!minDate || txDate < minDate) minDate = txDate;
      if (!maxDate || txDate > maxDate) maxDate = txDate;
    }

    const accounts = Array.from(accountsMap.values());

    return {
      success: true,
      accounts,
      transactions,
      stats: {
        rowsCount: transactions.length,
        accountsCount: accounts.length,
        dateRange: { from: minDate, to: maxDate },
      },
    };
  } catch (err) {
    return empty(
      `שגיאה בעיבוד הקובץ: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
