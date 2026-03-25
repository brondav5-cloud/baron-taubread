import { loadXlsx } from "../../../../lib/loadXlsx";
import type { BankParseResult, ParsedBankTransaction } from "../../types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Converts an Excel serial date number to ISO YYYY-MM-DD.
 * Excel epoch is Jan 0, 1900 (with the famous Lotus 1-2-3 leap-year bug).
 * Unix epoch offset: 25569 days from Jan 1, 1900 to Jan 1, 1970.
 */
function excelSerialToIso(serial: number): string {
  const utcMs = (serial - 25569) * 86400 * 1000;
  const date = new Date(utcMs);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseHapoalimDate(val: unknown): string | null {
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof val === "number" && val > 1000) {
    return excelSerialToIso(val);
  }
  if (typeof val === "string" && val.includes("/")) {
    const parts = val.split("/");
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
  }
  return null;
}

function parseAmount(v: unknown): number {
  if (typeof v === "number") return v < 0 ? -v : v;
  if (typeof v === "string") return parseFloat(v.replace(/,/g, "")) || 0;
  return 0;
}

// ─── Main parser ─────────────────────────────────────────────────────────────

export async function parseHapoalimXLSX(file: File): Promise<BankParseResult> {
  const XLSX = await loadXlsx();
  const errors: string[] = [];

  const buffer = await file.arrayBuffer();
  // cellDates:true → SheetJS returns JS Date objects for date cells
  const workbook = XLSX.read(new Uint8Array(buffer), {
    type: "array",
    cellDates: true,
  });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // sheet_to_json with header:1 → array of arrays, preserving raw values
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  });

  // Dynamically find header row
  let headerIndex = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const cells = rows[i].map((c) => String(c));
    const hasDate = cells.some((c) => c.includes("תאריך"));
    const hasAmount = cells.some((c) => c.includes("חובה") || c.includes("זכות"));
    if (hasDate && hasAmount) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    return {
      transactions: [],
      account_number: "",
      errors: ["לא נמצאה שורת כותרת בקובץ"],
    };
  }

  const headers = rows[headerIndex].map((c) => String(c).trim());

  const col = {
    date: headers.findIndex((h) => h.includes("תאריך")),
    opCode: headers.findIndex(
      (h) => h.includes("קוד פעולה") || (h.includes("קוד") && !h.includes("חשבון"))
    ),
    desc: headers.findIndex(
      (h) => h === "הפעולה" || h.includes("שם הפעולה") || h.includes("הפעולה")
    ),
    details: headers.findIndex((h) => h.includes("פרטים")),
    ref: headers.findIndex((h) => h.includes("אסמכתא")),
    batch: headers.findIndex((h) => h.includes("צרור")),
    debit: headers.findIndex((h) => h.includes("חובה")),
    credit: headers.findIndex((h) => h.includes("זכות")),
    balance: headers.findIndex((h) => h.includes("יתרה")),
    notes: headers.findIndex((h) => h.includes("הערה")),
  };

  // Extract account number from metadata rows
  let account_number = "";
  for (let i = 0; i < headerIndex; i++) {
    const rowStr = rows[i].join(" ");
    const m = rowStr.match(/\d{2}-\d{3}-\d{6,}/);
    if (m) {
      account_number = m[0];
      break;
    }
  }

  const transactions: ParsedBankTransaction[] = [];
  let dateFrom: string | undefined;
  let dateTo: string | undefined;

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    const dateVal = col.date >= 0 ? row[col.date] : null;
    if (!dateVal) continue;

    const isoDate = parseHapoalimDate(dateVal);
    if (!isoDate) continue;

    try {
      if (!dateFrom || isoDate < dateFrom) dateFrom = isoDate;
      if (!dateTo || isoDate > dateTo) dateTo = isoDate;

      const tx: ParsedBankTransaction = {
        date: isoDate,
        description: col.desc >= 0 ? String(row[col.desc] ?? "") : "",
        details: col.details >= 0 ? String(row[col.details] ?? "") : "",
        reference: col.ref >= 0 ? String(row[col.ref] ?? "") : "",
        debit: col.debit >= 0 ? parseAmount(row[col.debit]) : 0,
        credit: col.credit >= 0 ? parseAmount(row[col.credit]) : 0,
        balance:
          col.balance >= 0 && row[col.balance] !== ""
            ? parseAmount(row[col.balance]) || null
            : null,
        operation_code:
          col.opCode >= 0 ? String(row[col.opCode] ?? "") || undefined : undefined,
        batch_code:
          col.batch >= 0 ? String(row[col.batch] ?? "") || undefined : undefined,
        notes:
          col.notes >= 0 ? String(row[col.notes] ?? "") || undefined : undefined,
        source_bank: "hapoalim",
        raw_row: Object.fromEntries(
          headers.map((h, idx) => [h, row[idx] ?? ""])
        ),
      };

      transactions.push(tx);
    } catch (e) {
      errors.push(`שורה ${i + 1}: ${String(e)}`);
    }
  }

  return {
    transactions,
    account_number,
    date_from: dateFrom,
    date_to: dateTo,
    errors,
  };
}
