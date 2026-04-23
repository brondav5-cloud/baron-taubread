"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import type { BankTransaction } from "../types";

interface Props {
  transaction: BankTransaction;
  onClose: () => void;
  onSaved: (updated: Partial<BankTransaction>) => void;
}

function fmt(n: number) {
  return n.toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function TransactionEditModal({ transaction: tx, onClose, onSaved }: Props) {
  const [supplierName, setSupplierName] = useState(tx.supplier_name ?? "");
  const [supplierSuggestions, setSupplierSuggestions] = useState<Array<{ id: string; master_name: string }>>([]);
  const [description, setDescription] = useState(tx.description ?? "");
  const [debit, setDebit] = useState(tx.debit > 0 ? String(tx.debit) : "");
  const [credit, setCredit] = useState(tx.credit > 0 ? String(tx.credit) : "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = supplierName.trim();
    if (q.length < 2) {
      setSupplierSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/finance/suppliers?q=${encodeURIComponent(q)}&limit=10`);
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          setSupplierSuggestions((data as { suppliers?: Array<{ id: string; master_name: string }> }).suppliers ?? []);
        }
      } catch {
        if (!cancelled) setSupplierSuggestions([]);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [supplierName]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { tx_id: tx.id };
      body.supplier_name = supplierName.trim() || "";
      body.description = description.trim();
      const dNum = parseFloat(debit.replace(/,/g, ""));
      const cNum = parseFloat(credit.replace(/,/g, ""));
      if (!isNaN(dNum) && dNum >= 0) body.debit = dNum;
      if (!isNaN(cNum) && cNum >= 0) body.credit = cNum;

      const res = await fetch("/api/finance/transactions/edit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "שגיאה בשמירה");
      }
      toast.success("תנועה עודכנה");
      onSaved({
        supplier_name: (body.supplier_name as string) || undefined,
        description: body.description as string,
        debit: body.debit as number ?? tx.debit,
        credit: body.credit as number ?? tx.credit,
      });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-blue-600" />
            <h2 className="font-bold text-gray-800">עריכת תנועה</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Original info */}
        <div className="px-5 py-3 bg-gray-50 text-xs text-gray-500 border-b border-gray-100">
          <span className="font-medium">מקורי:</span>{" "}
          {tx.description}
          {tx.debit > 0 && <span className="mr-2 text-red-500 font-medium">{fmt(tx.debit)} חובה</span>}
          {tx.credit > 0 && <span className="mr-2 text-green-600 font-medium">{fmt(tx.credit)} זכות</span>}
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">שם מוצג (ספק)</label>
            <input
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="למשל: חברת חשמל"
              list="supplier-master-suggestions"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
            />
            <datalist id="supplier-master-suggestions">
              {supplierSuggestions.map((s) => (
                <option key={s.id} value={s.master_name} />
              ))}
            </datalist>
            <p className="text-[10px] text-gray-400 mt-0.5">יחליף את התיאור הגנרי בטבלה</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">תיאור (פרטים)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">חובה ₪</label>
              <input
                value={debit}
                onChange={(e) => setDebit(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">זכות ₪</label>
              <input
                value={credit}
                onChange={(e) => setCredit(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-200 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-4 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            שמור
          </button>
        </div>
      </div>
    </div>
  );
}
