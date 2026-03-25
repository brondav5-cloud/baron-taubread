import type { BankParseResult, ParsedBankTransaction } from "../../types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readFileAsText(file: File, encoding: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file, encoding);
  });
}

/** Splits a single CSV line respecting quoted fields (e.g. "10,745.79") */
function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/** DD/MM/YYYY → YYYY-MM-DD */
function parseDDMMYYYY(s: string): string {
  const [dd, mm, yyyy] = s.split("/");
  if (!dd || !mm || !yyyy) return s;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

/** "10,745.79" or "10745.79" → number */
function parseAmount(s: string): number {
  if (!s) return 0;
  return parseFloat(s.replace(/,/g, "")) || 0;
}

// ─── Main parser ─────────────────────────────────────────────────────────────

export async function parseLeumiCSV(file: File): Promise<BankParseResult> {
  const errors: string[] = [];

  // Leumi CSV is usually UTF-8-BOM; fall back to windows-1255 if Hebrew is garbled
  let text = await readFileAsText(file, "utf-8");
  if (!text.includes("תאריך") && !text.includes("אסמכתא")) {
    text = await readFileAsText(file, "windows-1255");
  }
  // Strip UTF-8 BOM if present
  text = text.replace(/^\uFEFF/, "");

  const lines = text
    .split("\n")
    .map((l) => l.replace(/\r$/, "").trim())
    .filter((l) => l.length > 0);

  // Dynamically find header row (contains both "תאריך" and "אסמכתא")
  let headerIndex = -1;
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    if (lines[i].includes("תאריך") && lines[i].includes("אסמכתא")) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    return {
      transactions: [],
      account_number: "",
      errors: ["לא נמצאה שורת כותרת בקובץ (צפוי: עמודות תאריך + אסמכתא)"],
    };
  }

  const headers = parseCSVRow(lines[headerIndex]);

  const col = {
    date: headers.findIndex((h) => h.includes("תאריך")),
    desc: headers.findIndex((h) => h.includes("תיאור תנועה")),
    ref: headers.findIndex((h) => h.includes("אסמכתא")),
    debit: headers.findIndex((h) => h.includes("בחובה") || h === "חובה"),
    credit: headers.findIndex((h) => h.includes("בזכות") || h === "זכות"),
    balance: headers.findIndex((h) => h.includes("יתרה")),
    details: headers.findIndex((h) => h.includes("תיאור מורחב")),
    notes: headers.findIndex((h) => h.includes("הערות")),
  };

  // Extract account number from metadata lines before the header
  let account_number = "";
  for (let i = 0; i < headerIndex; i++) {
    const m = lines[i].match(/\d{3}-\d{6,}\/\d+|\d{2}-\d{3}-\d{6,}/);
    if (m) {
      account_number = m[0];
      break;
    }
  }

  const transactions: ParsedBankTransaction[] = [];
  let dateFrom: string | undefined;
  let dateTo: string | undefined;

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const cols = parseCSVRow(lines[i]);
    if (cols.length < 5) continue;

    const dateRaw = cols[col.date] ?? "";
    if (!dateRaw.includes("/")) continue;

    try {
      const isoDate = parseDDMMYYYY(dateRaw);

      if (!dateFrom || isoDate < dateFrom) dateFrom = isoDate;
      if (!dateTo || isoDate > dateTo) dateTo = isoDate;

      const tx: ParsedBankTransaction = {
        date: isoDate,
        description: col.desc >= 0 ? (cols[col.desc] ?? "") : "",
        details: col.details >= 0 ? (cols[col.details] ?? "") : "",
        reference: col.ref >= 0 ? (cols[col.ref] ?? "") : "",
        debit: col.debit >= 0 ? parseAmount(cols[col.debit] ?? "") : 0,
        credit: col.credit >= 0 ? parseAmount(cols[col.credit] ?? "") : 0,
        balance:
          col.balance >= 0
            ? parseAmount(cols[col.balance] ?? "") || null
            : null,
        notes: col.notes >= 0 ? (cols[col.notes] ?? "") || undefined : undefined,
        source_bank: "leumi",
        raw_row: Object.fromEntries(
          headers.map((h, idx) => [h, cols[idx] ?? ""])
        ),
      };

      transactions.push(tx);
    } catch (e) {
      errors.push(`שורה ${i + 1}: ${String(e)}`);
    }
  }

  return { transactions, account_number, date_from: dateFrom, date_to: dateTo, errors };
}
