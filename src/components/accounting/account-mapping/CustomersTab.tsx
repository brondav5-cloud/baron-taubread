"use client";

import React, { useState, useMemo } from "react";
import { Search, Plus, Trash2, Loader2, RefreshCw, Users } from "lucide-react";
import { clsx } from "clsx";

interface RevenueCounterAccount {
  counter_account: string;
  display_name: string | null;
}

interface CustomersTabProps {
  revenueCounterAccounts: RevenueCounterAccount[];
  onRefetch: () => Promise<void>;
}

export function CustomersTab({ revenueCounterAccounts, onRefetch }: CustomersTabProps) {
  const [search, setSearch] = useState("");
  const [newAccount, setNewAccount] = useState("");
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return revenueCounterAccounts;
    const q = search.trim().toLowerCase();
    return revenueCounterAccounts.filter(
      (r) =>
        r.counter_account.toLowerCase().includes(q) ||
        (r.display_name ?? "").toLowerCase().includes(q),
    );
  }, [revenueCounterAccounts, search]);

  const handleAdd = async () => {
    if (!newAccount.trim()) return;
    setIsAdding(true);
    try {
      const res = await fetch("/api/accounting/revenue-counter-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          counter_account: newAccount.trim(),
          display_name: newName.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "שגיאה");
      }
      setNewAccount("");
      setNewName("");
      await onRefetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (counterAccount: string) => {
    setDeletingAccount(counterAccount);
    try {
      const res = await fetch(
        `/api/accounting/revenue-counter-accounts?counter_account=${encodeURIComponent(counterAccount)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "שגיאה");
      }
      await onRefetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setDeletingAccount(null);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-l from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 text-sm">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-blue-900 mb-1">ח״ן נגדי — לקוחות (הכנסות)</h3>
            <p className="text-blue-800">
              הגדר כאן ח״ן נגדיים שהם לקוחות (מקור הכנסה), לא ספקים.
              <br />
              ח״ן שמופיעים כאן <strong>לא יופיעו ברשימת הספקים</strong>, גם אם יש להם תנועות זיכוי/הוצאה.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-medium text-gray-700 mb-1">ח״ן נגדי</label>
          <input
            type="text"
            value={newAccount}
            onChange={(e) => setNewAccount(e.target.value)}
            placeholder="לדוגמה: 4100"
            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-medium text-gray-700 mb-1">שם תצוגה (אופציונלי)</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="לדוגמה: לקוחות קמעונאי"
            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <button
          onClick={() => void handleAdd()}
          disabled={isAdding || !newAccount.trim()}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
        >
          {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          הוסף
        </button>
        <button
          onClick={() => void handleRefresh()}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
        >
          {isRefreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          רענן
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-3 border-b border-gray-100 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש..."
              className="w-full pr-9 pl-4 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            {revenueCounterAccounts.length === 0
              ? "עדיין לא הוגדרו ח״ן נגדיים כלקוחות."
              : "לא נמצאו תוצאות."}
          </div>
        ) : (
          <div className="overflow-x-auto" dir="rtl">
            <table className="text-[11px] border-collapse w-full">
              <thead>
                <tr className="bg-gradient-to-l from-slate-700 to-slate-800 text-white">
                  <th className="text-right py-3 px-4 font-semibold">ח״ן נגדי</th>
                  <th className="text-right py-3 px-4 font-semibold">שם תצוגה</th>
                  <th className="text-right py-3 px-2 font-semibold w-16">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.counter_account} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="py-2 px-4">
                      <code className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono text-[10px]">
                        {r.counter_account}
                      </code>
                    </td>
                    <td className="py-2 px-4 text-gray-700">{r.display_name ?? "—"}</td>
                    <td className="py-2 px-2">
                      <button
                        onClick={() => void handleDelete(r.counter_account)}
                        disabled={deletingAccount === r.counter_account}
                        className={clsx(
                          "p-1.5 rounded-lg transition-colors",
                          deletingAccount === r.counter_account
                            ? "opacity-50"
                            : "text-red-600 hover:bg-red-50",
                        )}
                        title="הסר"
                      >
                        {deletingAccount === r.counter_account ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
          {revenueCounterAccounts.length} ח״ן נגדיים מוגדרים כלקוחות
        </div>
      </div>
    </div>
  );
}
