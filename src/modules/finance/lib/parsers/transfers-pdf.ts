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

function extractFromText(text: string): Omit<TransfersPdfResult, "errors"> {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Extract reference
  const refMatch = text.match(/אסמכתא[:\s]*(\d+)/);
  const reference = refMatch?.[1] ?? "";

  // Extract date
  const dateMatch = text.match(/(\d{2}[./]\d{2}[./]\d{2,4})/);
  let doc_date = "";
  if (dateMatch) {
    const raw = dateMatch[1] ?? "";
    const sep = raw.includes(".") ? "." : "/";
    const parts = raw.split(sep);
    if (parts.length === 3) {
      const [dd, mm, yy] = parts as [string, string, string];
      const year = yy.length === 2 ? `20${yy}` : yy;
      doc_date = `${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
  }

  // Extract total
  const totalMatch = text.match(/סה"כ[^₪\d]*([\d,]+\.?\d*)/);
  const total_amount = totalMatch
    ? parseFloat((totalMatch[1] ?? "").replace(/,/g, ""))
    : 0;

  // Pattern: Hebrew name + ID (9 digits) + bank + branch + account + amount
  // This is a heuristic — actual PDF layout varies
  const items: TransferItem[] = [];
  const itemPattern = /([א-ת\s"']{2,30})\s+(\d{9})\s+(\d{1,3})\s+(\d{2,4})\s+([\d/-]{5,20})\s+([\d,]+\.?\d*)/g;

  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = itemPattern.exec(text)) !== null) {
    const amount = parseFloat((match[6] ?? "").replace(/,/g, "")) || 0;
    if (amount === 0) continue;
    items.push({
      row_index: idx++,
      payee_name: (match[1] ?? "").trim(),
      payee_id: match[2] ?? "",
      bank: match[3] ?? "",
      branch: match[4] ?? "",
      account: match[5] ?? "",
      amount,
    });
  }

  // Fallback: extract lines with amounts only if pattern didn't work
  if (items.length === 0) {
    const amountLines = lines.filter((l) => /[\d,]+\.\d{2}/.test(l) && /[א-ת]/.test(l));
    amountLines.forEach((line, i) => {
      const amtMatch = line.match(/([\d,]+\.\d{2})/);
      const idMatch = line.match(/\b(\d{9})\b/);
      if (amtMatch) {
        const hebrewName = line.replace(/[\d,./₪\s]+/g, "").trim();
        items.push({
          row_index: i,
          payee_name: hebrewName,
          payee_id: idMatch?.[1] ?? "",
          bank: "",
          branch: "",
          account: "",
          amount: parseFloat((amtMatch[1] ?? "").replace(/,/g, "")) || 0,
        });
      }
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
  // PDF.js is loaded dynamically to avoid bundling issues
  try {
    const buffer = await file.arrayBuffer();

    // Try pdfjs-dist if available in window
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

    if (text.includes("מוטב") || text.includes("אסמכתא")) {
      const result = extractFromText(text);
      return { ...result, errors };
    }
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
