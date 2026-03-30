"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { DocType } from "../types";
import {
  parseCreditCardXLSX,
  parseLeumiSignaturesStatusXLSX,
  parseLeumiCreditXLS,
  parseSalaryXLSX,
  parseTransfersPDF,
} from "../lib/parsers";

type ProcessStatus = "pending" | "processing" | "matched" | "needs_review" | "no_match" | "error";

interface FileResult {
  fileName: string;
  status: ProcessStatus;
  docType: DocType;
  amount?: number;
  docDate?: string;
  reference?: string;
  matchedTxId?: string;
  matchedTxInfo?: string;
  message?: string;
}

interface Props {
  companyId: string;
  onClose: () => void;
  onDone: () => void;
}

interface ParsedDetail {
  docType: DocType;
  rows: unknown[];
  doc_date?: string;
  reference?: string;
  total?: number;
}

interface MatchCandidate {
  id: string;
  date: string;
  description: string;
  reference: string;
  debit: number;
}

interface ListHint {
  amount: number;
  executionDate: string;
  instructionNumber: string;
}

function toISODate(dateLike: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateLike)) return dateLike;
  const m = dateLike.match(/(\d{2})[./](\d{2})[./](\d{2,4})/);
  if (!m) return "";
  const year = m[3]!.length === 2 ? `20${m[3]}` : m[3]!;
  return `${year}-${m[2]}-${m[1]}`;
}

function shiftDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function detectDocType(file: File): DocType {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || name.includes("motav")) return "transfers_pdf";
  if (name.includes("salary") || name.includes("salari") || name.includes("collection")) return "salary_xlsx";
  if (name.includes("credit") || /\b\d{4}\b/.test(name)) return "credit_card_xlsx";
  if (name.includes("leumi") && name.endsWith(".xls")) return "leumi_credit_xls";
  if (name.endsWith(".xlsx")) return "salary_xlsx";
  if (name.endsWith(".xls")) return "leumi_credit_xls";
  return "other";
}

async function parseDetailFile(file: File): Promise<ParsedDetail> {
  const docType = detectDocType(file);
  if (docType === "salary_xlsx") {
    const r = await parseSalaryXLSX(file);
    return { docType, rows: r.items, reference: r.reference, total: r.total_amount, doc_date: r.doc_date };
  }
  if (docType === "credit_card_xlsx") {
    const r = await parseCreditCardXLSX(file);
    return { docType, rows: r.items, total: r.total_charge, doc_date: r.charge_date };
  }
  if (docType === "leumi_credit_xls") {
    const r = await parseLeumiCreditXLS(file);
    return { docType, rows: r.items, total: r.total_charge, doc_date: r.charge_date };
  }
  if (docType === "transfers_pdf") {
    const r = await parseTransfersPDF(file);
    return { docType, rows: r.items, reference: r.reference, total: r.total_amount, doc_date: r.doc_date };
  }
  return { docType: "other", rows: [] };
}

