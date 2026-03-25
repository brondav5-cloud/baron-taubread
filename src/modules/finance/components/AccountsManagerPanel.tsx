"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Check, X, Pencil, EyeOff, Eye } from "lucide-react";

interface Account {
  id: string;
  bank: string;
  account_number: string;
  display_name: string;
  is_active: boolean;
}

const BANK_LABELS: Record<string, string> = {
  leumi: "לאומי", hapoalim: "הפועלים", mizrahi: "מזרחי",
};

export function AccountsManagerPanel() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/finance/accounts");
      const data = await res.json();
      setAccounts(data.accounts ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaveName = useCallback(async (id: string) => {
    setSaving(true);
    try {
      await fetch("/api/finance/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, display_name: editName }),
      });
      setEditId(null);
      await load();
    } finally {
      setSaving(false);
    }
  }, [editName, load]);

  const handleToggleActive = useCallback(async (acc: Account) => {
    await fetch("/api/finance/accounts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: acc.id, is_active: !acc.is_active }),
    });
    await load();
  }, [load]);

  if (loading) return (
    <div className="flex items-center gap-2 text-gray-400 text-sm py-2 px-5">
      <Loader2 className="w-4 h-4 animate-spin" /><span>טוען חשבונות...</span>
    </div>
  );

  return (
    <div className="divide-y divide-gray-50">
      {accounts.length === 0 && (
        <p className="px-5 py-4 text-sm text-gray-400 italic">אין חשבונות בנק</p>
      )}
      {accounts.map((acc) => (
        <div key={acc.id} className={`flex items-center gap-3 px-5 py-3 ${!acc.is_active ? "opacity-50" : ""}`}>
          <div className="flex-1 min-w-0">
            {editId === acc.id ? (
              <div className="flex items-center gap-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(acc.id); }}
                  autoFocus
                  className="border border-blue-300 rounded px-2 py-0.5 text-sm focus:outline-none flex-1"
                />
                <button onClick={() => handleSaveName(acc.id)} disabled={saving}
                  className="text-green-600 hover:text-green-700">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-sm font-medium text-gray-700">{acc.display_name}</p>
            )}
            <p className="text-xs text-gray-400">
              {BANK_LABELS[acc.bank] ?? acc.bank} · {acc.account_number}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => { setEditId(acc.id); setEditName(acc.display_name); }}
              className="p-1.5 text-gray-300 hover:text-blue-500 transition-colors"
              title="ערוך שם"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleToggleActive(acc)}
              className={`p-1.5 transition-colors ${acc.is_active ? "text-gray-300 hover:text-orange-500" : "text-orange-400 hover:text-green-500"}`}
              title={acc.is_active ? "הסתר חשבון" : "הצג חשבון"}
            >
              {acc.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
