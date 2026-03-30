/**
 * Parser for Leumi "ניהול חתימות" / "פרטי מוטבים" PDFs.
 *
 * Format A – "ניהול חתימות": each beneficiary block ends with a line like
 *   "041  193180644  ₪ 5,096.00" (branch + account + ₪ + amount).
 *   Name lines (one part per line, repeated twice) appear above.
 * Format B – "פרטי מוטבים": tab-separated single-line rows per beneficiary.
 */

export interface TransferItem {
  row_index: number;
  payee_name: string;
  payee_id: string;
  bank: string;
  branch: string;
  account: string;
  amount: number;
}

export interface TransfersPdfResult {
  reference: string;
  doc_date: string;
  total_amount: number;
  payee_count: number;
  items: TransferItem[];
  errors: string[];
  raw_text?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseAmount(v: string): number {
  const n = parseFloat((v ?? "").replace(/,/g, "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

function parseDateToIso(raw: string): string {
  const sep = raw.includes(".") ? "." : "/";
  const parts = raw.split(sep);
  if (parts.length !== 3) return "";
  const [dd, mm, yy] = parts as [string, string, string];
  const year = yy.length === 2 ? `20${yy}` : yy;
  return `${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function extractFinalApprovalDate(text: string): string {
  const scope =
    text.match(/חתימות\s*סבב\s*סטטוס([\s\S]{0,1200})/)?.[1] ??
    text.match(/סבב\s*סטטוס([\s\S]{0,1200})/)?.[1] ??
    text;
  const dates = Array.from(scope.matchAll(/(\d{2}[./]\d{2}[./]\d{2,4})/g));
  const last = dates[dates.length - 1]?.[1] ?? "";
  return last ? parseDateToIso(last) : "";
}

// ─── pdfjs loader ─────────────────────────────────────────────────────────────

async function ensurePdfJsLib(): Promise<void> {
  const w = window as unknown as { pdfjsLib?: unknown; __pdfJsLoadPromise?: Promise<void> };
  if (w.pdfjsLib) return;
  if (w.__pdfJsLoadPromise) return w.__pdfJsLoadPromise;
  w.__pdfJsLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-pdfjs="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("pdfjs load failed")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.async = true;
    script.setAttribute("data-pdfjs", "true");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("pdfjs load failed"));
    document.head.appendChild(script);
  });
  return w.__pdfJsLoadPromise;
}

/** Reconstruct lines from pdfjs content items using Y-coordinate grouping. */
function pdfItemsToLines(items: { str: string; transform?: number[] }[]): string[] {
  const lineMap = new Map<number, { x: number; str: string }[]>();
  for (const item of items) {
    if (!item.str.trim()) continue;
    const y = Math.round((item.transform?.[5] ?? 0) / 3) * 3; // 3 pt tolerance
    const x = item.transform?.[4] ?? 0;
    if (!lineMap.has(y)) lineMap.set(y, []);
    lineMap.get(y)!.push({ x, str: item.str });
  }
  return Array.from(lineMap.entries())
    .sort((a, b) => b[0] - a[0]) // PDF Y is bottom-up → descending = top-to-bottom
    .map(([, xs]) =>
      xs
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join(" ")
        .trim()
    )
    .filter(Boolean);
}

// ─── Name-line filter ─────────────────────────────────────────────────────────

/** Hebrew-only text (letters + spaces + common punctuation) */
const HEBREW_ONLY_RE = /^[א-ת][א-ת\s"'׳״\-]+$/;
const SKIP_NAME_RE =
  /בנק|אישור|למוטב|בוצעו|קבוצה|PEPPER|כולל|טאוברד|העברה|מוטב|מסמכים|תקרת|תשלום|חשבון|הנפקה|ניהול|סטטוס|חתימות|דיסקונט|לאומי|מזרחי|פועלים|הבינלאומי|הראשון|טפחות|אגודת|ישראל/;

function isNameLine(line: string): boolean {
  const t = line.trim();
  return t.length >= 2 && HEBREW_ONLY_RE.test(t) && !SKIP_NAME_RE.test(t);
}

// ─── Format A: anchor on beneficiary amount lines ─────────────────────────────
//
// Beneficiary amount lines have:
//   - a ₪ symbol followed by the amount
//   - AND a 6+ digit account number somewhere on the same line
//   e.g. "041  193180644  ₪ 5,310.00"  or  "₪ 5,310.00  193180644  041"
//
// Total lines (₪ 156,445.28) have no extra account numbers → filtered out.

const SKIP_AMT_RE = /סה|נכון|הנפקה|תאריך|חשבון\s*לחיוב|-- \d|בוצעו/;

function parseBeneficiaryAmt(line: string): number | null {
  if (SKIP_AMT_RE.test(line)) return null;
  const shekel = line.match(/₪\s*([\d,]+\.\d{2})/);
  if (!shekel) return null;
  // Must have at least 6 consecutive digits (account number) beyond just the amount
  if (!/\d{6,}/.test(line)) return null;
  const amount = parseAmount(shekel[1] ?? "");
  return amount > 0 ? amount : null;
}

function extractFormatA(lines: string[]): TransferItem[] {
  // Locate all beneficiary amount lines
  const amtLines: { idx: number; amount: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const a = parseBeneficiaryAmt(lines[i]!);
    if (a !== null) amtLines.push({ idx: i, amount: a });
  }
  if (amtLines.length === 0) return [];

  const items: TransferItem[] = [];
  let prevIdx = -1;

  for (const { idx, amount } of amtLines) {
    // Look at lines between previous amount line and this one for the name
    const window = lines.slice(prevIdx + 1, idx);
    const candidates = window.filter(isNameLine);

    // Deduplicate: Hebrew name is written twice → stop at first repeated line
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const nl of candidates) {
      if (seen.has(nl)) break;
      seen.add(nl);
      unique.push(nl);
    }

    const name = unique.join(" ").trim();
    if (name) {
      items.push({ row_index: items.length, payee_name: name, payee_id: "", bank: "", branch: "", account: "", amount });
    }
    prevIdx = idx;
  }
  return items;
}

// ─── Format B: "פרטי מוטבים" tab-separated rows ───────────────────────────────

function extractFormatB(lines: string[]): TransferItem[] {
  const items: TransferItem[] = [];
  for (const line of lines) {
    if (!/[\d,]+\.\d{2}/.test(line) || !/[א-ת]/.test(line)) continue;
    if (/סה|נכון|הנפקה|תאריך|שם מוטב|סכום העברה/.test(line)) continue;
    const amtMatch = line.match(/([\d,]+\.\d{2})/);
    const nameMatch = line.match(/([א-ת][א-ת\s"'׳״\-]{1,})$/);
    if (!amtMatch || !nameMatch) continue;
    const amount = parseAmount(amtMatch[1] ?? "");
    if (!amount) continue;
    const bankMatch = line.match(/\((\d{2})\)\s*בנק/);
    const accountMatch = line.match(/(\d{2,}\/\d{1,2})/);
    const branchMatch = line.match(/\s(\d{3})\s+\(\d{2}\)\s*בנק/);
    items.push({
      row_index: items.length,
      payee_name: (nameMatch[1] ?? "").trim().replace(/\s+/g, " "),
      payee_id: "",
      bank: bankMatch?.[1] ?? "",
      branch: branchMatch?.[1] ?? "",
      account: accountMatch?.[1] ?? "",
      amount,
    });
  }
  return items;
}

// ─── Main extractor ──────────────────────────────────────────────────────────

function extractFromText(text: string): Omit<TransfersPdfResult, "errors"> {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Reference: "אסמכתא: XXXX" or "הוראה מספר XXXX"
  const refMatch =
    text.match(/(?:מספר\s*)?אסמכתא[:\s]*(\d+)/) ??
    text.match(/הוראה\s*מספר[:\s\t]*(\d{6,})/) ??
    text.match(/(\d{6,})[^\n]*הוראה\s*מספר/);
  const reference = refMatch?.[1] ?? "";

  // Date: prefer final approval date, fall back to any date
  let doc_date = extractFinalApprovalDate(text);
  if (!doc_date) {
    const m =
      text.match(/תאריך[^:\n]*ביצוע[^:\n]*[:\s]+(\d{2}[./]\d{2}[./]\d{2,4})/) ??
      text.match(/תאריך[^:\n]*[:\s]+(\d{2}[./]\d{2}[./]\d{2,4})/) ??
      text.match(/(\d{2}[./]\d{2}[./]\d{2,4})/);
    if (m) doc_date = parseDateToIso(m[1] ?? "");
  }

  // Total amount: handles both "להעברה סה"כ ₪ X" and "סה"כ העברה: X"
  const totalMatch =
    text.match(/להעברה\s*סה["״'`]?כ[^₪\d]*(?:₪\s*)?([\d,]+\.\d{2})/) ??
    text.match(/סה["״'`]?כ\s*העברה[^₪\d]*(?:₪\s*)?([\d,]+\.\d{2})/) ??
    text.match(/סה["״'`]?כ[^₪\d]*(?:₪\s*)?([\d,]+\.\d{2})/);
  const total_amount = totalMatch ? parseAmount(totalMatch[1] ?? "") : 0;

  // Items: try Format A first (ניהול חתימות), fall back to Format B (פרטי מוטבים)
  let items = extractFormatA(lines);
  if (items.length === 0) items = extractFormatB(lines);

  return {
    reference,
    doc_date,
    total_amount: total_amount || items.reduce((s, i) => s + i.amount, 0),
    payee_count: items.length,
    items,
    raw_text: text,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function parseTransfersPDF(file: File): Promise<TransfersPdfResult> {
  const errors: string[] = [];

  // Try pdfjs (best quality, proper line reconstruction)
  try {
    await ensurePdfJsLib();
    const buffer = await file.arrayBuffer();
    type Item = { str: string; transform?: number[] };
    type Page = { getTextContent: () => Promise<{ items: Item[] }> };
    type Doc = { numPages: number; getPage: (n: number) => Promise<Page> };
    type Lib = { getDocument: (s: { data: Uint8Array }) => { promise: Promise<Doc> } };

    const pdfjs = (window as unknown as Record<string, unknown>)["pdfjsLib"] as Lib | undefined;
    if (pdfjs) {
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
      let fullText = "";
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        const lines = pdfItemsToLines(content.items);
        fullText += lines.join("\n") + "\n";
      }
      const result = extractFromText(fullText);
      if (result.items.length > 0 || result.total_amount > 0) {
        return { ...result, errors };
      }
    }
  } catch (e) {
    errors.push(`שגיאת pdf.js: ${String(e)}`);
  }

  // Fallback: FileReader (works when PDF embeds text as UTF-8)
  try {
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file, "utf-8");
    });
    const result = extractFromText(text);
    if (result.items.length > 0 || result.total_amount > 0) return { ...result, errors };
  } catch {
    /* ignore */
  }

  errors.push("לא ניתן לחלץ טקסט מה-PDF. ייתכן שהוא מסרוק (תמונה).");
  return { reference: "", doc_date: "", total_amount: 0, payee_count: 0, items: [], errors, raw_text: "" };
}
