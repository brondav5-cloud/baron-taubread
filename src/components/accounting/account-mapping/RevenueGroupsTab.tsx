"use client";

import { useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";

interface RevenueGroupsTabProps {
  groupCodes: string[];
  onRefetch: () => Promise<void>;
}

export function RevenueGroupsTab({ groupCodes, onRefetch }: RevenueGroupsTabProps) {
  const [newCode, setNewCode] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const handleAdd = async () => {
    const code = newCode.trim();
    if (!code) return;
    setAdding(true);
    try {
      const res = await fetch("/api/accounting/revenue-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_code: code }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "שגיאה");
      }
      setNewCode("");
      await onRefetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (code: string) => {
    setRemoving(code);
    try {
      const res = await fetch(`/api/accounting/revenue-groups?group_code=${encodeURIComponent(code)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "שגיאה");
      }
      await onRefetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        סמן קוד קבוצה (group_code) כהכנסה. לדוגמה: 600, 601, 700. קודים שמתחילים ב־6 לרוב הכנסות.
      </p>
      <div className="flex gap-2 items-center flex-wrap">
        <input
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          placeholder="קוד קבוצה (לדוגמה 600)"
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl w-36"
          onKeyDown={(e) => e.key === "Enter" && void handleAdd()}
        />
        <button
          onClick={() => void handleAdd()}
          disabled={adding || !newCode.trim()}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          הוסף
        </button>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {groupCodes.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            אין קבוצות הכנסה מסומנות. הוסף קודים כדי לסמן אותם כהכנסות.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {groupCodes.map((code) => (
              <li key={code} className="flex items-center justify-between py-2 px-4 hover:bg-gray-50">
                <span className="font-mono text-sm">{code}</span>
                <button
                  onClick={() => void handleRemove(code)}
                  disabled={removing === code}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                  title="הסר"
                >
                  {removing === code ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
          {groupCodes.length} קבוצות הכנסה
        </div>
      </div>
    </div>
  );
}
