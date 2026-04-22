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

/** DD/MM/YY | DD/MM/YYYY | DD.MM.YY | DD.MM.YYYY → YYYY-MM-DD */
function parseDDMMYY(s: string): string {
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

function parseAmount(s: string): number {
  if (!s) return 0;
  // Strip currency symbols, spaces, RTL marks
  const clean = s.replace(/[^\d.-]/g, "");
  return parseFloat(clean) || 0;
}

/** Extracts the first table that looks like bank transactions */
function findTransactionTable(
  doc: Document
): { headers: string[]; rows: string[][] } | null {
  const tables = Array.from(doc.querySelectorAll("table"));

  for (const table of tables) {
    const allRows = Array.from(table.querySelectorAll("tr"));
    if (allRows.length < 3) continue;

    // Find a row that has both "תאריך" and "חובה"/"זכות"
    let headerIdx = -1;
    for (let i = 0; i < Math.min(10, allRows.length); i++) {
      const text = allRows[i]?.textContent ?? "";
      if (text.includes("תאריך") && (text.includes("חובה") || text.includes("זכות"))) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) continue;

    const headers = Array.from(
      allRows[headerIdx]?.querySelectorAll("th, td") ?? []
    ).map((c) => c.textContent?.trim() ?? "");

    const rows: string[][] = [];
    for (let i = headerIdx + 1; i < allRows.length; i++) {
      const cells = Array.from(allRows[i]?.querySelectorAll("td") ?? []).map(
        (c) => c.textContent?.trim() ?? ""
      );
      if (cells.length >= 3 && cells.some((c) => c.length > 0)) {
        rows.push(cells);
      }
    }

    if (rows.length > 0) return { headers, rows };
  }

  return null;
}

// ─── Main parser ─────────────────────────────────────────────────────────────

export async function parseMizrahiXLS(file: File): Promise<BankParseResult> {
  const errors: string[] = [];

  // Israeli bank HTML-in-XLS files are typically windows-1255
  let text = await readFileAsText(file, "windows-1255");

  // Verify we got readable Hebrew; if not, try utf-8
  if (!text.includes("תאריך") && !text.includes("&#")) {
    text = await readFileAsText(file, "utf-8");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/html");

  const tableData = findTransactionTable(doc);
  if (!tableData) {
    return {
      transactions: [],
      account_number: "",
      errors: ["לא נמצאה טבלת תנועות בקובץ (צפוי: HTML-in-XLS עם עמודות תאריך/חובה/זכות)"],
    };
  }

  const { headers, rows } = tableData;

  const col = {
    date: headers.findIndex((h) => h.includes("תאריך") && !h.includes("ערך")),
    type: headers.findIndex((h) => h.includes("סוג תנועה") || h.includes("סוג")),
    credit: headers.findIndex((h) => h.includes("זכות")),
    debit: headers.findIndex((h) => h.includes("חובה")),
    balance: headers.findIndex((h) => h.includes("יתרה")),
    ref: headers.findIndex((h) => h.includes("אסמכתא")),
  };

  // Try to extract account number from page text
  let account_number = "";
  const bodyText = doc.body?.textContent ?? "";
  const m = bodyText.match(/\b(\d{3}-\d{5,})\b/);
  if (m) account_number = m[1] ?? "";

  const transactions: ParsedBankTransaction[] = [];
  let dateFrom: string | undefined;
  let dateTo: string | undefined;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const dateRaw = col.date >= 0 ? (row[col.date] ?? "") : "";
    if (!dateRaw || (!dateRaw.includes("/") && !dateRaw.includes("."))) continue;

    try {
      const isoDate = parseDDMMYY(dateRaw);

      if (!dateFrom || isoDate < dateFrom) dateFrom = isoDate;
      if (!dateTo || isoDate > dateTo) dateTo = isoDate;

      const tx: ParsedBankTransaction = {
        date: isoDate,
        description: col.type >= 0 ? (row[col.type] ?? "") : "",
        details: "",
        reference: col.ref >= 0 ? (row[col.ref] ?? "") : "",
        debit: col.debit >= 0 ? parseAmount(row[col.debit] ?? "") : 0,
        credit: col.credit >= 0 ? parseAmount(row[col.credit] ?? "") : 0,
        balance:
          col.balance >= 0
            ? parseAmount(row[col.balance] ?? "") || null
            : null,
        source_bank: "mizrahi",
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
