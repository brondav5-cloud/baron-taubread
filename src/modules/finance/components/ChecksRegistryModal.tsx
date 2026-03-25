"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Receipt,
} from "lucide-react";
import { loadXlsx } from "@/lib/loadXlsx";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedCheck {
  check_number: string;
  supplier_name: string;
  amount: number;
  check_date: string | null;
  is_cancelled: boolean;
}

interface ParseResult {
  checks: ParsedCheck[];
  errors: string[];
}

type Step = "pick" | "preview" | "uploading" | "done";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function excelSerialToIso(serial: number): string {
  const utcMs = (serial - 25569) * 86400 * 1000;
  const d = new Date(utcMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseCheckDate(val: unknown): string | null {
  if (typeof val === "number" && val > 40000) return excelSerialToIso(val);
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof val === "string" && val.includes("/")) {
    const parts = val.split("/");
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts as [string, string, string];
      return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
  }
  return null;
}

function fmt(n: number) {
  return n.toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Parser ───────────────────────────────────────────────────────────────────

async function parseChecksFile(file: File): Promise<ParseResult> {
  const XLSX = await loadXlsx();
  const errors: string[] = [];
  const checks: ParsedCheck[] = [];

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true });
  const sheetName = wb.SheetNames[0] ?? "";
  const sheet = wb.Sheets[sheetName] ?? {};
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  // Find header row — look for מס שיק or שם לקוח
  let headerIdx = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const cells = (rows[i] ?? []).map((c) => String(c));
    if (cells.some((c) => c.includes("מס שיק") || c.includes("שם לקוח"))) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    return {
      checks: [],
      errors: ['לא נמצאה שורת כותרת — ודא שיש עמודות "מס שיק" ו-"שם לקוח"'],
    };
  }

  const headers = (rows[headerIdx] ?? []).map((c) => String(c).trim());

  const col = {
    supplier: headers.findIndex((h) => h.includes("שם לקוח") || h.includes("לקוח")),
    checkNum: headers.findIndex((h) => h.includes("מס שיק") || h.includes("מספר שיק")),
    amount:   headers.findIndex((h) => h === "סכום" || h.includes("סכום")),
    date:     headers.findIndex((h) => h.includes("תאריך שיק")),
    cancelled:headers.findIndex((h) => h.includes("מבוטל")),
  };

  if (col.supplier === -1 || col.checkNum === -1 || col.amount === -1) {
    return {
      checks: [],
      errors: ['עמודות חובה חסרות: "שם לקוח", "מס שיק", "סכום"'],
    };
  }

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const supplierRaw = String(row[col.supplier] ?? "").trim();
    const checkNumRaw = row[col.checkNum];
    const amountRaw   = row[col.amount];

    if (!supplierRaw || !checkNumRaw) continue;

    const amount = typeof amountRaw === "number" ? amountRaw
      : parseFloat(String(amountRaw).replace(/,/g, "")) || 0;

    if (amount <= 0) continue;

    try {
      checks.push({
        check_number: String(checkNumRaw).trim(),
        supplier_name: supplierRaw,
        amount,
        check_date: col.date >= 0 ? parseCheckDate(row[col.date]) : null,
        is_cancelled: col.cancelled >= 0
          ? String(row[col.cancelled] ?? "").trim() !== ""
          : false,
      });
    } catch (e) {
      errors.push(`שורה ${i + 1}: ${String(e)}`);
    }
  }

  return { checks, errors };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function ChecksRegistryModal({ onClose, onSuccess }: Props) {
  const [step, setStep]           = useState<Step>("pick");
  const [file, setFile]           = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [parsing, setParsing]     = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragging, setDragging]   = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    inserted: number; skipped: number; matched: number;
  } | null>(null);
  const [registryCount, setRegistryCount] = useState<number | null>(null);
  const [matching, setMatching]   = useState(false);
  const [matchResult, setMatchResult] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current registry count on mount
  useEffect(() => {
    fetch("/api/finance/checks-registry/match")
      .then((r) => r.json())
      .then((d) => { if (typeof d.count === "number") setRegistryCount(d.count); })
      .catch(() => {});
  }, []);

  // ── File handling ──────────────────────────────────────────────────────────
  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setParseError(null);
    setParseResult(null);
    setParsing(true);

    try {
      const result = await parseChecksFile(f);
      setParseResult(result);
      if (result.checks.length === 0) {
        setParseError("לא נמצאו שיקים בקובץ. ודא שהפורמט תקין.");
      }
    } catch (e) {
      setParseError(String(e));
    } finally {
      setParsing(false);
      setStep("preview");
    }
  }, []);

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

  // ── Upload ─────────────────────────────────────────────────────────────────
  const doUpload = useCallback(async () => {
    if (!parseResult || !file) return;
    setStep("uploading");

    try {
      const res = await fetch("/api/finance/checks-registry/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checks: parseResult.checks,
          source_file: file.name,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setParseError(data.error ?? "שגיאה בהעלאה");
        setStep("preview");
        return;
      }

      setUploadResult({ inserted: data.inserted, skipped: data.skipped, matched: data.matched });
      setRegistryCount((c) => (c ?? 0) + data.inserted);
      setStep("done");
    } catch (e) {
      setParseError(String(e));
      setStep("preview");
    }
  }, [parseResult, file]);

  // ── Re-run matching ────────────────────────────────────────────────────────
  const doMatch = useCallback(async () => {
    setMatching(true);
    setMatchResult(null);
    try {
      const res = await fetch("/api/finance/checks-registry/match", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) setMatchResult(data.matched ?? 0);
    } catch {
      // silent
    } finally {
      setMatching(false);
    }
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">מאגר שיקים</h2>
            {registryCount !== null && (
              <p className="text-xs text-gray-400 mt-0.5">
                {registryCount.toLocaleString()} שיקים במאגר
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── Pick step ── */}
          {(step === "pick" || (step === "preview" && !file)) && (
            <>
              {/* Re-run match button (when registry has data) */}
              {registryCount !== null && registryCount > 0 && (
                <div className="bg-teal-50 rounded-xl p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-teal-800">הפעל התאמה</p>
                    <p className="text-xs text-teal-600">
                      סרוק תנועות בנק קיימות ועדכן שמות ספקים
                    </p>
                    {matchResult !== null && (
                      <p className="text-xs font-medium text-teal-700 mt-1">
                        הותאמו {matchResult} תנועות
                      </p>
                    )}
                  </div>
                  <button
                    onClick={doMatch}
                    disabled={matching}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-60 transition-colors shrink-0"
                  >
                    {matching
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <RefreshCw className="w-3.5 h-3.5" />}
                    {matching ? "מתאים..." : "הפעל"}
                  </button>
                </div>
              )}

              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  dragging
                    ? "border-teal-400 bg-teal-50"
                    : "border-gray-200 hover:border-teal-300 hover:bg-gray-50"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-medium text-gray-700">העלה דוח שיקים (XLSX)</p>
                <p className="text-sm text-gray-400 mt-1">
                  גרור לכאן או לחץ לבחירה
                </p>
                <p className="text-xs text-gray-300 mt-2">
                  נדרשות עמודות: שם לקוח, מס שיק, סכום
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={onFileInput}
                />
              </div>
            </>
          )}

          {/* ── Parsing spinner ── */}
          {parsing && (
            <div className="flex items-center justify-center gap-2 py-6 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>מפרסר קובץ...</span>
            </div>
          )}

          {/* ── Preview step ── */}
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

              {/* Parse error */}
              {parseError && (
                <div className="flex items-start gap-2 bg-red-50 text-red-700 rounded-lg p-3 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Parse success summary */}
              {parseResult && parseResult.checks.length > 0 && (
                <div className="bg-teal-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-teal-800">
                      נמצאו {parseResult.checks.length.toLocaleString()} שיקים
                    </p>
                    {parseResult.checks.filter((c) => c.is_cancelled).length > 0 && (
                      <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                        {parseResult.checks.filter((c) => c.is_cancelled).length} מבוטלים
                      </span>
                    )}
                  </div>

                  {/* Preview table */}
                  <div className="overflow-x-auto rounded-lg border border-teal-100">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-teal-100 text-teal-700">
                        <tr>
                          <th className="px-2 py-1.5">מס שיק</th>
                          <th className="px-2 py-1.5">ספק</th>
                          <th className="px-2 py-1.5 text-left">סכום</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-teal-50">
                        {parseResult.checks.slice(0, 5).map((c, i) => (
                          <tr key={i} className="bg-white">
                            <td className="px-2 py-1.5 text-gray-400 font-mono">{c.check_number}</td>
                            <td className="px-2 py-1.5 text-gray-700 max-w-[150px] truncate">{c.supplier_name}</td>
                            <td className="px-2 py-1.5 text-gray-600 font-mono text-left">{fmt(c.amount)}</td>
                          </tr>
                        ))}
                        {parseResult.checks.length > 5 && (
                          <tr>
                            <td colSpan={3} className="px-2 py-1.5 text-center text-gray-400">
                              + עוד {(parseResult.checks.length - 5).toLocaleString()} שיקים
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {parseResult.errors.length > 0 && (
                    <p className="text-xs text-orange-500">{parseResult.errors.length} שורות נכשלו בפרסור</p>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Uploading ── */}
          {step === "uploading" && (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
              <p className="text-gray-600">מעלה שיקים ומפעיל התאמה...</p>
            </div>
          )}

          {/* ── Done ── */}
          {step === "done" && uploadResult && (
            <div className="text-center py-6 space-y-4">
              <CheckCircle className="w-14 h-14 text-teal-500 mx-auto" />
              <p className="text-xl font-bold text-gray-800">הועלה בהצלחה!</p>

              <div className="flex justify-center gap-6 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-teal-600">{uploadResult.inserted.toLocaleString()}</p>
                  <p className="text-gray-500">שיקים חדשים</p>
                </div>
                {uploadResult.skipped > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-400">{uploadResult.skipped.toLocaleString()}</p>
                    <p className="text-gray-500">כפילויות (דולגו)</p>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{uploadResult.matched.toLocaleString()}</p>
                  <p className="text-gray-500">תנועות הוזהו</p>
                </div>
              </div>

              {uploadResult.matched > 0 && (
                <p className="text-sm text-teal-700 bg-teal-50 rounded-xl px-4 py-2">
                  שורות «שיק» בטבלת התנועות עודכנו עם שם הספק
                </p>
              )}
              {uploadResult.matched === 0 && uploadResult.inserted > 0 && (
                <p className="text-sm text-gray-500">
                  השיקים נשמרו במאגר — התאמה תבוצע אוטומטית בעת העלאת קבצי הבנק
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
              className="px-5 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
            >
              סגור וצפה בתנועות
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                סגור
              </button>
              {step === "preview" && parseResult && parseResult.checks.length > 0 && (
                <button
                  onClick={doUpload}
                  className="px-5 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  העלה {parseResult.checks.length.toLocaleString()} שיקים
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
