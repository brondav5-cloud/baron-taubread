"use client";

import { useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";

function MergeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/><path d="M16 6h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3"/>
      <line x1="12" y1="2" x2="12" y2="22"/>
    </svg>
  );
}
import toast from "react-hot-toast";
import type { BankTransaction } from "../types";

interface Props {
  transactions: BankTransaction[];  // the selected transactions to merge
  onClose: () => void;
  onMerged: (masterId: string) => void;
}

function fmt(n: number) {
  return "₪" + n.toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function MergeTransactionsModal({ transactions, onClose, onMerged }: Props) {
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const totalDebit = transactions.reduce((s, t) => s + t.debit, 0);
  const totalCredit = transactions.reduce((s, t) => s + t.credit, 0);

  const handleMerge = async () => {
    if (!newName.trim()) { toast.error("יש להזין שם לתנועה הממוזגת"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/finance/transactions/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tx_ids: transactions.map((t) => t.id),
          new_name: newName.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "שגיאה במיזוג");
      }
      const data = await res.json() as { master_id: string };
      toast.success(`${transactions.length} תנועות מוזגו בהצלחה`);
      onMerged(data.master_id);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שגיאה במיזוג");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MergeIcon className="w-4 h-4 text-indigo-600" />
            <h2 className="font-bold text-gray-800">מיזוג {transactions.length} תנועות</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Info banner */}
        <div className="px-5 py-3 bg-indigo-50 border-b border-indigo-100 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-xs text-indigo-700">
            התנועות יאוחדו לשורה אחת. מיד אחרי המיזוג ייפתח חלון התנועה הראשית, שם אפשר להעלות קובץ פירוט ולסווג שורות כמו בכרטיס אשראי.
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Name input */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">שם לתנועה הממוזגת</label>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleMerge(); }}
              placeholder="למשל: שכר עובדים פברואר"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:outline-none"
            />
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 gap-3">
            {totalDebit > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                <p className="text-[10px] text-red-400 font-medium">סה״כ חובה</p>
                <p className="text-base font-bold text-red-600">{fmt(totalDebit)}</p>
              </div>
            )}
            {totalCredit > 0 && (
              <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                <p className="text-[10px] text-green-500 font-medium">סה״כ זכות</p>
                <p className="text-base font-bold text-green-600">{fmt(totalCredit)}</p>
              </div>
            )}
          </div>

          {/* Transaction list */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">
              תנועות לאיחוד
            </div>
            <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
              {transactions.map((tx, i) => (
                <div key={tx.id} className="px-3 py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 font-mono w-4">{i + 1}.</span>
                    <div>
                      <p className="font-medium text-gray-700 truncate max-w-[220px]">
                        {tx.supplier_name ?? tx.description}
                      </p>
                      <p className="text-gray-400 font-mono">{fmtDate(tx.date)}</p>
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    {tx.debit > 0 && <span className="text-red-600 font-semibold font-mono">{fmt(tx.debit)}</span>}
                    {tx.credit > 0 && <span className="text-green-600 font-semibold font-mono">{fmt(tx.credit)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        {confirming ? (
          <div className="px-5 pb-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3 text-center">
              <p className="text-sm font-semibold text-amber-800">האם אתה בטוח?</p>
              <p className="text-xs text-amber-600 mt-0.5">
                {transactions.length} תנועות יאוחדו ל&quot;{newName}&quot; — פעולה זו ניתנת לביטול
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirming(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                חזור לעריכה
              </button>
              <button
                onClick={handleMerge}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                כן, מזג
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 pb-4 flex gap-2 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              ביטול
            </button>
            <button
              onClick={() => { if (newName.trim()) setConfirming(true); }}
              disabled={!newName.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <MergeIcon className="w-3.5 h-3.5" />
              מזג תנועות
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
