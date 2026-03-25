"use client";

import { useState, useRef, useCallback } from "react";
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { parseLeumiCSV, parseHapoalimXLSX, parseMizrahiXLS } from "../lib/parsers";
import type { BankParseResult, SourceBank } from "../types";

async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface DuplicateInfo {
  file_name: string;
  uploaded_at: string;
  row_count: number | null;
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "pick" | "preview" | "uploading" | "done";

const BANK_LABELS: Record<SourceBank, string> = {
  leumi: "בנק לאומי",
  hapoalim: "בנק הפועלים",
  mizrahi: "בנק מזרחי",
};

function detectBank(file: File): SourceBank | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return "leumi";
  if (name.includes("excelnew") || name.includes("hapoalim")) return "hapoalim";
  if (name.includes("accountactivity") || name.includes("mizrahi")) return "mizrahi";
  // .xlsx → hapoalim, .xls → mizrahi (fallback by extension)
  if (name.endsWith(".xlsx")) return "hapoalim";
  if (name.endsWith(".xls")) return "mizrahi";
  return null;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function UploadBankFileModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [bank, setBank] = useState<SourceBank | "">("");
  const [parseResult, setParseResult] = useState<BankParseResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    inserted: number; skipped: number; errors: string[];
  } | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [classifyResult, setClassifyResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // ── File selection ──────────────────────────────────────────────────────────
  const parseForBank = useCallback(async (f: File, selectedBank: SourceBank): Promise<BankParseResult> => {
    if (selectedBank === "leumi") return parseLeumiCSV(f);
    if (selectedBank === "mizrahi") return parseMizrahiXLS(f);
    return parseHapoalimXLSX(f);
  }, []);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setParseError(null);
    setParseResult(null);
    setDuplicateInfo(null);
    setShowDuplicateWarning(false);

    const detected = detectBank(f);
    const selectedBank = detected ?? "hapoalim";
    setBank(selectedBank);
    setParsing(true);

    try {
      // Hash computation and file parsing run in true parallel
      const [hash, result] = await Promise.all([
        computeFileHash(f),
        parseForBank(f, selectedBank),
      ]);

      setFileHash(hash);
      setParseResult(result);
      if (result.transactions.length === 0) {
        setParseError("לא נמצאו תנועות בקובץ. ודא שהקובץ תקין ושהבנק הנכון נבחר.");
      }

      // Check for duplicate (after hash is ready)
      try {
        const res = await fetch(`/api/finance/check-file-hash?hash=${hash}`);
        const data = await res.json();
        if (data.duplicate) setDuplicateInfo(data);
      } catch {
        // non-critical — proceed silently
      }

      setStep("preview");
    } catch (e) {
      setParseError(String(e));
      setStep("preview");
    } finally {
      setParsing(false);
    }
  }, [parseForBank]);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  // Re-parse when bank changes manually
  const handleBankChange = useCallback(async (newBank: SourceBank) => {
    setBank(newBank);
    if (!file) return;
    setParsing(true);
    setParseError(null);
    try {
      const result = await parseForBank(file, newBank);
      setParseResult(result);
      if (result.transactions.length === 0) {
        setParseError("לא נמצאו תנועות. ודא שהבנק הנכון נבחר.");
      }
    } catch (e) {
      setParseError(String(e));
    } finally {
      setParsing(false);
    }
  }, [file, parseForBank]);

  // ── Upload (with optional duplicate bypass) ─────────────────────────────────
  const doUpload = useCallback(async () => {
    if (!parseResult || !file || !bank) return;
    setShowDuplicateWarning(false);
    setStep("uploading");

    try {
      const res = await fetch("/api/finance/upload-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank,
          account_number: parseResult.account_number || "לא ידוע",
          file_name: file.name,
          file_hash: fileHash ?? undefined,
          date_from: parseResult.date_from,
          date_to: parseResult.date_to,
          transactions: parseResult.transactions,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setParseError(data.error ?? "שגיאה בהעלאה");
        setStep("preview");
        return;
      }

      setUploadResult({
        inserted: data.inserted,
        skipped: data.skipped,
        errors: data.errors ?? [],
      });
      setStep("done");

      // Auto-classify after successful upload
      try {
        const cr = await fetch("/api/finance/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "auto" }),
        });
        const cd = await cr.json();
        if (cd.classified > 0) {
          setClassifyResult(`סווגו אוטומטית ${cd.classified} תנועות`);
        }
      } catch {
        // non-critical
      }
    } catch (e) {
      setParseError(String(e));
      setStep("preview");
    }
  }, [parseResult, file, bank, fileHash]);

  const handleUpload = useCallback(() => {
    if (duplicateInfo) {
      setShowDuplicateWarning(true);
    } else {
      doUpload();
    }
  }, [duplicateInfo, doUpload]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

      {/* Duplicate confirmation dialog */}
      {showDuplicateWarning && duplicateInfo && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-2xl">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm mx-4 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
            <h3 className="font-bold text-gray-900 text-lg">קובץ כפול</h3>
            <p className="text-sm text-gray-600">
              קובץ זהה הועלה בעבר ב-
              {new Date(duplicateInfo.uploaded_at).toLocaleDateString("he-IL")}
              {duplicateInfo.row_count ? ` (${duplicateInfo.row_count} תנועות)` : ""}.
              <br />האם להמשיך ולהעלות שוב?
            </p>
            <p className="text-xs text-gray-400">כפילויות ידולגו אוטומטית</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowDuplicateWarning(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                ביטול
              </button>
              <button
                onClick={doUpload}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
              >
                המשך בכל זאת
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-gray-900">העלאת קובץ תנועות בנק</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Step: pick */}
          {(step === "pick" || (step === "preview" && !file)) && (
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                dragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-700">גרור קובץ לכאן או לחץ לבחירה</p>
              <p className="text-sm text-gray-400 mt-1">CSV, XLSX, XLS</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={onFileInput}
              />
            </div>
          )}

          {/* Parsing spinner */}
          {parsing && (
            <div className="flex items-center justify-center gap-2 py-6 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>מפרסר קובץ...</span>
            </div>
          )}

          {/* Step: preview */}
          {step === "preview" && !parsing && file && (
            <>
              {/* File name */}
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                <FileSpreadsheet className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="truncate font-medium">{file.name}</span>
                <button
                  className="mr-auto text-gray-400 hover:text-gray-600"
                  onClick={() => { setFile(null); setStep("pick"); setParseResult(null); setParseError(null); }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Bank selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">בנק</label>
                <select
                  value={bank}
                  onChange={(e) => handleBankChange(e.target.value as SourceBank)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {(Object.keys(BANK_LABELS) as SourceBank[]).map((b) => (
                    <option key={b} value={b}>{BANK_LABELS[b]}</option>
                  ))}
                </select>
              </div>

              {/* Duplicate file warning */}
              {duplicateInfo && !showDuplicateWarning && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                  <span>
                    קובץ זהה כבר הועלה ב-
                    {new Date(duplicateInfo.uploaded_at).toLocaleDateString("he-IL")}
                    {duplicateInfo.row_count ? ` (${duplicateInfo.row_count} תנועות)` : ""}
                    . לחיצה על &quot;העלה&quot; תציג אפשרות להמשיך.
                  </span>
                </div>
              )}

              {/* Parse error */}
              {parseError && (
                <div className="flex items-start gap-2 bg-red-50 text-red-700 rounded-lg p-3 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Parse result summary */}
              {parseResult && parseResult.transactions.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                  <p className="font-semibold text-blue-800">תוצאת פרסור</p>
                  <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
                    <div>
                      <span className="text-blue-500">תנועות:</span>{" "}
                      <span className="font-bold">{parseResult.transactions.length.toLocaleString()}</span>
                    </div>
                    {parseResult.account_number && (
                      <div>
                        <span className="text-blue-500">חשבון:</span>{" "}
                        <span className="font-mono font-bold">{parseResult.account_number}</span>
                      </div>
                    )}
                    {parseResult.date_from && (
                      <div>
                        <span className="text-blue-500">מתאריך:</span>{" "}
                        <span className="font-bold">{formatDate(parseResult.date_from)}</span>
                      </div>
                    )}
                    {parseResult.date_to && (
                      <div>
                        <span className="text-blue-500">עד תאריך:</span>{" "}
                        <span className="font-bold">{formatDate(parseResult.date_to)}</span>
                      </div>
                    )}
                  </div>
                  {parseResult.errors.length > 0 && (
                    <p className="text-xs text-orange-600 mt-2">
                      {parseResult.errors.length} שורות נכשלו בפרסור
                    </p>
                  )}
                  {/* First 3 rows preview */}
                  <div className="mt-3 overflow-x-auto rounded-lg border border-blue-100">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-blue-100 text-blue-600">
                        <tr>
                          <th className="px-2 py-1">תאריך</th>
                          <th className="px-2 py-1">תיאור</th>
                          <th className="px-2 py-1">חובה</th>
                          <th className="px-2 py-1">זכות</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-50">
                        {parseResult.transactions.slice(0, 3).map((tx, i) => (
                          <tr key={i} className="bg-white">
                            <td className="px-2 py-1 text-gray-500">{formatDate(tx.date)}</td>
                            <td className="px-2 py-1 text-gray-700 max-w-[140px] truncate">{tx.description}</td>
                            <td className="px-2 py-1 text-red-600 font-mono">
                              {tx.debit > 0 ? tx.debit.toLocaleString("he-IL", { minimumFractionDigits: 2 }) : ""}
                            </td>
                            <td className="px-2 py-1 text-green-600 font-mono">
                              {tx.credit > 0 ? tx.credit.toLocaleString("he-IL", { minimumFractionDigits: 2 }) : ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step: uploading */}
          {step === "uploading" && (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-gray-600">מעלה תנועות...</p>
            </div>
          )}

          {/* Step: done */}
          {step === "done" && uploadResult && (
            <div className="text-center py-6 space-y-3">
              <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
              <p className="text-xl font-bold text-gray-800">הועלה בהצלחה!</p>
              <div className="flex justify-center gap-6 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{uploadResult.inserted.toLocaleString()}</p>
                  <p className="text-gray-500">תנועות חדשות</p>
                </div>
                {uploadResult.skipped > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-400">{uploadResult.skipped.toLocaleString()}</p>
                    <p className="text-gray-500">כפילויות (דולגו)</p>
                  </div>
                )}
              </div>
              {uploadResult.errors.length > 0 && (
                <p className="text-xs text-orange-500">{uploadResult.errors.length} שגיאות</p>
              )}
              {classifyResult && (
                <p className="text-sm text-purple-600 font-medium bg-purple-50 rounded-lg px-3 py-2">
                  ⚡ {classifyResult}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-2 justify-end">
          {step === "done" ? (
            <button
              onClick={() => { onSuccess(); onClose(); }}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              סגור וצפה בתנועות
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                ביטול
              </button>
              {step === "preview" && parseResult && parseResult.transactions.length > 0 && (
                <button
                  onClick={handleUpload}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  העלה {parseResult.transactions.length.toLocaleString()} תנועות
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
