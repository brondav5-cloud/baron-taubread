import { loadXlsx } from "../../../../lib/loadXlsx";

export interface LeumiSignatureStatusEntry {
  execution_date: string;
  instruction_type: string;
  instruction_number: string;
  beneficiary_name: string;
  amount: number;
  is_list: boolean;
  list_count: number | null;
}

export interface LeumiSignatureStatusParseResult {
  entries: LeumiSignatureStatusEntry[];
}

function toIsoDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "number" && value > 1000) {
    const utcMs = (value - 25569) * 86400 * 1000;
    const dt = new Date(utcMs);
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const d = String(dt.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(value ?? "").trim();
  const m = s.match(/(\d{2})[./-](\d{2})[./-](\d{2,4})/);
  if (!m) return "";
  const yyyy = m[3]!.length === 2 ? `20${m[3]}` : m[3]!;
  return `${yyyy}-${m[2]}-${m[1]}`;
}

function asNumber(v: unknown): number {
  if (typeof v === "number") return Math.abs(v);
  const n = parseFloat(String(v ?? "").replace(/,/g, "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

export async function parseLeumiSignaturesStatusXLSX(
  file: File
): Promise<LeumiSignatureStatusParseResult | null> {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) return null;

  const XLSX = await loadXlsx();
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true });
  const wsName = wb.SheetNames[0];
  if (!wsName) return null;
  const ws = wb.Sheets[wsName];
  if (!ws) return null;
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });

  let headerIdx = -1;
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const line = (rows[i] ?? []).map((x) => String(x).trim());
    if (line.some((c) => c.includes("מספר הוראה")) && line.some((c) => c.includes("שם חשבון לזיכוי"))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return null;

  const headers = (rows[headerIdx] ?? []).map((c) => String(c).trim());
  const col = {
    date: headers.findIndex((h) => h.includes("תאריך ביצוע")),
    type: headers.findIndex((h) => h.includes("הוראה") && !h.includes("מספר")),
    instructionNo: headers.findIndex((h) => h.includes("מספר הוראה")),
    beneficiary: headers.findIndex((h) => h.includes("שם חשבון לזיכוי")),
    amount: headers.findIndex((h) => h.includes("סכום")),
  };
  if (col.date < 0 || col.instructionNo < 0 || col.beneficiary < 0 || col.amount < 0) return null;

  const entries: LeumiSignatureStatusEntry[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const beneficiary = String(row[col.beneficiary] ?? "").trim();
    const amount = asNumber(row[col.amount]);
    if (!beneficiary || amount <= 0) continue;

    const listMatch = beneficiary.match(/רשימה\s*\((\d+)\)/);
    entries.push({
      execution_date: toIsoDate(row[col.date]),
      instruction_type: col.type >= 0 ? String(row[col.type] ?? "").trim() : "",
      instruction_number: String(row[col.instructionNo] ?? "").trim(),
      beneficiary_name: beneficiary,
      amount,
      is_list: Boolean(listMatch),
      list_count: listMatch ? Number(listMatch[1]) : null,
    });
  }

  return entries.length > 0 ? { entries } : null;
}

