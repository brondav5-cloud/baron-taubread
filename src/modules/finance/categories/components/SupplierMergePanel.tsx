"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface MergeCandidate {
  a: { id: string; name: string };
  b: { id: string; name: string };
  score: number;
}

interface SupplierOption {
  id: string;
  master_name: string;
}

interface Props {
  onMerged?: () => void;
}

export function SupplierMergePanel({ onMerged }: Props) {
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<MergeCandidate[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [customSourceByPair, setCustomSourceByPair] = useState<Record<string, string>>({});
  const [customTargetByPair, setCustomTargetByPair] = useState<Record<string, string>>({});

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const [candidatesRes, suppliersRes] = await Promise.all([
        fetch("/api/finance/suppliers/merge-candidates"),
        fetch("/api/finance/suppliers?limit=300"),
      ]);
      const candidatesData = await candidatesRes.json().catch(() => ({}));
      const suppliersData = await suppliersRes.json().catch(() => ({}));
      if (!candidatesRes.ok) {
        setMessage((candidatesData as { error?: string }).error ?? "שגיאה בטעינת מועמדים");
        setCandidates([]);
        return;
      }
      if (!suppliersRes.ok) {
        setMessage((suppliersData as { error?: string }).error ?? "שגיאה בטעינת ספקים");
        setSuppliers([]);
      } else {
        setSuppliers((suppliersData as { suppliers?: SupplierOption[] }).suppliers ?? []);
        setMessage(null);
      }
      setCandidates((candidatesData as { candidates?: MergeCandidate[] }).candidates ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  const merge = useCallback(async (sourceId: string, targetId: string, sourceName: string, targetName: string) => {
    if (!confirm(`למזג את "${sourceName}" לתוך "${targetName}"?\nהשם המאסטר שיישמר יהיה: ${targetName}`)) return;
    const key = `${sourceId}->${targetId}`;
    setBusyKey(key);
    try {
      const res = await fetch("/api/finance/suppliers/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_supplier_id: sourceId, target_supplier_id: targetId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage((data as { error?: string }).error ?? "שגיאה במיזוג");
        return;
      }
      const m = (data as { merged?: { transactions: number; splits: number; target: string } }).merged;
      setMessage(`אוחד בהצלחה לתוך "${m?.target ?? targetName}" · תנועות: ${m?.transactions ?? 0} · פיצולים: ${m?.splits ?? 0}`);
      await loadCandidates();
      onMerged?.();
    } finally {
      setBusyKey(null);
    }
  }, [loadCandidates, onMerged]);

  const rejectCandidate = useCallback(async (aId: string, bId: string, aName: string, bName: string) => {
    if (!confirm(`לסרב להצעת המיזוג בין "${aName}" ל-"${bName}"?`)) return;
    const key = `reject:${aId}:${bId}`;
    setBusyKey(key);
    try {
      const res = await fetch("/api/finance/suppliers/merge-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          supplier_a_id: aId,
          supplier_b_id: bId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage((data as { error?: string }).error ?? "שגיאה בסירוב מיזוג");
        return;
      }
      setMessage(`סירבת למיזוג בין "${aName}" ל-"${bName}" והצעה זו לא תוצג שוב.`);
      await loadCandidates();
    } finally {
      setBusyKey(null);
    }
  }, [loadCandidates]);

  const mergeCustom = useCallback(async (pairKey: string, fallbackSourceId: string, fallbackTargetId: string) => {
    const sourceId = customSourceByPair[pairKey] ?? fallbackSourceId;
    const targetId = customTargetByPair[pairKey] ?? fallbackTargetId;
    if (!sourceId || !targetId || sourceId === targetId) {
      setMessage("בחר ספק מקור ויעד שונים למיזוג.");
      return;
    }
    const sourceName = suppliers.find((s) => s.id === sourceId)?.master_name ?? "ספק מקור";
    const targetName = suppliers.find((s) => s.id === targetId)?.master_name ?? "ספק יעד";
    await merge(sourceId, targetId, sourceName, targetName);
  }, [customSourceByPair, customTargetByPair, suppliers, merge]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">מיזוג ספקים דומים</h3>
          <p className="text-xs text-gray-500 mt-1">
            בחר כיוון מיזוג. בסיום, כל התנועות יעודכנו לשם המאסטר שנבחר.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { void loadCandidates(); }}
          disabled={loading}
          className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          רענן
        </button>
      </div>

      {message && (
        <div className="text-xs rounded-lg px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100">
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          טוען מועמדים...
        </div>
      ) : candidates.length === 0 ? (
        <p className="text-xs text-gray-400">אין כרגע מועמדים למיזוג.</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {candidates.map((c) => {
            const leftKey = `${c.b.id}->${c.a.id}`;
            const rightKey = `${c.a.id}->${c.b.id}`;
            const rejectKey = `reject:${c.a.id}:${c.b.id}`;
            const pairKey = `${c.a.id}:${c.b.id}`;
            const sourceId = customSourceByPair[pairKey] ?? c.b.id;
            const targetId = customTargetByPair[pairKey] ?? c.a.id;
            const isBusy = busyKey === leftKey || busyKey === rightKey || busyKey === rejectKey;
            const sourceOptions = [c.a, c.b];
            const targetOptions = suppliers.filter((s) => s.id !== sourceId);
            return (
              <div key={`${c.a.id}:${c.b.id}`} className="border border-gray-100 rounded-lg px-3 py-2 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-gray-700 truncate">{c.a.name}</span>
                  <span className="text-gray-400">⇄</span>
                  <span className="font-medium text-gray-700 truncate">{c.b.name}</span>
                </div>
                <div className="text-[11px] text-gray-500">
                  דמיון: {(c.score * 100).toFixed(0)}%
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => { void merge(c.b.id, c.a.id, c.b.name, c.a.name); }}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    מזג אל &quot;{c.a.name}&quot;
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => { void merge(c.a.id, c.b.id, c.a.name, c.b.name); }}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    מזג אל &quot;{c.b.name}&quot;
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => { void rejectCandidate(c.a.id, c.b.id, c.a.name, c.b.name); }}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    סרב מיזוג
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                  <select
                    value={sourceId}
                    disabled={isBusy}
                    onChange={(e) => {
                      const nextSource = e.target.value;
                      setCustomSourceByPair((prev) => ({ ...prev, [pairKey]: nextSource }));
                      setCustomTargetByPair((prev) => {
                        const currentTarget = prev[pairKey] ?? targetId;
                        if (currentTarget && currentTarget !== nextSource) return prev;
                        const fallback = suppliers.find((s) => s.id !== nextSource)?.id ?? "";
                        return { ...prev, [pairKey]: fallback };
                      });
                    }}
                    className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-50"
                    title="ספק מקור למיזוג"
                  >
                    {sourceOptions.map((s) => (
                      <option key={s.id} value={s.id}>{`מקור: ${s.name}`}</option>
                    ))}
                  </select>
                  <select
                    value={targetId}
                    disabled={isBusy}
                    onChange={(e) => {
                      setCustomTargetByPair((prev) => ({ ...prev, [pairKey]: e.target.value }));
                    }}
                    className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-50"
                    title="יעד מיזוג"
                  >
                    {targetOptions.map((s) => (
                      <option key={s.id} value={s.id}>{`יעד: ${s.master_name}`}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={isBusy || !targetId || sourceId === targetId}
                    onClick={() => { void mergeCustom(pairKey, c.b.id, c.a.id); }}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                  >
                    מזג לפי בחירה
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
