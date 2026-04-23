"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

interface SupplierItem {
  id: string;
  master_name: string;
}

interface SupplierAlias {
  id: string;
  alias_name: string;
  normalized_alias: string;
}

export function SupplierAliasManagerPanel() {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [supplierQuery, setSupplierQuery] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [aliases, setAliases] = useState<SupplierAlias[]>([]);
  const [newAlias, setNewAlias] = useState("");
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [loadingAliases, setLoadingAliases] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === selectedSupplierId) ?? null,
    [suppliers, selectedSupplierId]
  );

  const loadSuppliers = useCallback(async () => {
    setLoadingSuppliers(true);
    try {
      const q = supplierQuery.trim();
      const url = `/api/finance/suppliers?limit=200${q ? `&q=${encodeURIComponent(q)}` : ""}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage((data as { error?: string }).error ?? "שגיאה בטעינת ספקים");
        return;
      }
      const rows = (data as { suppliers?: SupplierItem[] }).suppliers ?? [];
      setSuppliers(rows);
      if (!selectedSupplierId && rows[0]) setSelectedSupplierId(rows[0].id);
      if (selectedSupplierId && !rows.some((r) => r.id === selectedSupplierId)) {
        setSelectedSupplierId(rows[0]?.id ?? "");
      }
    } finally {
      setLoadingSuppliers(false);
    }
  }, [supplierQuery, selectedSupplierId]);

  const loadAliases = useCallback(async (supplierId: string) => {
    if (!supplierId) {
      setAliases([]);
      return;
    }
    setLoadingAliases(true);
    try {
      const res = await fetch(`/api/finance/suppliers/aliases?supplier_id=${supplierId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage((data as { error?: string }).error ?? "שגיאה בטעינת aliases");
        return;
      }
      setAliases((data as { aliases?: SupplierAlias[] }).aliases ?? []);
    } finally {
      setLoadingAliases(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void loadSuppliers(); }, 220);
    return () => clearTimeout(timer);
  }, [loadSuppliers]);

  useEffect(() => {
    void loadAliases(selectedSupplierId);
  }, [selectedSupplierId, loadAliases]);

  const addAlias = useCallback(async () => {
    const alias = newAlias.trim();
    if (!selectedSupplierId || !alias) return;
    setBusy(true);
    try {
      const res = await fetch("/api/finance/suppliers/aliases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplier_id: selectedSupplierId, alias_name: alias }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage((data as { error?: string }).error ?? "שגיאה בהוספת alias");
        return;
      }
      setNewAlias("");
      setMessage("alias נוסף בהצלחה");
      await loadAliases(selectedSupplierId);
    } finally {
      setBusy(false);
    }
  }, [newAlias, selectedSupplierId, loadAliases]);

  const removeAlias = useCallback(async (id: string) => {
    if (!confirm("למחוק alias זה?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/finance/suppliers/aliases?id=${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage((data as { error?: string }).error ?? "שגיאה במחיקה");
        return;
      }
      setMessage("alias נמחק");
      await loadAliases(selectedSupplierId);
    } finally {
      setBusy(false);
    }
  }, [loadAliases, selectedSupplierId]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-800">ניהול שמות משניים (Aliases)</h3>
        <p className="text-xs text-gray-500 mt-1">
          קבע ידנית שמות חלופיים לספק קיים. בעת שמירה/ייבוא יישמר תמיד שם המאסטר.
        </p>
      </div>

      {message && (
        <div className="text-xs rounded-lg px-3 py-2 bg-blue-50 text-blue-700 border border-blue-100">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-3">
        <div className="space-y-2">
          <input
            value={supplierQuery}
            onChange={(e) => setSupplierQuery(e.target.value)}
            placeholder="חפש ספק מאסטר..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">בחר ספק</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.master_name}</option>
            ))}
          </select>
          {loadingSuppliers && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> טוען ספקים...
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              value={newAlias}
              onChange={(e) => setNewAlias(e.target.value)}
              placeholder={selectedSupplier ? `alias חדש עבור ${selectedSupplier.master_name}` : "alias חדש"}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button
              type="button"
              onClick={() => { void addAlias(); }}
              disabled={busy || !selectedSupplierId || !newAlias.trim()}
              className="text-xs px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              הוסף
            </button>
          </div>

          {loadingAliases ? (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> טוען aliases...
            </p>
          ) : aliases.length === 0 ? (
            <p className="text-xs text-gray-400">אין aliases לספק זה.</p>
          ) : (
            <div className="max-h-44 overflow-y-auto space-y-1">
              {aliases.map((a) => (
                <div key={a.id} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-md px-2 py-1.5">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-700 truncate">{a.alias_name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{a.normalized_alias}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { void removeAlias(a.id); }}
                    disabled={busy}
                    className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
