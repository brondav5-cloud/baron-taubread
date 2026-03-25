"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X, FileSpreadsheet, Loader2, Trash2, Upload, AlertCircle, ChevronDown,
} from "lucide-react";
import { loadXlsx } from "@/lib/loadXlsx";
import type { BankTransaction, DocType } from "../types";
import {
  parseSalaryXLSX,
  parseCreditCardXLSX,
  parseLeumiCreditXLS,
  parseTransfersPDF,
} from "../lib/parsers";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LinkedDoc {
  id: string;
  match_method: string;
  document: {
    id: string;
    file_name: string;
    doc_type: DocType;
    doc_date: string | null;
    total_amount: number | null;
    reference: string | null;
    raw_data: Record<string, unknown> | null;
    uploaded_at: string;
  };
}

interface Props {
  transaction: BankTransaction;
  onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<DocType, string> = {
  salary_xlsx: "פירוט שכר (Excel)",
  credit_card_xlsx: "כרטיס אשראי (Excel)",
  transfers_pdf: "פרטי מוטבים (PDF)",
  leumi_credit_xls: "לאומי קארד (XLS)",
  other: "אחר",
};

function fmt(n: number): string {
  return "₪" + n.toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

async function parseDetailFile(
  file: File,
  docType: DocType
): Promise<{ rows: unknown[]; reference?: string; total?: number; doc_date?: string }> {
  try {
    if (docType === "salary_xlsx") {
      const r = await parseSalaryXLSX(file);
      return { rows: r.items, reference: r.reference, total: r.total_amount, doc_date: r.doc_date };
    }
    if (docType === "credit_card_xlsx") {
      const r = await parseCreditCardXLSX(file);
      return { rows: r.items, total: r.total_charge, doc_date: r.charge_date };
    }
    if (docType === "leumi_credit_xls") {
      const r = await parseLeumiCreditXLS(file);
      return { rows: r.items, total: r.total_charge, doc_date: r.charge_date };
    }
    if (docType === "transfers_pdf") {
      const r = await parseTransfersPDF(file);
      return { rows: r.items, reference: r.reference, total: r.total_amount, doc_date: r.doc_date };
    }
    // Fallback: generic XLSX parse
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      const XLSX = await loadXlsx();
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true });
      const sheetName = wb.SheetNames[0] ?? "";
      const sheet = wb.Sheets[sheetName] ?? {};
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      return { rows };
    }
    return { rows: [] };
  } catch {
    return { rows: [] };
  }
}

// ─── Linked doc row with expandable items ────────────────────────────────────

interface ItemRow { payee_name?: string; business_name?: string; amount?: number; charge_amount?: number; payee_id?: string; bank?: string; branch?: string; account?: string; category?: string; transaction_date?: string; }

