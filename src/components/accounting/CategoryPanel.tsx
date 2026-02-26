"use client";

import { useMemo } from "react";
import { X, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { YearlyPnl, DbCustomGroup, DbAccount, DbAccountClassificationOverride } from "@/types/accounting";

interface Props {
  groupId: string | null;
  yearlyPnl: YearlyPnl | null;
  prevYearlyPnl: YearlyPnl | null;
  customGroups: DbCustomGroup[];
  accounts: DbAccount[];
  classificationOverrides: DbAccountClassificationOverride[];
  onClose: () => void;
  onAccountClick: (accountId: string) => void;
}

const MONTH_SHORT = ["ינו","פבר","מרץ","אפר","מאי","יוני","יולי","אוג","ספט","אוק","נוב","דצמ"];

function fmtC(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1_000_000) return `₪${(val / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `₪${(val / 1_000).toFixed(0)}K`;
  if (abs >= 1_000) return `₪${(val / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(val);
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0 || curr === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

export default function CategoryPanel({
  groupId, yearlyPnl, prevYearlyPnl, customGroups, accounts,
  classificationOverrides, onClose, onAccountClick,
}: Props) {
  const group = customGroups.find((g) => g.id === groupId);
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const overrideGroupMap = useMemo(() => {
    const m = new Map<string, string>(); // accountId → groupId
    for (const co of classificationOverrides) m.set(co.account_id, co.custom_group_id);
    return m;
  }, [classificationOverrides]);

  // All accountIds in this group (by current P&L data)
  const accountIds = useMemo(() => {
    if (!yearlyPnl || !groupId) return [];
    const idsSet = new Set<string>();
    for (const md of yearlyPnl.months) {
      md.byAccount.forEach((_, id) => idsSet.add(id));
    }
    const ids = Array.from(idsSet);
    // Filter: only accounts whose effective group is this group
    const result: string[] = [];
    for (const id of ids) {
      const total = yearlyPnl.total.byAccount.get(id) ?? 0;
      if (total <= 0) continue;
      // Check if this account is assigned to this group via override or group_code
      const overrideGid = overrideGroupMap.get(id);
      const account = accountById.get(id);
      if (!account) continue;
      if (overrideGid) {
        if (overrideGid === groupId) result.push(id);
      } else if (group) {
        const gc = account.latest_group_code ?? "";
        if (group.group_codes.includes(gc)) result.push(id);
      }
    }
    return result;
  }, [yearlyPnl, groupId, group, accountById, overrideGroupMap]);

  // Monthly bar chart data for this group
  const barData = useMemo(() => {
    if (!yearlyPnl || !groupId) return [];
    return yearlyPnl.months.map((md, i) => ({
      month: MONTH_SHORT[i],
      sums: md.byGroup.get(groupId) ?? 0,
    }));
  }, [yearlyPnl, groupId]);

  // Account rows with YoY change
  const accountRows = useMemo(() => {
    if (!yearlyPnl || !groupId) return [];
    const groupTotal = yearlyPnl.total.byGroup.get(groupId) ?? 0;

    return accountIds
      .map((id) => {
        const account = accountById.get(id);
        const curr = yearlyPnl.total.byAccount.get(id) ?? 0;
        const prev = prevYearlyPnl?.total.byAccount.get(id) ?? 0;
        const yoy = pctChange(curr, prev);
        const hasOverride = overrideGroupMap.has(id);
        return {
          id,
          code: account?.code ?? "?",
          name: account?.name ?? id,
          curr,
          prev,
          yoy,
          pctOfGroup: groupTotal > 0 ? (curr / groupTotal) * 100 : 0,
          hasOverride,
        };
      })
      .sort((a, b) => b.curr - a.curr);
  }, [yearlyPnl, prevYearlyPnl, groupId, accountIds, accountById, overrideGroupMap]);

  if (!groupId || !group || !yearlyPnl) return null;

  const groupTotal = yearlyPnl.total.byGroup.get(groupId) ?? 0;
  const revenue = yearlyPnl.total.revenue;
  const pctOfRevenue = revenue > 0 ? (groupTotal / revenue) * 100 : 0;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 left-0 h-full w-full max-w-[520px] bg-white z-50 shadow-2xl flex flex-col overflow-hidden animate-slide-in-left">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: group.color }} />
              <h2 className="text-base font-bold text-gray-900">{group.name}</h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {fmtC(groupTotal)} · {pctOfRevenue.toFixed(1)}% מההכנסות
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Bar chart */}
          <div>
            <h3 className="text-xs font-semibold text-gray-600 mb-3">טרנד חודשי</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={barData} margin={{ top: 0, right: 0, bottom: 0, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                <YAxis
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
                  tick={{ fontSize: 9, fill: "#9CA3AF" }}
                  width={40}
                />
                <Tooltip
                  formatter={(v: number) => [fmtC(v), group.name]}
                  labelStyle={{ fontFamily: "inherit", fontSize: 11 }}
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E5E7EB" }}
                />
                <Bar dataKey="sums" fill={group.color} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Accounts table */}
          <div>
            <h3 className="text-xs font-semibold text-gray-600 mb-3">
              פירוט חשבונות ({accountRows.length})
            </h3>
            {accountRows.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">אין חשבונות</p>
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-[10px] text-gray-400 font-medium px-3 pb-1">
                  <span>שם חשבון</span>
                  <span className="text-left">סכום</span>
                  <span className="text-left">%</span>
                  <span className="text-left">YoY</span>
                </div>
                {accountRows.map((row) => (
                  <button
                    key={row.id}
                    onClick={() => onAccountClick(row.id)}
                    className="w-full grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center bg-gray-50 hover:bg-blue-50 rounded-xl px-3 py-2.5 text-xs transition-colors text-right"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 truncate">
                        {row.name}
                        {row.hasOverride && (
                          <span className="mr-1 text-[9px] bg-amber-100 text-amber-700 px-1 rounded">מועבר</span>
                        )}
                      </p>
                      <p className="text-[10px] text-gray-400">{row.code}</p>
                    </div>
                    <span className="font-semibold text-gray-900 tabular-nums">{fmtC(row.curr)}</span>
                    <span className="text-gray-500 tabular-nums">{row.pctOfGroup.toFixed(1)}%</span>
                    <span className={clsx(
                      "tabular-nums font-bold text-[10px] px-1.5 py-0.5 rounded-md",
                      row.yoy === null ? "text-gray-300" :
                      row.yoy > 30 ? "bg-red-100 text-red-700" :
                      row.yoy > 0 ? "bg-amber-50 text-amber-700" :
                      "bg-green-50 text-green-700",
                    )}>
                      {row.yoy === null ? "—" : (
                        <>
                          {row.yoy > 0 ? "▲" : "▼"}
                          {Math.abs(row.yoy).toFixed(1)}%
                          {Math.abs(row.yoy) > 30 && (
                            <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" />
                          )}
                        </>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Legend */}
          <p className="text-[10px] text-gray-400">
            ⚠️ YoY = שינוי שנתי · מעל 30% מסומן · לחץ על חשבון לצפייה בתנועות בודדות
          </p>
        </div>
      </div>
    </>
  );
}