function scoreCandidate(c: MatchCandidate, amount: number, docDate?: string, reference?: string): number {
  const amountDiff = Math.abs(c.debit - amount);
  if (amountDiff > 1) return 0;
  let score = amountDiff <= 0.01 ? 0.75 : 0.45;

  const ref = (reference ?? "").trim();
  if (ref && c.reference && c.reference.includes(ref)) score += 0.2;

  if (docDate) {
    const days = Math.abs(
      (new Date(c.date).getTime() - new Date(docDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days <= 0.01) score += 0.05;
    else if (days <= 1) score += 0.03;
  }

  return Math.min(1, score);
}

function statusLabel(status: ProcessStatus): string {
  if (status === "matched") return "מותאם אוטומטית";
  if (status === "needs_review") return "דורש בדיקה";
  if (status === "no_match") return "לא נמצאה התאמה";
  if (status === "error") return "שגיאה";
  if (status === "processing") return "בעיבוד";
  return "ממתין";
}

export function BulkDetailUploadModal({ companyId, onClose, onDone }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<FileResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState(false);

  const matchedCount = useMemo(() => results.filter((r) => r.status === "matched").length, [results]);
  const reviewCount = useMemo(() => results.filter((r) => r.status === "needs_review").length, [results]);

  const onPickFiles = (picked: FileList | null) => {
    if (!picked || picked.length === 0) return;
    const arr = Array.from(picked).filter((f) => {
      const n = f.name.toLowerCase();
      return n.endsWith(".pdf") || n.endsWith(".xlsx") || n.endsWith(".xls");
    });
    setFiles(arr);
    setResults(arr.map((f) => ({ fileName: f.name, status: "pending", docType: detectDocType(f) })));
  };

  const updateResult = (fileName: string, patch: Partial<FileResult>) => {
    setResults((prev) => prev.map((r) => (r.fileName === fileName ? { ...r, ...patch } : r)));
  };

  const processMasterStatusFile = async (
    file: File,
    reservedTxIds: Set<string>,
    listHints: ListHint[]
  ): Promise<boolean> => {
    const master = await parseLeumiSignaturesStatusXLSX(file);
    if (!master) return false;
    const supabase = createClient();
    const direct = master.entries.filter((e) => !e.is_list);
    const listed = master.entries.filter((e) => e.is_list);
    listed.forEach((e) => listHints.push({ amount: e.amount, executionDate: e.execution_date, instructionNumber: e.instruction_number }));
    const validDates = direct.map((e) => e.execution_date).filter(Boolean).sort();
    const from = validDates.length > 0 ? shiftDays(validDates[0]!, -3) : shiftDays(new Date().toISOString().slice(0, 10), -120);
    const to = validDates.length > 0 ? shiftDays(validDates[validDates.length - 1]!, 3) : new Date().toISOString().slice(0, 10);
    const { data: txs } = await supabase.from("bank_transactions").select("id,date,description,reference,debit").eq("company_id", companyId).gte("date", from).lte("date", to).gt("debit", 0).is("merged_into_id", null).order("date", { ascending: false }).limit(1000);
    let matched = 0;
    let review = 0;
    for (const e of direct) {
      const candidates = ((txs ?? []) as MatchCandidate[]).filter((t) => !reservedTxIds.has(t.id)).map((t) => ({ tx: t, score: scoreCandidate(t, e.amount, e.execution_date || undefined, e.instruction_number || undefined) })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
      const best = candidates[0];
      const second = candidates[1];
      if (!best || best.score < 0.99 || (second && best.score - second.score < 0.05)) { review++; continue; }
      const linkRes = await fetch("/api/finance/link-document", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transaction_id: best.tx.id, doc_type: "other", file_name: file.name, doc_date: e.execution_date || best.tx.date, total_amount: e.amount, reference: e.instruction_number || best.tx.reference || undefined, match_method: "auto_date_amount", raw_data: { rows: [e] } }) });
      if (!linkRes.ok) { review++; continue; }
      reservedTxIds.add(best.tx.id);
      matched++;
    }
    updateResult(file.name, { status: review === 0 && listed.length === 0 ? "matched" : "needs_review", docType: "other", amount: master.entries.reduce((s, e) => s + e.amount, 0), message: `אקסל ראשי: ${matched} הותאמו, ${review} לבדיקה, ${listed.length} שורות 'רשימה' דורשות PDF.` });
    return true;
  };

  const run = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    const supabase = createClient();
    const reservedTxIds = new Set<string>();
    const listHints: ListHint[] = [];

    try {
      for (const file of files) {
        updateResult(file.name, { status: "processing", message: "" });
        try {
          const wasMaster = await processMasterStatusFile(file, reservedTxIds, listHints);
          if (wasMaster) continue;

          const parsed = await parseDetailFile(file);
          const amount = Math.abs(Number(parsed.total ?? 0));
          const docDate = toISODate(parsed.doc_date ?? "");
          const reference = (parsed.reference ?? "").trim();

          if (!amount || parsed.rows.length === 0) {
            updateResult(file.name, {
              status: "error",
              docType: parsed.docType,
              message: "לא הצלחנו לחלץ סכום/שורות מהקובץ",
            });
            continue;
          }

          const from = docDate ? shiftDays(docDate, -3) : shiftDays(new Date().toISOString().slice(0, 10), -120);
          const to = docDate ? shiftDays(docDate, 3) : new Date().toISOString().slice(0, 10);

          const { data: txs } = await supabase
            .from("bank_transactions")
            .select("id,date,description,reference,debit")
            .eq("company_id", companyId)
            .gte("date", from)
            .lte("date", to)
            .gt("debit", 0)
            .is("merged_into_id", null)
            .order("date", { ascending: false })
            .limit(200);

          const hint = listHints.find((h) => Math.abs(h.amount - amount) <= 0.01);
          const candidates = ((txs ?? []) as MatchCandidate[])
            .filter((t) => !reservedTxIds.has(t.id))
            .map((t) => ({ tx: t, score: Math.min(1, scoreCandidate(t, amount, docDate || undefined, reference || undefined) + (hint ? 0.05 : 0)) }))
            .filter((x) => x.score > 0)
            .sort((a, b) => b.score - a.score);

          if (candidates.length === 0) {
            updateResult(file.name, {
              status: "no_match",
              docType: parsed.docType,
              amount,
              docDate,
              reference,
              message: "לא נמצאה תנועה מתאימה לפי תאריך/סכום",
            });
            continue;
          }

          const best = candidates[0]!;
          const second = candidates[1];
          const canAutoMatch = best.score >= 0.99 && (!second || best.score - second.score >= 0.05);

          if (!canAutoMatch) {
            updateResult(file.name, {
              status: "needs_review",
              docType: parsed.docType,
              amount,
              docDate,
              reference,
              matchedTxId: best.tx.id,
              matchedTxInfo: `${best.tx.date} · ${best.tx.description} · ₪${best.tx.debit.toLocaleString("he-IL")}`,
              message: "נמצאה התאמה חלקית בלבד — נדרש אישור ידני",
            });
            continue;
          }

          const linkRes = await fetch("/api/finance/link-document", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transaction_id: best.tx.id,
              doc_type: parsed.docType,
              file_name: file.name,
              doc_date: docDate || best.tx.date,
              total_amount: amount,
              reference: reference || best.tx.reference || undefined,
              match_method: "auto_date_amount",
              raw_data: parsed.rows.length > 0 ? { rows: parsed.rows } : null,
            }),
          });

          if (!linkRes.ok) {
            updateResult(file.name, {
              status: "error",
              docType: parsed.docType,
              amount,
              docDate,
              reference,
              message: "נכשלה שמירת הקישור למסמך",
            });
            continue;
          }

          reservedTxIds.add(best.tx.id);
          updateResult(file.name, {
            status: "matched",
            docType: parsed.docType,
            amount,
            docDate,
            reference,
            matchedTxId: best.tx.id,
            matchedTxInfo: `${best.tx.date} · ${best.tx.description} · ₪${best.tx.debit.toLocaleString("he-IL")}`,
          });
        } catch (e) {
          updateResult(file.name, { status: "error", message: String(e) });
        }
      }
    } finally {
      setProcessing(false);
      onDone();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-gray-900">ייבוא מסמכי פירוט מרוכז</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              onPickFiles(e.dataTransfer.files);
            }}
          >
            <FileSpreadsheet className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="font-medium text-gray-700">גרור לכאן כמה קבצים יחד</p>
            <p className="text-sm text-gray-400 mt-1">PDF, XLSX, XLS</p>
            <label className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 text-sm border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <Upload className="w-4 h-4" />
              בחר קבצים
              <input
                type="file"
                accept=".pdf,.xlsx,.xls"
                multiple
                className="hidden"
                onChange={(e) => onPickFiles(e.target.files)}
              />
            </label>
          </div>

          {results.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                תוצאות: {matchedCount} מותאמים אוטומטית · {reviewCount} דורשים בדיקה
              </div>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-right">קובץ</th>
                      <th className="px-3 py-2 text-right">סכום</th>
                      <th className="px-3 py-2 text-right">סטטוס</th>
                      <th className="px-3 py-2 text-right">התאמה</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {results.map((r) => (
                      <tr key={r.fileName}>
                        <td className="px-3 py-2 text-gray-700">{r.fileName}</td>
                        <td className="px-3 py-2 text-gray-600">
                          {typeof r.amount === "number" ? `₪${r.amount.toLocaleString("he-IL", { minimumFractionDigits: 2 })}` : "-"}
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1">
                            {r.status === "matched" ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : null}
                            {r.status === "error" ? <AlertCircle className="w-3.5 h-3.5 text-red-500" /> : null}
                            {r.status === "processing" ? <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" /> : null}
                            <span className="text-gray-700">{statusLabel(r.status)}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-500">{r.matchedTxInfo ?? r.message ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex items-center justify-between">
          <p className="text-xs text-gray-500">התאמה אוטומטית מתבצעת רק בזיהוי ודאי; כל השאר נשאר לבדיקה ידנית.</p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              סגור
            </button>
            <button
              onClick={run}
              disabled={processing || files.length === 0}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {processing ? "מעבד..." : `התחל (${files.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

