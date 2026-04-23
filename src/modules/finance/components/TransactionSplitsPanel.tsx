"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Plus, Trash2, Loader2, Check, Zap, X } from "lucide-react";
import toast from "react-hot-toast";
import type { TransactionSplit, DocDetailRow } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditRow {
  _key: string;
  description: string;
  supplier_name: string;
  category_id: string;
  amount: string;
  notes: string;
  /** ISO date from source document (read-only display, not saved to DB) */
  transaction_date?: string;
  /** true = category was set by an auto-rule (visual hint only) */
  auto_classified?: boolean;
}

interface Props {
  txId: string;
  txAmount: number;
  txIsDebit: boolean;
  categories: { id: string; name: string; type: string }[];
  docRows: DocDetailRow[];
  onSaved?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return "₪" + Math.abs(n).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatShortDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y.slice(2)}`;
}

let _keyCounter = 0;
function nextKey() { return `r_${++_keyCounter}`; }

function makeEmpty(): EditRow {
  return { _key: nextKey(), description: "", supplier_name: "", category_id: "", amount: "", notes: "" };
}

function fromSplit(s: TransactionSplit): EditRow {
  return {
    _key: nextKey(),
    description: s.description,
    supplier_name: s.supplier_name ?? "",
    category_id: s.category_id ?? "",
    amount: String(s.amount),
    notes: s.notes ?? "",
  };
}

function rowsFromDocRows(docRows: DocDetailRow[]): EditRow[] {
  return docRows
    .map((row) => {
      const importedName = String(row.business_name ?? row.payee_name ?? "");
      return {
      _key: nextKey(),
      description: importedName,
      supplier_name: importedName,
      category_id: "",
      amount: String(row.charge_amount ?? row.amount ?? 0),
      notes: "",
      transaction_date: String(row.transaction_date ?? ""),
      };
    })
    .filter((r) => r.description || Number(r.amount) !== 0);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TransactionSplitsPanel({ txId, txAmount, txIsDebit, categories, docRows, onSaved }: Props) {
  const [rows, setRows] = useState<EditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [hasSplits, setHasSplits] = useState(false);
  const [filter, setFilter] = useState("");
  const [batchCatId, setBatchCatId] = useState("");
  const [supplierSuggestions, setSupplierSuggestions] = useState<Array<{ id: string; master_name: string }>>([]);
  const [supplierSearch, setSupplierSearch] = useState("");

  // After-save: show how many unclassified were retroactively updated
  const [appliedCount, setAppliedCount] = useState<number | null>(null);

  const autoImportedRef = useRef(false);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  // ── Load existing splits ─────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/transactions/splits?tx_id=${txId}`);
      if (!res.ok) return;
      const { splits } = (await res.json()) as { splits: TransactionSplit[] };
      if (splits && splits.length > 0) {
        setRows(splits.map(fromSplit));
        setHasSplits(true);
        autoImportedRef.current = true;
      } else {
        setRows([makeEmpty()]);
        setHasSplits(false);
      }
    } finally {
      setLoading(false);
    }
  }, [txId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const q = supplierSearch.trim();
      const params = new URLSearchParams();
      params.set("limit", "200");
      if (q) params.set("q", q);
      try {
        const res = await fetch(`/api/finance/suppliers?${params.toString()}`, { signal: controller.signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        setSupplierSuggestions((data as { suppliers?: Array<{ id: string; master_name: string }> }).suppliers ?? []);
      } catch {
        if (!controller.signal.aborted) setSupplierSuggestions([]);
      }
    }, 280);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [supplierSearch]);

  // ── Auto-classify rows using saved rules ─────────────────────────────────
  const applyAutoClassify = useCallback(async (importedRows: EditRow[]): Promise<EditRow[]> => {
    const unclassified = importedRows.filter((r) => !r.category_id && r.description);
    if (unclassified.length === 0) return importedRows;

    setClassifying(true);
    try {
      const params = new URLSearchParams();
      unclassified.forEach((r) => params.append("d", r.description));
      const res = await fetch(`/api/finance/splits/rules?${params.toString()}`);
      if (!res.ok) return importedRows;

      const { matches } = (await res.json()) as {
        matches: Record<
          string,
          { category_id: string; category_name: string; confidence?: number; source?: string }
        >;
      };

      let autoCount = 0;
      let needsReviewCount = 0;
      const updated = importedRows.map((r) => {
        if (r.category_id || !r.description) return r;
        const match = matches[r.description];
        const confidence = match?.confidence ?? 0;
        if (match && confidence >= 1) {
          autoCount++;
          return { ...r, category_id: match.category_id, auto_classified: true };
        }
        if (match) needsReviewCount++;
        return r;
      });

      if (autoCount > 0) {
        toast.success(`${autoCount} שורות סווגו אוטומטית`);
      }
      if (needsReviewCount > 0) {
        toast(`${needsReviewCount} שורות דורשות בדיקה ידנית (התאמה לא מלאה)`, {
          icon: "⚠️",
        });
      }
      return updated;
    } catch {
      return importedRows;
    } finally {
      setClassifying(false);
    }
  }, []);

  // ── Auto-import when doc rows arrive (no existing splits) ────────────────
  useEffect(() => {
    if (loading) return;
    if (hasSplits) return;
    if (autoImportedRef.current) return;
    if (docRows.length === 0) return;

    const currentRows = rowsRef.current;
    const isDefault = currentRows.length === 1
      && !currentRows[0]!.description
      && !currentRows[0]!.amount;
    if (!isDefault) return;

    autoImportedRef.current = true;
    const imported = rowsFromDocRows(docRows);
    if (imported.length === 0) return;

    // Apply auto-classify then set rows
    applyAutoClassify(imported).then((classified) => {
      setRows(classified);
      const alreadyClassified = classified.filter((r) => r.auto_classified).length;
      if (alreadyClassified === 0) {
        toast.success(`${imported.length} שורות נטענו מהפירוט`);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasSplits, docRows]);

  // ── Row operations ───────────────────────────────────────────────────────
  const updateRow = useCallback((key: string, field: keyof Omit<EditRow, "_key">, value: string) => {
    setRows((prev) => prev.map((r) =>
      r._key === key ? { ...r, [field]: value, auto_classified: false } : r
    ));
  }, []);

  const removeRow = useCallback((key: string) => {
    setRows((prev) => {
      const next = prev.filter((r) => r._key !== key);
      return next.length === 0 ? [makeEmpty()] : next;
    });
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, makeEmpty()]);
  }, []);

  // ── Batch: set same category for all visible rows ────────────────────────
  const handleBatchCategory = useCallback((catId: string) => {
    setBatchCatId(catId);
    if (!catId) return;
    const q = filter.trim().toLowerCase();
    setRows((prev) =>
      prev.map((r) => {
        if (!q) return { ...r, category_id: catId, auto_classified: false };
        const matches = r.description.toLowerCase().includes(q)
          || r.supplier_name.toLowerCase().includes(q);
        return matches ? { ...r, category_id: catId, auto_classified: false } : r;
      })
    );
    setBatchCatId("");
  }, [filter]);

  // ── Re-import from doc ───────────────────────────────────────────────────
  const handleReImport = useCallback(() => {
    if (docRows.length === 0) return;
    const imported = rowsFromDocRows(docRows);
    if (imported.length === 0) { toast.error("לא נמצאו שורות לייבוא"); return; }

    applyAutoClassify(imported).then((classified) => {
      setRows(classified);
      setFilter("");
      setBatchCatId("");
      toast.success(`${imported.length} שורות נטענו מחדש`);
    });
  }, [docRows, applyAutoClassify]);

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const validRows = rows.filter((r) => r.description.trim() || Number(r.amount) !== 0);
    if (validRows.length === 0) { toast.error("יש להוסיף לפחות שורה אחת"); return; }

    const payload = validRows.map((r, i) => ({
      description: r.description.trim(),
      supplier_name: r.supplier_name.trim() || undefined,
      category_id: r.category_id || null,
      amount: Math.abs(Number(r.amount) || 0),
      notes: r.notes.trim() || undefined,
      sort_order: i,
    }));

    setSaving(true);
    try {
      const res = await fetch("/api/finance/transactions/splits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tx_id: txId, splits: payload }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as Record<string, string>;
        toast.error(err.error ?? "שגיאה בשמירה");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as {
        saved_rules?: number;
        retro_updated?: number;
        conflicts?: string[];
      };
      setHasSplits(true);
      toast.success(`פיצול נשמר — ${payload.length} שורות`);
      onSaved?.();

      if (data.saved_rules && data.saved_rules > 0) {
        toast.success(`נשמרו ${data.saved_rules} כללי פיצול אוטומטיים`);
      }
      if (data.retro_updated && data.retro_updated > 0) {
        setAppliedCount(data.retro_updated);
      }
      if (data.conflicts && data.conflicts.length > 0) {
        toast.error(`לא נשמר כלל עבור ${data.conflicts.length} ספקים בגלל התנגשות קטגוריה`);
      }
    } finally {
      setSaving(false);
    }
  }, [rows, txId, onSaved]);


  // ── Remove all splits ────────────────────────────────────────────────────
  const handleClearSplits = useCallback(async () => {
    if (!confirm("למחוק את כל הפיצולים? התנועה תחזור לסיווג יחיד.")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/finance/transactions/splits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tx_id: txId, splits: [] }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as Record<string, string>;
        toast.error(err.error ?? "שגיאה במחיקת הפיצולים");
        return;
      }
      setHasSplits(false);
      setRows([makeEmpty()]);
      setFilter("");
      setAppliedCount(null);
      autoImportedRef.current = false;
      toast.success("הפיצולים נמחקו");
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }, [txId, onSaved]);

  // ── Filtered rows ────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.description.toLowerCase().includes(q) ||
      r.supplier_name.toLowerCase().includes(q)
    );
  }, [rows, filter]);

  const relevantCats = useMemo(
    () => categories.filter((c) => txIsDebit ? c.type !== "income" : c.type !== "expense"),
    [categories, txIsDebit]
  );

  // Totals
  const splitTotal = rows.reduce((sum, r) => sum + Math.abs(Number(r.amount) || 0), 0);
  const diff = txAmount - splitTotal;
  const diffOk = Math.abs(diff) < 0.01;
  const unclassifiedCount = rows.filter((r) => !r.category_id && (r.description || Number(r.amount))).length;
  const autoClassifiedCount = rows.filter((r) => r.auto_classified).length;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>טוען פיצולים...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-indigo-500" />
          <h3 className="font-semibold text-gray-800 text-sm">פיצול תנועה</h3>
          {hasSplits && (
            <span className="bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded-full font-medium">
              פעיל
            </span>
          )}
          {rows.length > 1 && (
            <span className="text-gray-400 text-xs">({rows.length} שורות)</span>
          )}
          {classifying && (
            <span className="flex items-center gap-1 text-xs text-indigo-400">
              <Loader2 className="w-3 h-3 animate-spin" /> מסווג אוטומטית...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {docRows.length > 0 && (
            <button
              onClick={handleReImport}
              className="text-xs text-blue-500 hover:text-blue-700 underline"
              title="טען מחדש את שורות הקובץ המקושר"
            >
              טען מחדש מפירוט
            </button>
          )}
          <button
            onClick={addRow}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            הוסף שורה
          </button>
        </div>
      </div>

      {/* ── Auto-classify hint ── */}
      {autoClassifiedCount > 0 && !hasSplits && (
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-xs text-indigo-700">
          <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span>
            <strong>{autoClassifiedCount}</strong> שורות סווגו אוטומטית לפי כללים שמורים — בדוק ושמור
          </span>
        </div>
      )}

      {/* ── Toolbar: filter + batch category ── */}
      {rows.length > 3 && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="חפש שורה..."
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs pr-7 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              dir="rtl"
            />
            {filter && (
              <button onClick={() => setFilter("")} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <select
            value={batchCatId}
            onChange={(e) => handleBatchCategory(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 max-w-[140px]"
            title={filter ? `הגדר קטגוריה ל-${filteredRows.length} שורות מסוננות` : "הגדר קטגוריה לכולם"}
          >
            <option value="">
              {filter ? `קטגוריה ל-${filteredRows.length} ▾` : "קטגוריה לכולם ▾"}
            </option>
            {relevantCats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Rows ── */}
      <div
        className="space-y-1 overflow-y-auto"
        style={{ maxHeight: rows.length > 8 ? "320px" : undefined }}
      >
        {rows.length > 3 && (
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-1.5 px-1 pb-1 border-b border-gray-100">
            <span className="text-xs text-gray-400">תיאור / ספק</span>
            <span className="text-xs text-gray-400 min-w-[100px]">קטגוריה</span>
            <span className="text-xs text-gray-400 w-20 text-left">סכום</span>
            <span />
          </div>
        )}

        {filteredRows.length === 0 && filter ? (
          <p className="text-xs text-gray-400 text-center py-3">אין תוצאות לחיפוש &ldquo;{filter}&rdquo;</p>
        ) : (
          filteredRows.map((row) => (
            <div
              key={row._key}
              className={`grid grid-cols-[1fr_auto_auto_auto] gap-1.5 items-center rounded-lg px-1 py-0.5 ${
                row.auto_classified ? "bg-indigo-50/40" :
                !row.category_id && (row.description || Number(row.amount)) ? "bg-amber-50/50" : ""
              }`}
            >
              <div className="min-w-0">
                <input
                  type="text"
                  value={row.description}
                  onChange={(e) => updateRow(row._key, "description", e.target.value)}
                  placeholder="תיאור"
                  className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                />
                <input
                  type="text"
                  value={row.supplier_name}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateRow(row._key, "supplier_name", value);
                    setSupplierSearch(value);
                  }}
                  placeholder="שם ספק (אופציונלי)"
                  list="split-supplier-master-suggestions"
                  className="w-full mt-1 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                />
                {row.transaction_date && (
                  <span className="text-[10px] text-gray-400 px-1 select-none">
                    {formatShortDate(row.transaction_date)}
                  </span>
                )}
              </div>
              <select
                value={row.category_id}
                onChange={(e) => updateRow(row._key, "category_id", e.target.value)}
                className={`border rounded-md px-1.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300 min-w-[100px] ${
                  row.category_id
                    ? row.auto_classified
                      ? "border-indigo-300 text-indigo-800"
                      : "border-gray-200"
                    : "border-amber-200"
                }`}
              >
                <option value="">— קטגוריה —</option>
                {relevantCats.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                type="number"
                value={row.amount}
                onChange={(e) => updateRow(row._key, "amount", e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-20 border border-gray-200 rounded-md px-2 py-1.5 text-xs text-left font-mono focus:outline-none focus:ring-1 focus:ring-indigo-300"
              />
              <button
                onClick={() => removeRow(row._key)}
                className="text-gray-300 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
      <datalist id="split-supplier-master-suggestions">
        {supplierSuggestions.map((s) => (
          <option key={s.id} value={s.master_name} />
        ))}
      </datalist>

      {/* ── Status bar ── */}
      <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
        diffOk ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
      }`}>
        <span>
          סה&quot;כ תנועה: <span className="font-mono font-semibold">{fmt(txAmount)}</span>
        </span>
        <span className="flex items-center gap-3">
          {unclassifiedCount > 0 && (
            <span className="text-amber-600">{unclassifiedCount} ללא קטגוריה</span>
          )}
          <span>
            פיצולים: <span className="font-mono font-semibold">{fmt(splitTotal)}</span>
            {!diffOk && (
              <span className="mr-1">
                ({diff > 0 ? "+" : ""}{fmt(Math.abs(diff))} {diff > 0 ? "נשאר" : "חורג"})
              </span>
            )}
            {diffOk && <span className="mr-1">✓</span>}
          </span>
        </span>
      </div>

      {/* ── Save actions ── */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving || classifying}
          className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          שמור פיצול
        </button>
        {hasSplits && (
          <button
            onClick={handleClearSplits}
            disabled={saving}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3" />
            מחק פיצול
          </button>
        )}
        <p className="text-xs text-gray-400 mr-auto">משפיע על דוח רווח/הפסד</p>
      </div>

      {/* ── Retroactive apply notification ── */}
      {appliedCount !== null && appliedCount > 0 && (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-green-700">
            <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
            <span>
              <strong>{appliedCount}</strong> פיצולים נוספים עודכנו אוטומטית — כל הספקים הדומים סווגו
            </span>
          </div>
          <button
            onClick={() => setAppliedCount(null)}
            className="text-green-400 hover:text-green-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
