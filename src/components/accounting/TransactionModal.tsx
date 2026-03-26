"use client";

import { useState, useMemo } from "react";
import { X, Pencil, Check, EyeOff, Info, RotateCcw } from "lucide-react";
import { clsx } from "clsx";
import type { DbTransaction, DbTransactionOverride, DbAccount, DbCounterAccountName } from "@/types/accounting";

interface Props {
  accountId: string | null;
  filterMonth?: number;
  transactions: DbTransaction[];
  transactionOverrides: DbTransactionOverride[];
  accounts: DbAccount[];
  counterNames: DbCounterAccountName[];
  year: number;
  onClose: () => void;
  onSaveOverride: (txId: string, type: DbTransactionOverride["override_type"], newValue?: string, note?: string) => Promise<boolean>;
  onDeleteOverride: (id: string) => Promise<boolean>;
  onSupplierClick?: (counterAccount: string, displayName: string) => void;
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function fmtC(val: number): string {
  return new Intl.NumberFormat("he-IL", {
    style: "currency", currency: "ILS", maximumFractionDigits: 0,
  }).format(val);
}

type EditState = {
  txId: string;
  type: DbTransactionOverride["override_type"];
  value: string;
  note: string;
} | null;

export default function TransactionModal({
  accountId, filterMonth, transactions, transactionOverrides, accounts,
  counterNames, year, onClose, onSaveOverride, onDeleteOverride, onSupplierClick,
}: Props) {
  const [editState, setEditState] = useState<EditState>(null);
  const [saving, setSaving] = useState(false);

  const account = accounts.find((a) => a.id === accountId);
  const counterNameMap = useMemo(
    () => new Map(counterNames.map((c) => [c.counter_account_code, c.display_name])),
    [counterNames],
  );

  // Filter transactions for this account and optionally month
  const filteredTx = useMemo(() => {
    if (!accountId) return [];
    return transactions
      .filter((tx) => {
        if (tx.account_id !== accountId) return false;
        const d = new Date(tx.transaction_date);
        if (d.getFullYear() !== year) return false;
        if (filterMonth && d.getMonth() + 1 !== filterMonth) return false;
        return true;
      })
      .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
  }, [accountId, transactions, year, filterMonth]);

  // Override lookup by transaction id
  const overridesByTx = useMemo(() => {
    const m = new Map<string, DbTransactionOverride[]>();
    for (const ov of transactionOverrides) {
      const list = m.get(ov.transaction_id) ?? [];
      list.push(ov);
      m.set(ov.transaction_id, list);
    }
    return m;
  }, [transactionOverrides]);

  const total = filteredTx.reduce((s, tx) => {
    const ovs = overridesByTx.get(tx.id) ?? [];
    if (ovs.some(o => o.override_type === "exclude")) return s;
    return s + tx.debit - tx.credit;
  }, 0);

  const handleSave = async () => {
    if (!editState) return;
    setSaving(true);
    await onSaveOverride(editState.txId, editState.type, editState.value || undefined, editState.note || undefined);
    setSaving(false);
    setEditState(null);
  };

  const handleDeleteOverride = async (id: string) => {
    await onDeleteOverride(id);
  };

  if (!accountId || !account) return null;

  const MONTH_LONG = filterMonth
    ? new Date(2000, filterMonth - 1).toLocaleString("he-IL", { month: "long" })
    : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {account.name} ({account.code})
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {MONTH_LONG ? `${MONTH_LONG} ${year}` : year} · {filteredTx.length} תנועות · סה&quot;כ {fmtC(total)}
              </p>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            {filteredTx.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                אין תנועות
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-right py-2.5 px-4 font-semibold text-gray-600 w-24">תאריך</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-gray-600">פרטים</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-gray-600 w-24">חשבון נגדי</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-600 w-24">חובה</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-600 w-24">זכות</th>
                    <th className="py-2.5 px-3 w-16 text-center font-semibold text-gray-600">✏️</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTx.map((tx) => {
                    const ovs = overridesByTx.get(tx.id) ?? [];
                    const isExcluded = ovs.some(o => o.override_type === "exclude");
                    const amountOv = ovs.find(o => o.override_type === "amount");
                    const noteOv = ovs.find(o => o.override_type === "note");
                    const counterDisplay =
                      tx.counter_account
                        ? (counterNameMap.get(tx.counter_account) ?? tx.counter_account)
                        : "—";

                    const isEditing = editState?.txId === tx.id;

                    return (
                      <tr
                        key={tx.id}
                        className={clsx(
                          "border-b border-gray-50 hover:bg-gray-50/50 transition-colors",
                          isExcluded && "opacity-40 line-through",
                        )}
                      >
                        <td className="py-2 px-4 text-gray-600 tabular-nums">{fmtDate(tx.transaction_date)}</td>
                        <td className="py-2 px-3">
                          <p className="text-gray-700 truncate max-w-[200px]">{tx.description ?? "—"}</p>
                          {noteOv && (
                            <p className="text-[10px] text-blue-500 mt-0.5 flex items-center gap-1">
                              <Info className="w-2.5 h-2.5" />
                              {noteOv.note}
                            </p>
                          )}
                        </td>
                        <td className="py-2 px-3 tabular-nums truncate max-w-[100px]">
                          {tx.counter_account && onSupplierClick ? (
                            <button
                              onClick={() => onSupplierClick(tx.counter_account!, counterDisplay)}
                              className="text-indigo-600 hover:text-indigo-800 hover:underline text-right truncate max-w-[100px] block"
                              title={`פתח כרטיס ספק: ${counterDisplay}`}
                            >
                              {counterDisplay}
                            </button>
                          ) : (
                            <span className="text-gray-500">{counterDisplay}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-left tabular-nums font-medium text-gray-900">
                          {amountOv?.new_value
                            ? <span className="text-amber-600">{fmtC(parseFloat(amountOv.new_value))}</span>
                            : tx.debit > 0 ? fmtC(tx.debit) : "—"
                          }
                        </td>
                        <td className="py-2 px-3 text-left tabular-nums text-gray-500">
                          {tx.credit > 0 ? fmtC(tx.credit) : "—"}
                        </td>
                        <td className="py-2 px-3">
                          {isEditing ? (
                            <EditRow
                              state={editState!}
                              onChange={setEditState}
                              onSave={handleSave}
                              onCancel={() => setEditState(null)}
                              saving={saving}
                            />
                          ) : (
                            <div className="flex items-center gap-1 justify-center">
                              <button
                                onClick={() => setEditState({ txId: tx.id, type: "amount", value: String(tx.debit || tx.credit), note: "" })}
                                className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                title="שנה סכום"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditState({ txId: tx.id, type: "note", value: "", note: noteOv?.note ?? "" })}
                                className="p-1 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                                title="הוסף הערה"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>
                              {isExcluded ? (
                                <button
                                  onClick={() => { const excl = ovs.find(o=>o.override_type==="exclude"); if(excl) void handleDeleteOverride(excl.id); }}
                                  className="p-1 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg"
                                  title="בטל החרגה"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => setEditState({ txId: tx.id, type: "exclude", value: "true", note: "" })}
                                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                  title="החרג מהחישוב"
                                >
                                  <EyeOff className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

      <div className="px-5 py-3 border-t border-gray-100 text-[10px] text-gray-400">
        ✏️ שינוי סכום · ℹ️ הערה · 🚫 החרגה מהחישוב
      </div>
        </div>
      </div>
    </>
  );
}

function EditRow({
  state, onChange, onSave, onCancel, saving,
}: {
  state: EditState & {};
  onChange: (s: EditState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-[200px]">
      {state.type === "exclude" ? (
        <p className="text-xs text-red-600">להחריג מהחישוב?</p>
      ) : state.type === "amount" ? (
        <input
          type="number"
          value={state.value}
          onChange={(e) => onChange({ ...state, value: e.target.value })}
          placeholder="סכום חדש"
          className="px-2 py-1 border border-gray-200 rounded-lg text-xs w-full"
          autoFocus
        />
      ) : (
        <input
          type="text"
          value={state.note}
          onChange={(e) => onChange({ ...state, note: e.target.value })}
          placeholder="הערה..."
          className="px-2 py-1 border border-gray-200 rounded-lg text-xs w-full"
          autoFocus
        />
      )}
      <div className="flex gap-1">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-green-600 text-white rounded-lg text-[10px] hover:bg-green-700 disabled:opacity-50"
        >
          <Check className="w-3 h-3" /> שמור
        </button>
        <button
          onClick={onCancel}
          className="px-2 py-1 border border-gray-200 rounded-lg text-[10px] text-gray-500 hover:bg-gray-50"
        >
          ביטול
        </button>
      </div>
    </div>
  );
}
