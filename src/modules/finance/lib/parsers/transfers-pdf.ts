/**
 * Parser for Leumi "פרטי מוטבים" PDF (beneficiary transfer list).
 *
 * PDF is free-text (no structured tables), so we use pattern matching:
 *   - Name: Hebrew text before bank/amount line
 *   - ID: 9-digit number
 *   - Bank: number (bank code)
 *   - Branch: number
 *   - Account: number
 *   - Amount: number with optional ₪ or commas
 *
 * NOTE: Browser-side PDF text extraction requires the PDF to have selectable
 * text. We use pdfjs-dist (loaded dynamically) if available, otherwise we
 * return the raw text for manual review.
 *
 * For files where pdfjs is unavailable, we still attempt a regex-based parse
 * on the raw string if the caller passes text content.
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
  raw_text?: string;    // always populated so UI can show it even if parsing failed
}

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
  // In Leumi "ניהול חתימות", the final effective instruction date is the
  // last signer date in the approval cycle (just before/around "בוצעו").
  const sectionMatch =
    text.match(/חתימות\s*סבב\s*סטטוס([\s\S]{0,1200})/) ??
    text.match(/סבב\s*סטטוס([\s\S]{0,1200})/);
  const scope = sectionMatch?.[1] ?? text;
  const dateMatches = Array.from(scope.matchAll(/(\d{2}[./]\d{2}[./]\d{2,4})/g));
  if (dateMatches.length === 0) return "";
  const lastDate = dateMatches[dateMatches.length - 1]?.[1] ?? "";
  return lastDate ? parseDateToIso(lastDate) : "";
}

async function ensurePdfJsLib(): Promise<void> {
  const w = window as unknown as {
    pdfjsLib?: unknown;
    __pdfJsLoadPromise?: Promise<void>;
  };
  if (w.pdfjsLib) return;
  if (w.__pdfJsLoadPromise) return w.__pdfJsLoadPromise;

  w.__pdfJsLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-pdfjs="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("failed to load pdfjs")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.async = true;
    script.setAttribute("data-pdfjs", "true");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("failed to load pdfjs"));
    document.head.appendChild(script);
  });

  return w.__pdfJsLoadPromise;
}

function extractFromText(text: string): Omit<TransfersPdfResult, "errors"> {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Extract reference
  const refMatch = text.match(/(?:מספר\s*)?אסמכתא[:\s]*(\d+)/);
  const reference = refMatch?.[1] ?? "";

  // Extract date:
  // 1) Prefer final approval signer date from status cycle.
  // 2) Fallback to instruction date if available.
  // 3) Last fallback: first date in document.
  let doc_date = extractFinalApprovalDate(text);
  if (!doc_date) {
    const dateMatch =
      text.match(/תאריך[^:\n]*ביצוע[^:\n]*[:\s]+(\d{2}[./]\d{2}[./]\d{2,4})/) ??
      text.match(/תאריך[^:\n]*[:\s]+(\d{2}[./]\d{2}[./]\d{2,4})/) ??
      text.match(/(\d{2}[./]\d{2}[./]\d{2,4})/);
    if (dateMatch) doc_date = parseDateToIso(dateMatch[1] ?? "");
  }

  // Extract total
  const totalMatch =
    text.match(/סה['"״]?כ\s*העברה[^0-9]*([\d,]+\.\d{2})/) ??
    text.match(/סה['"״]?כ[^0-9]*([\d,]+\.\d{2})/);
  const total_amount = totalMatch ? parseAmount(totalMatch[1] ?? "") : 0;

  // Parse line-based rows for Leumi "פרטים נוספים" layout
  // Example:
  // 5,310.00  50454  20752/63  034  (11) בנק ...  יהב מלגזות
  const items: TransferItem[] = [];
  let idx = 0;
  for (const line of lines) {
    if (!/[\d,]+\.\d{2}/.test(line)) continue;
    if (!/[א-ת]/.test(line)) continue;
    if (line.includes("סה") || line.includes("נכון לתאריך") || line.includes("פרטים נוספים")) continue;
    if (line.includes("סכום העברה") || line.includes("שם מוטב")) continue;

    const amountMatch = line.match(/([\d,]+\.\d{2})/);
    const amount = parseAmount(amountMatch?.[1] ?? "");
    if (!amount) continue;

    const bankMatch = line.match(/\((\d{2})\)\s*בנק/);
    const accountMatch = line.match(/(\d{2,}\/\d{1,2})/);
    const branchMatch = line.match(/\s(\d{3})\s+\(\d{2}\)\s*בנק/);
    const idMatch = line.match(/\b(\d{9})\b/);

    const nameMatch = line.match(/([א-ת][א-ת\s"'׳״-]{1,})$/);
    const payeeName = (nameMatch?.[1] ?? "").trim().replace(/\s+/g, " ");
    if (!payeeName) continue;

    items.push({
      row_index: idx++,
      payee_name: payeeName,
      payee_id: idMatch?.[1] ?? "",
      bank: bankMatch?.[1] ?? "",
      branch: branchMatch?.[1] ?? "",
      account: accountMatch?.[1] ?? "",
      amount,
    });
  }

  // Fallback: extract amount + trailing Hebrew text lines
  if (items.length === 0) {
    lines.forEach((line, i) => {
      if (!/[\d,]+\.\d{2}/.test(line) || !/[א-ת]/.test(line)) return;
      const amtMatch = line.match(/([\d,]+\.\d{2})/);
      const nameMatch = line.match(/([א-ת][א-ת\s"'׳״-]{1,})$/);
      if (!amtMatch || !nameMatch) return;
      items.push({
        row_index: i,
        payee_name: (nameMatch[1] ?? "").trim(),
        payee_id: "",
        bank: "",
        branch: "",
        account: "",
        amount: parseAmount(amtMatch[1] ?? ""),
      });
    });
  }

  return {
    reference,
    doc_date,
    total_amount: total_amount || items.reduce((s, i) => s + i.amount, 0),
    payee_count: items.length,
    items,
    raw_text: text,
  };
}

export async function parseTransfersPDF(file: File): Promise<TransfersPdfResult> {
  const errors: string[] = [];

  // Read file as ArrayBuffer and try to extract text using PDF.js
  // PDF.js is loaded dynamically from CDN to avoid bundling issues
  try {
    await ensurePdfJsLib();
    const buffer = await file.arrayBuffer();

    // Try pdfjs if available in window
    const pdfjs = (window as unknown as Record<string, unknown>)["pdfjsLib"] as
      | { getDocument: (src: { data: Uint8Array }) => { promise: Promise<{ numPages: number; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: { str: string }[] }> }> }> } }
      | undefined;

    if (pdfjs) {
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
      let fullText = "";
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        fullText += content.items.map((i) => i.str).join(" ") + "\n";
      }
      const result = extractFromText(fullText);
      return { ...result, errors };
    }
  } catch (e) {
    errors.push(`לא ניתן לפרסר PDF: ${String(e)}`);
  }

  // Fallback: try reading as text (some PDFs are text-based)
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
    // ignore
  }

  errors.push("לא ניתן לחלץ טקסט מה-PDF. ייתכן שהוא מסרוק (תמונה).");
  return {
    reference: "",
    doc_date: "",
    total_amount: 0,
    payee_count: 0,
    items: [],
    errors,
    raw_text: "",
  };
}
