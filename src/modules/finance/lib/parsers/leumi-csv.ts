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

/** DD/MM/YYYY | DD/MM/YY | DD.MM.YYYY | DD.MM.YY → YYYY-MM-DD */
function parseDate(s: string): string {
  const sep = s.includes("/") ? "/" : s.includes(".") ? "." : null;
  if (!sep) return s;
  const [dd, mm, yearPart] = s.split(sep);
  if (!dd || !mm || !yearPart) return s;

  const yearNum = parseInt(yearPart, 10);
  if (!Number.isFinite(yearNum)) return s;

  const year = yearPart.length === 2
    ? yearNum + (yearNum < 50 ? 2000 : 1900)
    : yearNum;

  return `${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

/** "10,745.79" or "10745.79" → number */
function parseAmount(s: string): number {
  if (!s) return 0;
  return parseFloat(s.replace(/[^\d.-]/g, "")) || 0;
}

function findHtmlTable(doc: Document): { headers: string[]; rows: string[][] } | null {
  const tables = Array.from(doc.querySelectorAll("table"));
  for (const table of tables) {
    const allRows = Array.from(table.querySelectorAll("tr"));
    if (allRows.length < 3) continue;

    let headerIdx = -1;
    for (let i = 0; i < Math.min(20, allRows.length); i++) {
      const text = allRows[i]?.textContent ?? "";
      if (text.includes("תאריך") && text.includes("אסמכתא") && (text.includes("בחובה") || text.includes("בזכות"))) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) continue;

    const headers = Array.from(allRows[headerIdx]?.querySelectorAll("th, td") ?? [])
      .map((cell) => cell.textContent?.trim() ?? "");

    const rows: string[][] = [];
    for (let i = headerIdx + 1; i < allRows.length; i++) {
      const cells = Array.from(allRows[i]?.querySelectorAll("td") ?? [])
        .map((cell) => cell.textContent?.trim() ?? "");
      if (cells.length >= 5 && cells.some((c) => c.length > 0)) {
        rows.push(cells);
      }
    }

    if (rows.length > 0) return { headers, rows };
  }
  return null;
}

function parseLeumiHtml(text: string): BankParseResult {
  const errors: string[] = [];
  const doc = new DOMParser().parseFromString(text, "text/html");
  const table = findHtmlTable(doc);
  if (!table) {
    return {
      transactions: [],
      account_number: "",
      errors: ["לא נמצאה טבלת תנועות בקובץ לאומי (XLS/HTML)"],
    };
  }

  const { headers, rows } = table;
  const col = {
    date: headers.findIndex((h) => h.includes("תאריך") && !h.includes("ערך")),
    desc: headers.findIndex((h) => h.includes("תיאור תנועה") || h.includes("סוג תנועה")),
    ref: headers.findIndex((h) => h.includes("אסמכתא")),
    debit: headers.findIndex((h) => h.includes("בחובה") || h === "חובה"),
    credit: headers.findIndex((h) => h.includes("בזכות") || h === "זכות"),
    balance: headers.findIndex((h) => h.includes("יתרה")),
    details: headers.findIndex((h) => h.includes("תיאור מורחב")),
    notes: headers.findIndex((h) => h.includes("הערות")),
    branch: headers.findIndex((h) => h.includes("סניף")),
    account: headers.findIndex((h) => h.includes("חשבון")),
  };

  let account_number = "";
  const firstDataRow = rows[0] ?? [];
  const branch = col.branch >= 0 ? (firstDataRow[col.branch] ?? "").trim() : "";
  const account = col.account >= 0 ? (firstDataRow[col.account] ?? "").trim() : "";
  if (branch && account) {
    account_number = `${branch}-${account}`;
  } else {
    const textAll = doc.body?.textContent ?? "";
    const m = textAll.match(/\d{2,3}-\d{5,}\/\d+|\d{2,3}-\d{5,}/);
    if (m) account_number = m[0] ?? "";
  }

  const transactions: ParsedBankTransaction[] = [];
  let dateFrom: string | undefined;
  let dateTo: string | undefined;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const dateRaw = col.date >= 0 ? (row[col.date] ?? "") : "";
    if (!dateRaw || (!dateRaw.includes("/") && !dateRaw.includes("."))) continue;

    try {
      const isoDate = parseDate(dateRaw);
      if (!dateFrom || isoDate < dateFrom) dateFrom = isoDate;
      if (!dateTo || isoDate > dateTo) dateTo = isoDate;

      transactions.push({
        date: isoDate,
        description: col.desc >= 0 ? (row[col.desc] ?? "") : "",
        details: col.details >= 0 ? (row[col.details] ?? "") : "",
        reference: col.ref >= 0 ? (row[col.ref] ?? "") : "",
        debit: col.debit >= 0 ? parseAmount(row[col.debit] ?? "") : 0,
        credit: col.credit >= 0 ? parseAmount(row[col.credit] ?? "") : 0,
        balance: col.balance >= 0 ? parseAmount(row[col.balance] ?? "") || null : null,
        notes: col.notes >= 0 ? (row[col.notes] ?? "") || undefined : undefined,
        source_bank: "leumi",
        raw_row: Object.fromEntries(headers.map((h, idx) => [h, row[idx] ?? ""])),
      });
    } catch (e) {
      errors.push(`שורה ${i + 1}: ${String(e)}`);
    }
  }

  return { transactions, account_number, date_from: dateFrom, date_to: dateTo, errors };
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

  // Some Leumi exports are XLS files that actually contain HTML.
  if (/<html|<table/i.test(text)) {
    return parseLeumiHtml(text);
  }

  const lines = text
    .split("\n")
    .map((l) => l.replace(/\r$/, "").trim())
    .filter((l) => l.length > 0);

  // Dynamically find header row (contains both "תאריך" and "אסמכתא")
  let headerIndex = -1;
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    if ((lines[i] ?? "").includes("תאריך") && (lines[i] ?? "").includes("אסמכתא")) {
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

  const headers = parseCSVRow(lines[headerIndex] ?? "");

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
    const m = (lines[i] ?? "").match(/\d{3}-\d{6,}\/\d+|\d{2}-\d{3}-\d{6,}/);
    if (m) {
      account_number = m[0];
      break;
    }
  }

  const transactions: ParsedBankTransaction[] = [];
  let dateFrom: string | undefined;
  let dateTo: string | undefined;

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const cols = parseCSVRow(lines[i] ?? "");
    if (cols.length < 5) continue;

    const dateRaw = cols[col.date] ?? "";
    if (!dateRaw.includes("/")) continue;

    try {
      const isoDate = parseDate(dateRaw);

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
