/**
 * Parser for Discount Bank credit card Excel (transaction-details_export_*.xlsx)
 *
 * 3 sheets:
 *   עסקאות במועד החיוב       → charged transactions
 *   עסקאות שאושרו וטרם נקלטו → pending transactions
 *   עסקאות חו"ל ומט"ח        → foreign transactions
 *
 * Headers: תאריך עסקה | שם בית העסק | קטגוריה | 4 ספרות | סוג עסקה |
 *          סכום חיוב | מטבע | סכום מקורי | מטבע מקורי | תאריך חיוב | הערות | שער המרה
 */

import { loadXlsx } from "../../../../lib/loadXlsx";

export interface CreditCardItem {
  row_index: number;
  transaction_date: string;
  business_name: string;
  category: string;
  last4: string;
  transaction_type: string;
  charge_amount: number;
  currency: string;
  original_amount: number;
  original_currency: string;
  charge_date: string;
  notes: string;
  exchange_rate: number;
  sheet_name: string;
}

export interface CreditCardParseResult {
  charge_date: string;       // billing date = match key to bank statement
  total_charge: number;
  items: CreditCardItem[];
  errors: string[];
}

function parseAmount(v: unknown): number {
  if (typeof v === "number") return Math.abs(v);
  if (typeof v === "string") return parseFloat(v.replace(/[^\d.-]/g, "")) || 0;
  return 0;
}

function parseDateCell(v: unknown): string {
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof v === "string") {
    // DD-MM-YYYY
    const parts = v.split("-");
    if (parts.length === 3 && (parts[0] ?? "").length <= 2) {
      const [dd, mm, yyyy] = parts as [string, string, string];
      return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
    // DD/MM/YYYY
    const parts2 = v.split("/");
    if (parts2.length === 3) {
      const [dd, mm, yyyy] = parts2 as [string, string, string];
      return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
  }
  return String(v ?? "");
}

function parseSheet(
  XLSX: Awaited<ReturnType<typeof import("../../../../lib/loadXlsx").loadXlsx>>,
  sheet: import("xlsx").WorkSheet,
  sheetName: string,
  rowOffset: number
): { items: CreditCardItem[]; errors: string[] } {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const errors: string[] = [];

  // Find header row
  let headerIdx = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const cells = (rows[i] ?? []).map((c) => String(c));
    if (cells.some((c) => c.includes("שם בית העסק") || c.includes("עסקה"))) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) return { items: [], errors };

  const headers = (rows[headerIdx] ?? []).map((c) => String(c).trim());

  const col = {
    txDate: headers.findIndex((h) => h.includes("תאריך עסקה")),
    business: headers.findIndex((h) => h.includes("שם בית העסק") || h.includes("עסק")),
    category: headers.findIndex((h) => h.includes("קטגוריה")),
    last4: headers.findIndex((h) => h.includes("4 ספרות") || h.includes("כרטיס")),
    txType: headers.findIndex((h) => h.includes("סוג עסקה")),
    charge: headers.findIndex((h) => h.includes("סכום חיוב") || (h.includes("סכום") && !h.includes("מקורי"))),
    currency: headers.findIndex((h) => h.includes("מטבע") && !h.includes("מקורי")),
    origAmount: headers.findIndex((h) => h.includes("סכום מקורי")),
    origCurrency: headers.findIndex((h) => h.includes("מטבע מקורי")),
    chargeDate: headers.findIndex((h) => h.includes("תאריך חיוב")),
    notes: headers.findIndex((h) => h.includes("הערות") || h.includes("הערה")),
    rate: headers.findIndex((h) => h.includes("שער")),
  };

  const items: CreditCardItem[] = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const business = String(row[col.business] ?? "").trim();
    if (!business) continue;

    const charge = parseAmount(row[col.charge]);
    if (charge === 0) continue;

    items.push({
      row_index: rowOffset + i,
      transaction_date: col.txDate >= 0 ? parseDateCell(row[col.txDate]) : "",
      business_name: business,
      category: col.category >= 0 ? String(row[col.category] ?? "") : "",
      last4: col.last4 >= 0 ? String(row[col.last4] ?? "") : "",
      transaction_type: col.txType >= 0 ? String(row[col.txType] ?? "") : "",
      charge_amount: charge,
      currency: col.currency >= 0 ? String(row[col.currency] ?? "ILS") : "ILS",
      original_amount: col.origAmount >= 0 ? parseAmount(row[col.origAmount]) : charge,
      original_currency: col.origCurrency >= 0 ? String(row[col.origCurrency] ?? "ILS") : "ILS",
      charge_date: col.chargeDate >= 0 ? parseDateCell(row[col.chargeDate]) : "",
      notes: col.notes >= 0 ? String(row[col.notes] ?? "") : "",
      exchange_rate: col.rate >= 0 ? parseAmount(row[col.rate]) : 1,
      sheet_name: sheetName,
    });
  }

  return { items, errors };
}

export async function parseCreditCardXLSX(file: File): Promise<CreditCardParseResult> {
  const XLSX = await loadXlsx();
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true });

  const allItems: CreditCardItem[] = [];
  const allErrors: string[] = [];
  let rowOffset = 0;

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName] ?? {};
    const { items, errors } = parseSheet(XLSX, sheet, sheetName, rowOffset);
    allItems.push(...items);
    allErrors.push(...errors);
    rowOffset += 1000;
  }

  // The "charge_date" for matching = most common charge date in the main (charged) sheet.
  // Prefer items from a sheet whose name includes "חיוב"; fall back to all items.
  const chargedItems = allItems.filter((i) => i.sheet_name.includes("חיוב") && i.charge_date);
  const baseItems = chargedItems.length > 0 ? chargedItems : allItems.filter((i) => i.charge_date);
  const charge_date = baseItems.length > 0 ? (baseItems[0]?.charge_date ?? "") : "";
  const total_charge = baseItems.reduce((s, i) => s + i.charge_amount, 0);

  return { charge_date, total_charge, items: allItems, errors: allErrors };
}
