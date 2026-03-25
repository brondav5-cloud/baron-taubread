/**
 * Parser for Leumi Diners card (BankLeumi *.xls — HTML-in-XLS)
 *
 * Two sections in the same file:
 *   1. "עסקאות אחרונות שטרם נקלטו": תאריך (DD.MM.YY) | שעה | שם בית העסק | סוג | פרטים | סכום
 *   2. "עסקאות בש"ח במועד החיוב":   תאריך (DD/MM/YY) | שם | סכום | סוג | פרטים | סכום חיוב
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
  const year = parseInt(yy) + 2000;
  return `${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function parseAmount(s: string): number {
  return parseFloat(s.replace(/[^\d.-]/g, "")) || 0;
}

function extractTableData(table: Element): { headers: string[]; rows: string[][] } {
  const allRows = Array.from(table.querySelectorAll("tr"));
  const headers: string[] = [];
  const rows: string[][] = [];
  let headerFound = false;

  for (const tr of allRows) {
    const cells = Array.from(tr.querySelectorAll("th, td")).map(
      (c) => c.textContent?.trim() ?? ""
    );
    if (!headerFound) {
      if (cells.some((c) => c.includes("תאריך") && cells.length >= 3)) {
        headers.push(...cells);
        headerFound = true;
      }
    } else {
      if (cells.length >= 3 && cells.some((c) => c.length > 0)) {
        rows.push(cells);
      }
    }
  }
  return { headers, rows };
}

export async function parseLeumiCreditXLS(file: File): Promise<LeumiCreditParseResult> {
  const errors: string[] = [];

  let text = await readFileAsText(file, "windows-1255");
  if (!text.includes("תאריך") && !text.includes("&#")) {
    text = await readFileAsText(file, "utf-8");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/html");
  const tables = Array.from(doc.querySelectorAll("table"));

  const allItems: LeumiCreditItem[] = [];
  let charge_date = "";

  for (const table of tables) {
    const { headers, rows } = extractTableData(table);
    if (headers.length === 0 || rows.length === 0) continue;

    const hasDate = headers.some((h) => h.includes("תאריך"));
    if (!hasDate) continue;

    const isPending = table.closest("*")?.previousElementSibling?.textContent?.includes("טרם") ||
      headers.some((h) => h.includes("שעה"));

    const colDate = headers.findIndex((h) => h.includes("תאריך"));
    const colName = headers.findIndex((h) => h.includes("שם") || h.includes("עסק"));
    const colType = headers.findIndex((h) => h.includes("סוג"));
    const colDetails = headers.findIndex((h) => h.includes("פרטים"));
    const colAmount = headers.findIndex((h) => h.includes("סכום") && !h.includes("חיוב"));
    const colCharge = headers.findIndex((h) => h.includes("סכום חיוב"));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] ?? [];
      const dateRaw = row[colDate] ?? "";
      if (!dateRaw) continue;

      let isoDate = "";
      if (dateRaw.includes(".")) isoDate = parseDateDDMMYY(dateRaw, ".");
      else if (dateRaw.includes("/")) isoDate = parseDateDDMMYY(dateRaw, "/");
      else continue;

      const amount = parseAmount(row[colAmount] ?? "");
      if (amount === 0) continue;

      const section: "pending" | "charged" = isPending ? "pending" : "charged";
      const chargeAmt = colCharge >= 0 ? parseAmount(row[colCharge] ?? "") : amount;

      if (section === "charged" && !charge_date && isoDate) {
        charge_date = isoDate;
      }

      allItems.push({
        row_index: i,
        transaction_date: isoDate,
        business_name: colName >= 0 ? (row[colName] ?? "") : "",
        transaction_type: colType >= 0 ? (row[colType] ?? "") : "",
        details: colDetails >= 0 ? (row[colDetails] ?? "") : "",
        amount,
        charge_amount: chargeAmt,
        section,
      });
    }
  }

  const charged = allItems.filter((i) => i.section === "charged");
  const total_charge = charged.reduce((s, i) => s + i.charge_amount, 0);

  return { charge_date, total_charge, items: allItems, errors };
}
