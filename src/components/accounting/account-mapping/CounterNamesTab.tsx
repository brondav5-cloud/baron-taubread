"use client";

import { useState, useMemo } from "react";
import { Search, Pencil } from "lucide-react";
import { clsx } from "clsx";
import type { DbCounterAccountName } from "@/types/accounting";

interface CounterNamesTabProps {
  counterNames: DbCounterAccountName[];
  accounts?: unknown[];
  transactions: { counter_account: string | null }[];
  onSaveCounterName: (code: string, displayName: string) => Promise<boolean>;
}

export function CounterNamesTab({ counterNames, transactions, onSaveCounterName }: CounterNamesTabProps) {
  const [search, setSearch] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const counterMap = useMemo(() =>
    new Map(counterNames.map(c => [c.counter_account_code, c.display_name])),
    [counterNames],
  );

  const counterCodes = useMemo(() => {
    const freq = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.counter_account) {
        freq.set(tx.counter_account, (freq.get(tx.counter_account) ?? 0) + 1);
      }
    }
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => ({ code, count, displayName: counterMap.get(code) }));
  }, [transactions, counterMap]);

  const filtered = counterCodes.filter(c =>
    !search || c.code.includes(search) || (c.displayName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (code: string, name: string) => {
    setSaving(true);
    await onSaveCounterName(code, name);
    setSaving(false);
    setEditCode("");
    setEditName("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש לפי קוד חשבון..."
            className="w-full pr-9 pl-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-primary-300"
          />
        </div>
        <p className="text-xs text-gray-500 shrink-0">{counterNames.length} שמות מוגדרים</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="text-xs border-collapse w-full" dir="rtl">
          <thead>
            <tr className="bg-gradient-to-l from-slate-700 to-slate-800 text-white">
              <th className="text-right py-3 px-4 font-semibold">קוד חשבון נגדי</th>
              <th className="text-right py-3 px-4 font-semibold">שם תצוגה</th>
              <th className="text-center py-3 px-4 font-semibold w-20">תנועות</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map(({ code, count, displayName }) => {
              const isEditing = editCode === code;
              return (
                <tr key={code} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="py-2.5 px-4">
                    <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono text-[11px]">
                      {code}
                    </code>
                  </td>
                  <td className="py-2.5 px-4">
                    {isEditing ? (
                      <input autoFocus value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") void handleSave(code, editName); if (e.key === "Escape") setEditCode(""); }}
                        className="w-full px-2.5 py-1 border border-primary-300 rounded-lg text-xs focus:ring-2 focus:ring-primary-300 bg-white"
                      />
                    ) : (
                      <span className={clsx(displayName ? "text-gray-800 font-medium" : "text-gray-400 italic")}>
                        {displayName ?? "— לא מוגדר —"}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-center text-gray-400">{count}</td>
                  <td className="py-2.5 px-4">
                    {isEditing ? (
                      <div className="flex gap-1">
                        <button onClick={() => void handleSave(code, editName)} disabled={saving}
                          className="px-2 py-1 bg-primary-600 text-white rounded text-[10px] hover:bg-primary-700 disabled:opacity-50">
                          {saving ? "..." : "שמור"}
                        </button>
                        <button onClick={() => setEditCode("")}
                          className="px-2 py-1 border border-gray-200 rounded text-[10px] text-gray-600">
                          ביטול
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditCode(code); setEditName(displayName ?? ""); }}
                        className="px-2.5 py-1 border border-gray-200 rounded-lg text-[10px] text-gray-600 hover:border-primary-300 hover:text-primary-600 transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
