"use client";

import { useState, useMemo, useCallback } from "react";
import { Search, Check } from "lucide-react";
import { clsx } from "clsx";
import type {
  DbAccount, DbCustomGroup, DbAccountClassificationOverride,
} from "@/types/accounting";
import type { AccountTransaction } from "./shared";
import { GroupSelectCell } from "./GroupSelectCell";

interface SuppliersTabProps {
  accounts: DbAccount[];
  customGroups: DbCustomGroup[];
  classificationOverrides: DbAccountClassificationOverride[];
  transactions: AccountTransaction[];
  onBatchSave: (changes: Array<{ accountId: string; groupId: string | null }>) => Promise<boolean>;
}

export function SuppliersTab({
  accounts, customGroups, classificationOverrides, transactions, onBatchSave,
}: SuppliersTabProps) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "expenses" | "unclassified" | "revenue">("all");
  const [saving, setSaving] = useState(false);
  const [autoMapped, setAutoMapped] = useState(0);
  const [pending, setPending] = useState<Map<string, string | null>>(new Map());
  const [sortBy, setSortBy] = useState<"code" | "name" | "amount">("amount");

  const gcToGroup = useMemo(() => {
    const map = new Map<string, DbCustomGroup>();
    for (const g of customGroups) {
      for (const gc of g.group_codes) {
        if (!map.has(gc)) map.set(gc, g);
      }
    }
    return map;
  }, [customGroups]);

  const acToGroup = useMemo(() => {
    const map = new Map<string, DbCustomGroup>();
    for (const g of customGroups) {
      for (const ac of (g.account_codes ?? [])) {
        if (!map.has(ac)) map.set(ac, g);
      }
    }
    return map;
  }, [customGroups]);

  const overrideMap = useMemo(() =>
    new Map(classificationOverrides.map(o => [o.account_id, o])),
    [classificationOverrides],
  );

  const groupMap = useMemo(() => new Map(customGroups.map(g => [g.id, g])), [customGroups]);

  const accountStats = useMemo(() => {
    const amountMap = new Map<string, number>();
    const yearData = new Map<string, Map<number, Set<string>>>();
    for (const tx of transactions) {
      const amt = (tx.debit ?? 0) - (tx.credit ?? 0);
      amountMap.set(tx.account_id, (amountMap.get(tx.account_id) ?? 0) + Math.abs(amt));
      const year = new Date(tx.transaction_date).getFullYear();
      if (!yearData.has(tx.account_id)) yearData.set(tx.account_id, new Map());
      const ym = yearData.get(tx.account_id)!;
      if (!ym.has(year)) ym.set(year, new Set());
      ym.get(year)!.add(tx.group_code);
    }
    return { amountMap, yearData };
  }, [transactions]);

  const allYears = useMemo(() => {
    const years = new Set<number>();
    for (const ym of Array.from(accountStats.yearData.values())) ym.forEach((_, y) => years.add(y));
    return Array.from(years).sort((a, b) => b - a);
  }, [accountStats]);

  const getDisplayGroup = useCallback((acct: DbAccount): DbCustomGroup | null => {
    if (pending.has(acct.id)) {
      const pgid = pending.get(acct.id);
      return pgid ? (groupMap.get(pgid) ?? null) : null;
    }
    const ovr = overrideMap.get(acct.id);
    if (ovr) return groupMap.get(ovr.custom_group_id) ?? null;
    const byCode = acToGroup.get(acct.code);
    if (byCode) return byCode;
    return gcToGroup.get(acct.latest_group_code ?? "") ?? null;
  }, [pending, groupMap, overrideMap, acToGroup, gcToGroup]);

  const filtered = useMemo(() => {
    let list = [...accounts];
    if (filterType === "expenses") list = list.filter(a => a.account_type === "expense");
    else if (filterType === "unclassified") list = list.filter(a => a.account_type === "expense" && !getDisplayGroup(a));
    else if (filterType === "revenue") list = list.filter(a => a.account_type === "revenue");
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(a => a.name.toLowerCase().includes(q) || a.code.includes(q));
    }
    list.sort((a, b) => {
      if (sortBy === "amount") return (accountStats.amountMap.get(b.id) ?? 0) - (accountStats.amountMap.get(a.id) ?? 0);
      if (sortBy === "name") return a.name.localeCompare(b.name, "he");
      return a.code.localeCompare(b.code, undefined, { numeric: true });
    });
    return list;
  }, [accounts, filterType, search, sortBy, accountStats, getDisplayGroup]);

  const handleBatchSave = async () => {
    if (pending.size === 0) return;
    setSaving(true);
    const changes = Array.from(pending.entries()).map(([accountId, groupId]) => ({ accountId, groupId }));
    const ok = await onBatchSave(changes);
    if (ok) setPending(new Map());
    setSaving(false);
  };

  const handleAutoMap = async () => {
    const toMap: Array<{ accountId: string; groupId: string | null }> = [];
    for (const acct of accounts) {
      if (acct.account_type !== "expense") continue;
      if (overrideMap.has(acct.id)) continue;
      const g = gcToGroup.get(acct.latest_group_code ?? "");
      if (!g) continue;
      const currentG = getDisplayGroup(acct);
      if (currentG?.id === g.id) continue;
      toMap.push({ accountId: acct.id, groupId: g.id });
    }
    if (toMap.length === 0) { alert("אין חשבונות לסיווג אוטומטי"); return; }
    setSaving(true);
    const ok = await onBatchSave(toMap);
    if (ok) setAutoMapped(toMap.length);
    setSaving(false);
  };

  const fmtAmt = (v: number) => {
    if (v === 0) return "—";
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 10_000) return `${(v / 1_000).toFixed(0)}K`;
    return `${Math.round(v).toLocaleString()}`;
  };

  const statsTotal = {
    all: accounts.length,
    expenses: accounts.filter(a => a.account_type === "expense").length,
    unclassified: accounts.filter(a => a.account_type === "expense" && !getDisplayGroup(a)).length,
    revenue: accounts.filter(a => a.account_type === "revenue").length,
  };

  return (
    <div className="space-y-4">
      {pending.size > 0 && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2 text-amber-800 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            {pending.size} שינוי{pending.size > 1 ? "ים" : ""} ממתינ{pending.size > 1 ? "ים" : ""} — טרם נשמרו
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPending(new Map())} disabled={saving}
              className="px-3 py-1.5 text-xs text-amber-700 border border-amber-300 rounded-xl hover:bg-amber-100 transition-colors">
              בטל
            </button>
            <button onClick={() => void handleBatchSave()} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-60">
              {saving ? "שומר..." : <><Check className="w-3.5 h-3.5" /> שמור {pending.size} שינויים</>}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="חיפוש שם / מפתח..."
              className="pr-9 pl-4 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-primary-300 w-52" />
          </div>
          {([
            { id: "all", label: `הכל (${statsTotal.all})` },
            { id: "expenses", label: `הוצאות (${statsTotal.expenses})` },
            { id: "unclassified", label: `ללא שיוך (${statsTotal.unclassified})` },
            { id: "revenue", label: `הכנסות (${statsTotal.revenue})` },
          ] as const).map(f => (
            <button key={f.id} onClick={() => setFilterType(f.id)}
              className={clsx("px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors",
                filterType === f.id ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-600 border-gray-200 hover:border-primary-300",
              )}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select value={sortBy} onChange={e => setSortBy(e.target.value as "code" | "name" | "amount")}
            className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-primary-300">
            <option value="amount">מיין לפי סכום</option>
            <option value="code">מיין לפי מפתח</option>
            <option value="name">מיין לפי שם</option>
          </select>
          <button onClick={() => void handleAutoMap()} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            {saving ? "ממפה..." : "⚡ מיפוי אוטומטי"}
          </button>
        </div>
      </div>

      {autoMapped > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-xs text-emerald-800 font-medium">
          ✅ {autoMapped} חשבונות מופו אוטומטית
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto" dir="rtl">
          <table className="text-[11px] border-collapse" style={{ minWidth: `${560 + allYears.length * 80}px` }}>
            <thead>
              <tr className="bg-gradient-to-l from-slate-700 to-slate-800 text-white">
                <th className="text-right py-3 px-4 font-semibold sticky right-0 bg-slate-800 z-20 min-w-[60px] shadow-[inset_-1px_0_0_#475569] cursor-pointer hover:bg-slate-700"
                  onClick={() => setSortBy("code")}>
                  מפתח {sortBy === "code" && "▾"}
                </th>
                <th className="text-right py-3 px-4 font-semibold min-w-[200px] cursor-pointer hover:bg-slate-700"
                  onClick={() => setSortBy("name")}>
                  שם חשבון {sortBy === "name" && "▾"}
                </th>
                <th className="text-center py-3 px-3 font-semibold min-w-[80px] cursor-pointer hover:bg-slate-700"
                  onClick={() => setSortBy("amount")}>
                  סה&quot;כ {sortBy === "amount" && "▾"}
                </th>
                <th className="text-right py-3 px-4 font-semibold min-w-[200px]">סיווג</th>
                {allYears.map(yr => (
                  <th key={yr} className="text-center py-3 px-3 font-semibold min-w-[80px]">{yr}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4 + allYears.length} className="py-12 text-center text-gray-400">לא נמצאו חשבונות</td>
                </tr>
              ) : filtered.map(acct => {
                const currentGroup = getDisplayGroup(acct);
                const override = overrideMap.get(acct.id);
                const isPending = pending.has(acct.id);
                const yearData = accountStats.yearData.get(acct.id);
                const total = accountStats.amountMap.get(acct.id) ?? 0;
                const isRevenue = acct.account_type === "revenue";

                return (
                  <tr key={acct.id} className={clsx("border-b border-gray-50 hover:bg-gray-50/60 transition-colors",
                    !currentGroup && !isRevenue && "bg-red-50/20",
                    isPending && "bg-amber-50/30",
                    !!override && !isPending && "bg-amber-50/10",
                    isRevenue && "bg-teal-50/20",
                  )}>
                    <td className="py-2 px-4 sticky right-0 bg-white z-10 shadow-[inset_-1px_0_0_#f3f4f6]"
                      style={{ background: isPending ? "rgb(255,251,235,0.8)" : isRevenue ? "rgb(240,253,250,0.8)" : undefined }}>
                      <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono text-[10px]">
                        {acct.code}
                      </code>
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-gray-800 text-[12px]">{acct.name}</span>
                        {isRevenue && <span className="text-[9px] bg-teal-100 text-teal-700 px-1 py-0.5 rounded font-bold">הכנסה</span>}
                        {isPending && <span className="text-[9px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded font-bold">✎ ממתין</span>}
                        {override && !isPending && <span className="text-[9px] bg-amber-100 text-amber-600 px-1 py-0.5 rounded font-bold">override</span>}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center tabular-nums font-mono text-[11px] text-gray-700">
                      {fmtAmt(total)}
                    </td>
                    <td className="py-2 px-3">
                      {isRevenue ? (
                        <span className="text-teal-600 text-[11px] font-medium">— הכנסות —</span>
                      ) : (
                        <GroupSelectCell
                          customGroups={customGroups}
                          currentGroup={currentGroup}
                          override={isPending ? { account_id: acct.id, custom_group_id: "" } as DbAccountClassificationOverride : override}
                          saving={false}
                          onSave={async gId => {
                            setPending(prev => { const m = new Map(prev); m.set(acct.id, gId); return m; });
                          }}
                          onDelete={async () => {
                            setPending(prev => {
                              const m = new Map(prev);
                              if (override) { m.set(acct.id, null); } else { m.delete(acct.id); }
                              return m;
                            });
                          }}
                        />
                      )}
                    </td>
                    {allYears.map(yr => {
                      const gcSet = yearData?.get(yr);
                      const gcs = gcSet ? Array.from(gcSet) : [];
                      return (
                        <td key={yr} className="py-2 px-3 text-center">
                          {gcs.length > 0 ? (
                            <div className="flex flex-col gap-0.5 items-center">
                              {gcs.slice(0, 2).map(gc => {
                                const g = gcToGroup.get(gc);
                                return (
                                  <span key={gc} className="inline-flex items-center gap-1 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                                    {g ? <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: g.color }} /> : null}
                                    {gc}
                                  </span>
                                );
                              })}
                              {gcs.length > 2 && <span className="text-[9px] text-gray-400">+{gcs.length - 2}</span>}
                            </div>
                          ) : <span className="text-gray-200">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span>מציג {filtered.length} מתוך {accounts.length} חשבונות</span>
          <div className="flex items-center gap-3">
            <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-300 mr-1" />שינוי ממתין</span>
            <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-teal-200 mr-1" />הכנסות</span>
            <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-200 mr-1" />ללא הגדרה</span>
          </div>
        </div>
      </div>
    </div>
  );
}