function LinkedDocRow({ link, onDelete }: { link: LinkedDoc; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const rows = (link.document.raw_data as { rows?: ItemRow[] } | null)?.rows ?? [];

  return (
    <div className="bg-blue-50 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        <FileSpreadsheet className="w-4 h-4 text-blue-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-800 truncate">{link.document.file_name}</p>
          <p className="text-xs text-blue-500">
            {DOC_TYPE_LABELS[link.document.doc_type]}
            {link.document.total_amount != null && ` · ${fmt(link.document.total_amount)}`}
            {link.document.reference && ` · אסמכתא: ${link.document.reference}`}
          </p>
        </div>
        {rows.length > 0 && (
          <button onClick={() => setExpanded((v) => !v)}
            className="text-blue-500 hover:text-blue-700 text-xs font-medium shrink-0">
            {expanded ? "הסתר" : `${rows.length} שורות`}
          </button>
        )}
        <button onClick={() => onDelete(link.id)} className="text-blue-300 hover:text-red-500 transition-colors shrink-0" title="הסר">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {expanded && rows.length > 0 && (
        <div className="border-t border-blue-100 overflow-x-auto">
          <table className="w-full text-xs text-right" dir="rtl">
            <thead className="bg-blue-100 text-blue-600">
              <tr>
                <th className="px-2 py-1">שם</th>
                {rows[0]?.payee_id !== undefined && <th className="px-2 py-1">ת.ז</th>}
                {rows[0]?.category !== undefined && <th className="px-2 py-1">קטגוריה</th>}
                {rows[0]?.transaction_date !== undefined && <th className="px-2 py-1">תאריך</th>}
                <th className="px-2 py-1 text-left">סכום</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50">
              {rows.slice(0, 20).map((row, i) => (
                <tr key={i} className="bg-white">
                  <td className="px-2 py-1 font-medium text-gray-700 max-w-[120px] truncate">
                    {row.payee_name ?? row.business_name ?? ""}
                  </td>
                  {row.payee_id !== undefined && <td className="px-2 py-1 text-gray-400 font-mono">{row.payee_id}</td>}
                  {row.category !== undefined && <td className="px-2 py-1 text-gray-500">{row.category}</td>}
                  {row.transaction_date !== undefined && <td className="px-2 py-1 text-gray-400">{row.transaction_date ? formatDate(row.transaction_date) : ""}</td>}
                  <td className="px-2 py-1 text-left font-mono text-gray-700">
                    {fmt(row.charge_amount ?? row.amount ?? 0)}
                  </td>
                </tr>
              ))}
              {rows.length > 20 && (
                <tr><td colSpan={5} className="px-2 py-1 text-center text-gray-400">ועוד {rows.length - 20} שורות...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TransactionDetailModal({ transaction: tx, onClose }: Props) {
  const [linkedDocs, setLinkedDocs] = useState<LinkedDoc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocType>("other");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load linked docs ──────────────────────────────────────────────────────
  const loadDocs = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase
        .from("transaction_document_links")
        .select(`id, match_method, document:transaction_detail_documents(id, file_name, doc_type, doc_date, total_amount, reference, raw_data, uploaded_at)`)
        .eq("transaction_id", tx.id)
        .order("created_at", { ascending: false });
      setLinkedDocs((data as unknown as LinkedDoc[]) ?? []);
    } finally {
      setLoadingDocs(false);
    }
  }, [tx.id]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  // Auto-detect doc type from file name
  const onFileChosen = useCallback((file: File) => {
    setUploadFile(file);
    setUploadError(null);
    const name = file.name.toLowerCase();
    if (name.includes("salari") || name.includes("shcr") || name.includes("salary") || name.includes("collection")) {
      setDocType("salary_xlsx");
    } else if (name.includes("transaction") || name.includes("credit") || name.includes("discount")) {
      setDocType("credit_card_xlsx");
    } else if (name.includes("motav") || name.includes("pdf") || name.endsWith(".pdf")) {
      setDocType("transfers_pdf");
    } else if (name.includes("leumi") && (name.endsWith(".xls") || name.includes("card"))) {
      setDocType("leumi_credit_xls");
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      setDocType("salary_xlsx");
    }
  }, []);

  // ── Submit upload ─────────────────────────────────────────────────────────
  const handleUpload = useCallback(async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadError(null);

    try {
      const parsed = await parseDetailFile(uploadFile, docType);

      const res = await fetch("/api/finance/link-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: tx.id,
          doc_type: docType,
          file_name: uploadFile.name,
          doc_date: parsed.doc_date || tx.date,
          total_amount: parsed.total || (tx.debit > 0 ? tx.debit : tx.credit),
          reference: parsed.reference || tx.reference || undefined,
          match_method: "manual",
          raw_data: parsed.rows.length > 0 ? { rows: parsed.rows } : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "שגיאה בהעלאה");
      } else {
        setUploadFile(null);
        setShowUpload(false);
        await loadDocs();
      }
    } catch (e) {
      setUploadError(String(e));
    } finally {
      setUploading(false);
    }
  }, [uploadFile, docType, tx, loadDocs]);

  // ── Delete link ───────────────────────────────────────────────────────────
  const handleDeleteLink = useCallback(async (linkId: string) => {
    if (!confirm("להסיר את הקישור למסמך זה?")) return;
    await fetch("/api/finance/link-document", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ link_id: linkId }),
    });
    await loadDocs();
  }, [loadDocs]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b gap-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-400 mb-0.5">{formatDate(tx.date)}</p>
            <h2 className="font-bold text-gray-900 leading-tight">{tx.description}</h2>
            {tx.details && <p className="text-sm text-gray-500 mt-0.5 truncate">{tx.details}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Transaction details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {tx.debit > 0 && (
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-xs text-red-400 mb-0.5">חובה</p>
                <p className="font-bold text-red-700 text-lg">{fmt(tx.debit)}</p>
              </div>
            )}
            {tx.credit > 0 && (
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-xs text-green-400 mb-0.5">זכות</p>
                <p className="font-bold text-green-700 text-lg">{fmt(tx.credit)}</p>
              </div>
            )}
            {tx.balance != null && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-0.5">יתרה</p>
                <p className={`font-semibold ${tx.balance < 0 ? "text-red-600" : "text-gray-700"}`}>
                  {fmt(tx.balance)}
                </p>
              </div>
            )}
            {tx.reference && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-0.5">אסמכתא</p>
                <p className="font-mono font-semibold text-gray-700">{tx.reference}</p>
              </div>
            )}
            {tx.operation_code && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-0.5">קוד פעולה</p>
                <p className="font-mono text-gray-700">{tx.operation_code}</p>
              </div>
            )}
          </div>

          {/* Linked documents */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800 text-sm">מסמכי פירוט</h3>
              <button
                onClick={() => { setShowUpload((v) => !v); setUploadFile(null); setUploadError(null); }}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <Upload className="w-3.5 h-3.5" />
                {showUpload ? "ביטול" : "הוסף מסמך"}
                {!showUpload && <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {loadingDocs ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>טוען...</span>
              </div>
            ) : linkedDocs.length === 0 && !showUpload ? (
              <p className="text-sm text-gray-400 italic py-1">אין מסמכי פירוט מקושרים</p>
            ) : (
              <div className="space-y-2">
                {linkedDocs.map((link) => (
                  <LinkedDocRow
                    key={link.id}
                    link={link}
                    onDelete={handleDeleteLink}
                  />
                ))}
              </div>
            )}

            {/* Upload section */}
            {showUpload && (
              <div className="mt-3 space-y-3 border border-dashed border-blue-200 rounded-xl p-4 bg-blue-50/50">
                {/* File drop */}
                {!uploadFile ? (
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${dragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) onFileChosen(f); }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileSpreadsheet className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">גרור קובץ או לחץ לבחירה</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, XLSX, XLS</p>
                    <input ref={fileInputRef} type="file" accept=".pdf,.xlsx,.xls,.csv" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileChosen(f); }} />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 text-sm">
                    <FileSpreadsheet className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="flex-1 truncate font-medium text-gray-700">{uploadFile.name}</span>
                    <button onClick={() => setUploadFile(null)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Doc type */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">סוג מסמך</label>
                  <select value={docType} onChange={(e) => setDocType(e.target.value as DocType)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                    {(Object.entries(DOC_TYPE_LABELS) as [DocType, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                {uploadError && (
                  <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 rounded-lg p-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {uploadError}
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!uploadFile || uploading}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? "מעלה..." : "שמור וקשר"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t">
          <button onClick={onClose}
            className="w-full py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
