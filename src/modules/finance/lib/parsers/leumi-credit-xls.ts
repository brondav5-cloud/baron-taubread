/**
 * Parser for Leumi Diners card (BankLeumi *.xls — HTML-in-XLS)
 *
 * The file is actually an HTML document saved with a .xls extension.
 * We parse it via regex (NOT DOMParser) for reliability across browsers.
 *
 * Table structure:
 *   Header row: תאריך העסקה | שם בית העסק | סכום העסקה | סוג העסקה | פרטים | סכום חיוב
 *   Data rows:  DD/MM/YY    | name         | amount       | type       | (often absent) | charge
 *
 * NOTE: Data rows often have 5 cells (פרטים column absent), so column
 *       indices must be resolved relative to actual row length.
 */

export interface LeumiCreditItem {
  row_index: number;
  transaction_date: string;
  business_name: string;
  transaction_type: string;
  details: string;
  amount: number;
  charge_amount: number;
  section: "pending" | "charged";
}

export interface LeumiCreditParseResult {
  charge_date: string;
  total_charge: number;
  items: LeumiCreditItem[];
  errors: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function readFileAsText(file: File, encoding: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file, encoding);
  });
}

function parseDateDDMMYY(s: string, sep: "." | "/"): string {
  const parts = s.split(sep);
  if (parts.length !== 3) return s;
  const [dd, mm, yy] = parts as [string, string, string];
  const year = parseInt(yy) + (parseInt(yy) < 50 ? 2000 : 1900);
  return `${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function parseAmount(s: string): number {
  return parseFloat(s.replace(/[^\d.-]/g, "")) || 0;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Extract all table rows as arrays of cell strings using regex.
 * Avoids DOMParser which can be unreliable with Office HTML.
 */
function extractRows(html: string): string[][] {
  const result: string[][] = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const tdRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;

  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRe.exec(html)) !== null) {
    const trContent = trMatch[1] ?? "";
    const cells: string[] = [];
    const localTd = new RegExp(tdRe.source, "gi");
    let tdMatch: RegExpExecArray | null;
    while ((tdMatch = localTd.exec(trContent)) !== null) {
      cells.push(stripHtml(tdMatch[1] ?? ""));
    }
    if (cells.some((c) => c.length > 0)) result.push(cells);
  }
  return result;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function parseLeumiCreditXLS(file: File): Promise<LeumiCreditParseResult> {
  const errors: string[] = [];

  // Detect encoding: try windows-1255 first, fall back to UTF-8
  let text = await readFileAsText(file, "windows-1255");
  if (!text.includes("תאריך") && !text.includes("&#")) {
    text = await readFileAsText(file, "utf-8");
  }

  const tableRows = extractRows(text);

  // ── Find header row ───────────────────────────────────────────────────────
  // Header row has ≥4 cells AND starts with a date-like or contains "תאריך"
  let headerIdx = -1;
  for (let i = 0; i < tableRows.length; i++) {
    const cells = tableRows[i]!;
    if (
      cells.length >= 4 &&
      cells.some((c) => c.includes("תאריך"))
    ) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    errors.push("header row not found");
    return { charge_date: "", total_charge: 0, items: [], errors };
  }

  const headers = tableRows[headerIdx]!;

  // Column index resolution from headers
  const colDate    = headers.findIndex((h) => h.includes("תאריך") && !h.includes("שם"));
  // "תאריך עסקה" contains "עסק" — exclude date/amount columns to avoid false match
  const colName    = headers.findIndex((h) => h.includes("שם") || (h.includes("עסק") && !h.includes("תאריך") && !h.includes("סכום")));
  const colType    = headers.findIndex((h) => h.includes("סוג"));
  const colDetails = headers.findIndex((h) => h.includes("פרטים"));
  // "סכום חיוב" must come before "סכום" (plain) to avoid false match
  const colCharge  = headers.findIndex((h) => h.includes("סכום חיוב"));
  const colAmount  = headers.findIndex((h) => h.includes("סכום") && !h.includes("חיוב"));

  // ── Parse data rows ───────────────────────────────────────────────────────
  const items: LeumiCreditItem[] = [];
  let charge_date = "";
  let currentSection: "pending" | "charged" = "charged";

  for (let i = headerIdx + 1; i < tableRows.length; i++) {
    const row = tableRows[i]!;

    // Section heading (e.g. "עסקאות שטרם נקלטו")
    if (row.length <= 2 && row[0]?.includes("עסקאות")) {
      currentSection = row[0].includes("טרם") ? "pending" : "charged";
      continue;
    }

    // Need at least 3 cells
    if (row.length < 3) continue;

    // Date cell must look like a date
    const dateRaw = colDate >= 0 && colDate < row.length ? (row[colDate] ?? "") : "";
    if (!dateRaw) continue;

    let isoDate = "";
    if (dateRaw.includes(".")) isoDate = parseDateDDMMYY(dateRaw, ".");
    else if (dateRaw.includes("/")) isoDate = parseDateDDMMYY(dateRaw, "/");
    else continue; // not a date row (e.g. total row)

    // Main amount
    const amount = colAmount >= 0 && colAmount < row.length
      ? parseAmount(row[colAmount] ?? "")
      : 0;
    if (amount === 0) continue;

    // Charge amount: data rows often have ONE fewer column than headers
    // (the "פרטים" column is absent). If colCharge is out of bounds,
    // use the last numeric cell instead.
    let chargeAmt = amount; // safe default
    if (colCharge >= 0) {
      if (colCharge < row.length) {
        chargeAmt = parseAmount(row[colCharge] ?? "");
      } else {
        // Row is shorter than header — try last cell
        const lastCell = row[row.length - 1] ?? "";
        const parsed = parseAmount(lastCell);
        if (parsed > 0) chargeAmt = parsed;
      }
    }
    if (chargeAmt === 0) chargeAmt = amount; // never leave charge at 0

    const section = currentSection;
    if (section === "charged" && !charge_date) {
      charge_date = isoDate;
    }

    const name = colName >= 0 && colName < row.length ? (row[colName] ?? "") : "";

    items.push({
      row_index: i,
      transaction_date: isoDate,
      business_name: name,
      transaction_type: colType >= 0 && colType < row.length ? (row[colType] ?? "") : "",
      details: colDetails >= 0 && colDetails < row.length ? (row[colDetails] ?? "") : "",
      amount,
      charge_amount: chargeAmt,
      section,
    });
  }

  const charged = items.filter((i) => i.section === "charged");
  const total_charge = charged.reduce((s, i) => s + i.charge_amount, 0);

  return { charge_date, total_charge, items, errors };
}
