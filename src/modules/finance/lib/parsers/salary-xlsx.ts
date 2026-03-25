/**
 * Parser for Hapoalim salary detail Excel (excelSalariesByCollection.xlsx)
 *
 * Format:
 *   Row 1: file title
 *   Row 2: "תאריך לביצוע: DD.MM.YYYY | סה"כ מוטבים: N | סה"כ: X₪ | אסמכתא: XXXXXX"
 *   Row 3: headers — מספר | בנק | סניף | מספר חשבון | שם המוטב | ת.ז | סכום להעברה
 *   Rows 4+: data
 *   Amounts: "ש"ח 9,783.00" (prefix format)
 */

import { loadXlsx } from "../../../../lib/loadXlsx";

export interface SalaryParseResult {
  reference: string;
  doc_date: string;
  total_amount: number;
  payee_count: number;
  items: TransactionDetailItem[];
  errors: string[];
}

export interface TransactionDetailItem {
  row_index: number;
  payee_name: string;
  payee_id: string;
  bank: string;
  branch: string;
  account: string;
  amount: number;
  extra: Record<string, unknown>;
}

function parseAmount(s: unknown): number {
  if (typeof s === "number") return Math.abs(s);
  const str = String(s ?? "").replace(/[^\d.-]/g, "");
  return parseFloat(str) || 0;
}

function parseDDMMYYYY(s: string): string {
  const parts = s.split(".");
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts as [string, string, string];
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  return s;
}

export async function parseSalaryXLSX(file: File): Promise<SalaryParseResult> {
  const XLSX = await loadXlsx();
  const errors: string[] = [];

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
  const sheetName = wb.SheetNames[0] ?? "";
  const sheet = wb.Sheets[sheetName] ?? {};
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  // Extract metadata from row 2 (index 1)
  let reference = "";
  let doc_date = "";
  let total_amount = 0;

  const metaRow = String((rows[1] ?? []).join(" | "));
  const refMatch = metaRow.match(/אסמכתא[:\s]*(\d+)/);
  const dateMatch = metaRow.match(/(\d{2}\.\d{2}\.\d{4})/);
  const totalMatch = metaRow.match(/סה"כ[:\s]*[\d,.]+([\d,.]+)/);
  const totalMatch2 = metaRow.match(/[\u20AA₪]?\s*([\d,]+\.\d{2})\s*[\u20AA₪]?/g);

  if (refMatch) reference = refMatch[1] ?? "";
  if (dateMatch) doc_date = parseDDMMYYYY(dateMatch[1] ?? "");
  if (totalMatch2 && totalMatch2.length > 0) {
    total_amount = parseAmount(totalMatch2[totalMatch2.length - 1]);
  }
  if (!total_amount && totalMatch) {
    total_amount = parseAmount(totalMatch[1]);
  }

  // Find header row (contains "שם המוטב")
  let headerIdx = -1;
  for (let i = 0; i < Math.min(8, rows.length); i++) {
    const cells = (rows[i] ?? []).map((c) => String(c));
    if (cells.some((c) => c.includes("שם המוטב") || c.includes("מוטב"))) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    return { reference, doc_date, total_amount, payee_count: 0, items: [], errors: ["לא נמצאה שורת כותרת"] };
  }

  const headers = (rows[headerIdx] ?? []).map((c) => String(c).trim());

  const col = {
    name: headers.findIndex((h) => h.includes("שם המוטב") || h.includes("מוטב")),
    id: headers.findIndex((h) => h.includes("ת.ז") || h.includes("זהות")),
    bank: headers.findIndex((h) => h.includes("בנק")),
    branch: headers.findIndex((h) => h.includes("סניף")),
    account: headers.findIndex((h) => h.includes("חשבון")),
    amount: headers.findIndex((h) => h.includes("סכום")),
  };

  const items: TransactionDetailItem[] = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const nameVal = String(row[col.name] ?? "").trim();
    if (!nameVal) continue;

    const amount = parseAmount(row[col.amount]);
    if (amount === 0) continue;

    items.push({
      row_index: i,
      payee_name: nameVal,
      payee_id: col.id >= 0 ? String(row[col.id] ?? "") : "",
      bank: col.bank >= 0 ? String(row[col.bank] ?? "") : "",
      branch: col.branch >= 0 ? String(row[col.branch] ?? "") : "",
      account: col.account >= 0 ? String(row[col.account] ?? "") : "",
      amount,
      extra: Object.fromEntries(headers.map((h, idx) => [h, row[idx] ?? ""])),
    });
  }

  if (!total_amount && items.length > 0) {
    total_amount = items.reduce((s, r) => s + r.amount, 0);
  }

  return { reference, doc_date, total_amount, payee_count: items.length, items, errors };
}
