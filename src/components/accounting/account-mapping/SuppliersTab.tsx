"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { clsx } from "clsx";
import type { DbAccount } from "@/types/accounting";
import type { VirtualGroup } from "@/hooks/accountingCalc";
import type { AccountTransaction } from "./shared";

interface SuppliersTabProps {
  accounts: DbAccount[];
  customGroups: VirtualGroup[];
  transactions: AccountTransaction[];
}

export function SuppliersTab({
  accounts, customGroups, transactions,
}: SuppliersTabProps) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "expenses" | "revenue">("all");
  const [sortBy, setSortBy] = useState<"code" | "name" | "amount">("amount");

  const gcToGroup = useMemo(() => {
    const map = new Map<string, VirtualGroup>();
    for (const g of customGroups) {
      map.set(g.id, g);
    }
    return map;
  }, [customGroups]);

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

  const filtered = useMemo(() => {
    let list = [...accounts];
    if (filterType === "expenses") list = list.filter(a => a.account_type === "expense");
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
  }, [accounts, filterType, search, sortBy, accountStats]);

  const fmtAmt = (v: number) => {
    if (v === 0) return "—";
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 10_000) return `${(v / 1_000).toFixed(0)}K`;
    return `${Math.round(v).toLocaleString()}`;
  };

  const statsTotal = {
    all: accounts.length,
    expenses: accounts.filter(a => a.account_type === "expense").length,
    revenue: accounts.filter(a => a.account_type === "revenue").length,
  };

  return (
    <div className="space-y-4">
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
        <select value={sortBy} onChange={e => setSortBy(e.target.value as "code" | "name" | "amount")}
          className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-primary-300">
          <option value="amount">מיין לפי סכום</option>
          <option value="code">מיין לפי מפתח</option>
          <option value="name">מיין לפי שם</option>
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto" dir="rtl">
          <table className="text-[11px] border-collapse" style={{ minWidth: `${420 + allYears.length * 80}px` }}>
            <thead>
              <tr className="bg-gradient-to-l from-slate-700 to-slate-800 text-white">
                <th className="text-right py-3 px-4 font-semibold sticky right-0 bg-slate-800 z-20 min-w-[60px] cursor-pointer hover:bg-slate-700" onClick={() => setSortBy("code")}>
                  מפתח {sortBy === "code" && "▾"}
                </th>
                <th className="text-right py-3 px-4 font-semibold min-w-[200px] cursor-pointer hover:bg-slate-700" onClick={() => setSortBy("name")}>
                  שם חשבון {sortBy === "name" && "▾"}
                </th>
                <th className="text-center py-3 px-3 font-semibold min-w-[80px] cursor-pointer hover:bg-slate-700" onClick={() => setSortBy("amount")}>
                  סה&quot;כ {sortBy === "amount" && "▾"}
                </th>
                <th className="text-right py-3 px-4 font-semibold min-w-[120px]">מפתח סיווג</th>
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
                const yearData = accountStats.yearData.get(acct.id);
                const total = accountStats.amountMap.get(acct.id) ?? 0;
                const isRevenue = acct.account_type === "revenue";
                const mainGc = acct.latest_group_code || (yearData && Array.from(yearData.values()).flatMap(s => Array.from(s))[0]) || "—";

                return (
                  <tr key={acct.id} className={clsx("border-b border-gray-50 hover:bg-gray-50/60 transition-colors", isRevenue && "bg-teal-50/20")}>
                    <td className="py-2 px-4 sticky right-0 bg-white z-10 shadow-[inset_-1px_0_0_#f3f4f6]" style={{ background: isRevenue ? "rgb(240,253,250,0.8)" : undefined }}>
                      <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono text-[10px]">{acct.code}</code>
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-gray-800 text-[12px]">{acct.name}</span>
                        {isRevenue && <span className="text-[9px] bg-teal-100 text-teal-700 px-1 py-0.5 rounded font-bold">הכנסה</span>}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center tabular-nums font-mono text-[11px] text-gray-700">{fmtAmt(total)}</td>
                    <td className="py-2 px-3">
                      {isRevenue ? (
                        <span className="text-teal-600 text-[11px] font-medium">— הכנסות</span>
                      ) : (
                        <span className="text-[11px] font-mono bg-gray-100 px-1.5 py-0.5 rounded">{mainGc}</span>
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
                                    {g && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: g.parent_section === "cost_of_goods" ? "#EF4444" : g.parent_section === "operating" ? "#F97316" : "#6B7280" }} />}
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
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
          מציג {filtered.length} מתוך {accounts.length} חשבונות · סיווג נקבע בהעלאת הקובץ
        </div>
      </div>
    </div>
  );
}
