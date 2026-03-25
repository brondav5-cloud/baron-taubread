"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Loader2, Check, Zap, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import type { TransactionSplit, DocDetailRow } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditRow {
  _key: string;
  description: string;
  supplier_name: string;
  category_id: string;
  amount: string;   // string so it can be used directly in <input type="number">
  notes: string;
}

interface Props {
  txId: string;
  /** Absolute value of the transaction (debit or credit) */
  txAmount: number;
  /** Whether this is a debit (expense) transaction */
  txIsDebit: boolean;
  categories: { id: string; name: string; type: string }[];
  /** Rows imported from a linked detail document (e.g. credit card statement) */
  docRows: DocDetailRow[];
  onSaved?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return "₪" + Math.abs(n).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

// ─── Component ────────────────────────────────────────────────────────────────

export function TransactionSplitsPanel({ txId, txAmount, txIsDebit, categories, docRows, onSaved }: Props) {
  const [rows, setRows] = useState<EditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasSplits, setHasSplits] = useState(false);

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
      } else {
        setRows([makeEmpty()]);
        setHasSplits(false);
      }
    } finally {
      setLoading(false);
    }
  }, [txId]);

  useEffect(() => { load(); }, [load]);

  // ── Row operations ───────────────────────────────────────────────────────
  const updateRow = useCallback((key: string, field: keyof Omit<EditRow, "_key">, value: string) => {
    setRows((prev) => prev.map((r) => r._key === key ? { ...r, [field]: value } : r));
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

  // ── Import from linked doc ───────────────────────────────────────────────
  const handleImport = useCallback(() => {
    if (docRows.length === 0) return;
    const imported: EditRow[] = docRows.map((row) => ({
      _key: nextKey(),
      description: String(row.business_name ?? row.payee_name ?? ""),
      supplier_name: "",
      category_id: "",
      amount: String(row.charge_amount ?? row.amount ?? 0),
      notes: "",
    })).filter((r) => r.description || Number(r.amount) !== 0);

    if (imported.length === 0) { toast.error("לא נמצאו שורות לייבוא"); return; }

    // If the only row is empty, replace it; otherwise append
    setRows((prev) => {
      const isEmpty = prev.length === 1 && !prev[0]!.description && !prev[0]!.amount;
      return isEmpty ? imported : [...prev, ...imported];
    });
    toast.success(`יובאו ${imported.length} שורות מהפירוט`);
  }, [docRows]);

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const validRows = rows.filter((r) => r.description.trim() || Number(r.amount) !== 0);
    if (validRows.length === 0) {
      toast.error("יש להוסיף לפחות שורה אחת");
      return;
    }

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
      setHasSplits(true);
      toast.success(`פיצול נשמר (${payload.length} שורות)`);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }, [rows, txId, onSaved]);

  // ── Remove all splits ────────────────────────────────────────────────────
  const handleClearSplits = useCallback(async () => {
    if (!confirm("למחוק את כל הפיצולים? התנועה תחזור לסיווג יחיד.")) return;
    setSaving(true);
    try {
      await fetch("/api/finance/transactions/splits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tx_id: txId, splits: [] }),
      });
      setHasSplits(false);
      setRows([makeEmpty()]);
      toast.success("הפיצולים נמחקו");
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }, [txId, onSaved]);

  // ── Computed totals ──────────────────────────────────────────────────────
  const splitTotal = rows.reduce((sum, r) => sum + (Math.abs(Number(r.amount) || 0)), 0);
  const diff = txAmount - splitTotal;
  const diffOk = Math.abs(diff) < 0.01;
  const totalColor = diffOk ? "text-green-600" : Math.abs(diff) < txAmount * 0.02 ? "text-amber-600" : "text-red-600";

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-indigo-500" />
          <h3 className="font-semibold text-gray-800 text-sm">פיצול תנועה</h3>
          {hasSplits && (
            <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-medium">
              פעיל
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {docRows.length > 0 && (
            <button
              onClick={handleImport}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              title={`ייבא ${docRows.length} שורות מהפירוט המקושר`}
            >
              <ChevronDown className="w-3.5 h-3.5" />
              ייבא מפירוט ({docRows.length})
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

      {/* Rows */}
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row._key} className="grid grid-cols-[1fr_auto_auto_auto] gap-1.5 items-start">
            {/* Description + supplier */}
            <div className="space-y-1">
              <input
                type="text"
                value={row.description}
                onChange={(e) => updateRow(row._key, "description", e.target.value)}
                placeholder="תיאור (חובה)"
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <input
                type="text"
                value={row.supplier_name ?? ""}
                onChange={(e) => updateRow(row._key, "supplier_name", e.target.value)}
                placeholder="ספק (אופציונלי)"
                className="w-full border border-gray-100 rounded-lg px-2 py-1 text-xs text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-gray-50"
              />
            </div>

            {/* Category */}
            <select
              value={row.category_id ?? ""}
              onChange={(e) => updateRow(row._key, "category_id", e.target.value)}
              className="border border-gray-200 rounded-lg px-1.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-[100px]"
            >
              <option value="">— קטגוריה —</option>
              {categories
                .filter((c) => txIsDebit ? c.type !== "income" : c.type !== "expense")
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))
              }
            </select>

            {/* Amount */}
            <input
              type="number"
              value={row.amount}
              onChange={(e) => updateRow(row._key, "amount", e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className={`w-24 border rounded-lg px-2 py-1.5 text-xs text-left font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                row.amount && Number(row.amount) > 0 ? "border-gray-200" : "border-gray-100 bg-gray-50"
              }`}
            />

            {/* Delete */}
            <button
              onClick={() => removeRow(row._key)}
              className="text-gray-300 hover:text-red-400 transition-colors pt-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Totals bar */}
      <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium ${
        diffOk ? "bg-green-50" : "bg-amber-50"
      }`}>
        <span className="text-gray-500">
          סה&quot;כ תנועה: <span className="text-gray-800 font-mono">{fmt(txAmount)}</span>
        </span>
        <span>
          פיצולים: <span className={`font-mono ${totalColor}`}>{fmt(splitTotal)}</span>
          {!diffOk && (
            <span className={`mr-2 ${totalColor}`}>
              ({diff > 0 ? "+" : ""}{fmt(diff)} {diff > 0 ? "נשאר" : "חורג"})
            </span>
          )}
          {diffOk && <span className="mr-1 text-green-600">✓ מאוזן</span>}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
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
        <p className="text-xs text-gray-400 mr-auto">
          פיצולים ישמשו בדוח רווח/הפסד במקום הסיווג הכללי
        </p>
      </div>
    </div>
  );
}
