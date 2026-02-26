"use client";

import { useMemo, useState } from "react";
import { X, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { clsx } from "clsx";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import type { DbTransaction, DbAccount, DbCounterAccountName } from "@/types/accounting";

interface Props {
  account: DbAccount;
  transactions: DbTransaction[];
  counterNames: DbCounterAccountName[];
  years: number[];
  initialYear?: number;
  onClose: () => void;
}

const MONTH_LABELS = ["ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני", "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳"];

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

function fmtFull(n: number) {
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function calcMonthlyTotals(txs: DbTransaction[], year: number) {
  const months = Array.from({ length: 12 }, () => 0);
  for (const tx of txs) {
    const d = new Date(tx.transaction_date);
    if (d.getFullYear() !== year) continue;
    const m = d.getMonth();
    const amount = (tx.debit - tx.credit);
    months[m] = (months[m] ?? 0) + amount;
  }
  return months;
}

export default function AccountDetailPanel({ account, transactions, counterNames, years, initialYear, onClose }: Props) {
  const [selectedYear, setSelectedYear] = useState(initialYear ?? years[0] ?? new Date().getFullYear());
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const counterNameMap = useMemo(
    () => new Map(counterNames.map((c) => [c.counter_account_code, c.display_name])),
    [counterNames],
  );

  // Transactions for this account across all years
  const accountTxs = useMemo(
    () => transactions.filter((t) => t.account_id === account.id),
    [transactions, account.id],
  );

  // Per-year summary
  const yearSummary = useMemo(() => {
    return years.map((yr) => {
      const ytxs = accountTxs.filter((t) => new Date(t.transaction_date).getFullYear() === yr);
      const total = ytxs.reduce((s, t) => s + (t.debit - t.credit), 0);
      const count = ytxs.length;
      return { year: yr, total, count };
    });
  }, [accountTxs, years]);

  // Monthly totals for selected year
  const monthlyTotals = useMemo(
    () => calcMonthlyTotals(accountTxs, selectedYear),
    [accountTxs, selectedYear],
  );

  const yearTotal = monthlyTotals.reduce((s, v) => s + v, 0);

  // Transactions for selected year, optionally filtered by month
  const yearTxs = useMemo(() => {
    let txs = accountTxs.filter((t) => new Date(t.transaction_date).getFullYear() === selectedYear);
    if (expandedMonth !== null) {
      txs = txs.filter((t) => new Date(t.transaction_date).getMonth() === expandedMonth);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      txs = txs.filter(
        (t) =>
          (t.description ?? "").toLowerCase().includes(q) ||
          (t.counter_account ?? "").toLowerCase().includes(q) ||
          (counterNameMap.get(t.counter_account ?? "") ?? "").toLowerCase().includes(q),
      );
    }
    return txs.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
  }, [accountTxs, selectedYear, expandedMonth, search, counterNameMap]);

  const chartData = MONTH_LABELS.map((label, i) => ({
    label,
    value: monthlyTotals[i] ?? 0,
  }));

  const maxMonth = Math.max(...monthlyTotals);
  const avgMonth = yearTotal / (monthlyTotals.filter((v) => v > 0).length || 1);

  // Trend arrow vs previous year
  const prevYearSummary = yearSummary.find((y) => y.year === selectedYear - 1);
  const currentYearSummary = yearSummary.find((y) => y.year === selectedYear);
  const trendPct =
    prevYearSummary && prevYearSummary.total > 0
      ? ((currentYearSummary?.total ?? 0) - prevYearSummary.total) / prevYearSummary.total * 100
      : null;

  return (
    <div className="fixed inset-0 z-50 flex" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative mr-auto ml-0 w-full max-w-3xl bg-white shadow-2xl overflow-y-auto flex flex-col"
        style={{ maxHeight: "100vh" }}>

        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-l from-slate-800 to-slate-900 text-white px-6 py-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <code className="bg-white/20 text-white px-2 py-0.5 rounded text-xs font-mono">{account.code}</code>
              <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-bold",
                account.account_type === "revenue" ? "bg-emerald-500/30 text-emerald-200" : "bg-blue-500/30 text-blue-200",
              )}>
                {account.account_type === "revenue" ? "הכנסות" : "הוצאות"}
              </span>
            </div>
            <h2 className="text-xl font-bold">{account.name}</h2>
            <p className="text-slate-400 text-sm mt-0.5">{accountTxs.length} תנועות בסך הכל</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Year selector + summary strip */}
        <div className="bg-slate-50 border-b border-gray-200 px-6 py-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">שנה:</span>
              <div className="flex gap-1">
                {years.map((yr) => (
                  <button
                    key={yr}
                    onClick={() => { setSelectedYear(yr); setExpandedMonth(null); }}
                    className={clsx("px-3 py-1 rounded-lg text-xs font-semibold transition-colors",
                      selectedYear === yr ? "bg-slate-800 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-slate-400",
                    )}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            {/* Trend */}
            {trendPct !== null && (
              <div className={clsx("flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg",
                trendPct > 5 ? "bg-red-50 text-red-700" : trendPct < -5 ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600",
              )}>
                {trendPct > 5 ? <TrendingUp className="w-3.5 h-3.5" /> : trendPct < -5 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                {trendPct > 0 ? "+" : ""}{trendPct.toFixed(1)}% לעומת {selectedYear - 1}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 p-6 space-y-6">

          {/* KPI cards */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "סה״כ שנה", value: fmtFull(yearTotal), sub: `${yearTxs.length} תנועות` },
              { label: "ממוצע חודשי", value: fmtFull(avgMonth), sub: "לחודשים פעילים" },
              { label: "חודש מקסימום", value: fmtFull(maxMonth), sub: MONTH_LABELS[monthlyTotals.indexOf(maxMonth)] ?? "" },
              {
                label: "שינוי שנתי",
                value: trendPct !== null ? `${trendPct > 0 ? "+" : ""}${trendPct.toFixed(1)}%` : "—",
                sub: trendPct !== null ? `vs ${selectedYear - 1}` : "אין נתון קודם",
              },
            ].map((k) => (
              <div key={k.label} className="bg-white border border-gray-200 rounded-2xl p-3 text-center">
                <p className="text-xs text-gray-500 mb-0.5">{k.label}</p>
                <p className="text-lg font-bold text-gray-900 tabular-nums leading-tight">{k.value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Multi-year comparison bar */}
          {years.length > 1 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-gray-700 mb-3">השוואה שנתית</h3>
              <div className="flex items-end gap-3 h-16">
                {yearSummary.map(({ year: yr, total }) => {
                  const maxVal = Math.max(...yearSummary.map((y) => Math.abs(y.total)));
                  const height = maxVal > 0 ? (Math.abs(total) / maxVal) * 100 : 0;
                  return (
                    <div key={yr} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] text-gray-500 tabular-nums">{fmt(total)}</span>
                      <div
                        className={clsx("w-full rounded-t-sm transition-all",
                          yr === selectedYear ? "bg-slate-700" : "bg-slate-300",
                        )}
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                      <span className={clsx("text-[10px] font-semibold", yr === selectedYear ? "text-slate-800" : "text-gray-400")}>{yr}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Monthly chart */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-700">פילוח חודשי — {selectedYear}</h3>
              {expandedMonth !== null && (
                <button
                  onClick={() => setExpandedMonth(null)}
                  className="text-[10px] text-primary-600 hover:underline"
                >
                  הצג כל החודשים
                </button>
              )}
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(v: number) => [fmtFull(v), "סכום"]}
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} cursor="pointer"
                  onClick={(_, index) => setExpandedMonth(expandedMonth === index ? null : index)}>
                  {chartData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={expandedMonth === i ? "#1e293b" : (chartData[i]?.value ?? 0) > 0 ? "#64748b" : "#e5e7eb"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-gray-400 text-center mt-1">לחץ על עמודה לסינון עסקאות</p>
          </div>

          {/* Transactions list */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
              <h3 className="text-xs font-bold text-gray-700">
                עסקאות{expandedMonth !== null ? ` — ${MONTH_LABELS[expandedMonth]}` : ""} ({yearTxs.length})
              </h3>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש תיאור / חשבון נגדי..."
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-primary-300 w-52"
              />
            </div>

            <div className="overflow-x-auto" dir="rtl">
              <table className="text-[11px] w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-right py-2.5 px-4 font-semibold text-gray-600">תאריך</th>
                    <th className="text-right py-2.5 px-4 font-semibold text-gray-600">תיאור</th>
                    <th className="text-right py-2.5 px-4 font-semibold text-gray-600">חשבון נגדי</th>
                    <th className="text-right py-2.5 px-4 font-semibold text-gray-600">חובה</th>
                    <th className="text-right py-2.5 px-4 font-semibold text-gray-600">זכות</th>
                    <th className="text-right py-2.5 px-4 font-semibold text-gray-600">סכום נטו</th>
                  </tr>
                </thead>
                <tbody>
                  {yearTxs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-gray-400">
                        <div className="text-2xl mb-1">📋</div>
                        <p>לא נמצאו עסקאות</p>
                      </td>
                    </tr>
                  ) : (
                    yearTxs.slice(0, 200).map((tx) => {
                      const net = tx.debit - tx.credit;
                      const counterName = counterNameMap.get(tx.counter_account ?? "") ?? tx.counter_account;
                      return (
                        <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                          <td className="py-2 px-4 tabular-nums text-gray-500">{fmtDate(tx.transaction_date)}</td>
                          <td className="py-2 px-4 text-gray-800 max-w-[200px] truncate">{tx.description ?? "—"}</td>
                          <td className="py-2 px-4 text-gray-600 max-w-[140px] truncate">{counterName ?? "—"}</td>
                          <td className={clsx("py-2 px-4 tabular-nums", tx.debit > 0 ? "text-red-600" : "text-gray-300")}>
                            {tx.debit > 0 ? fmtFull(tx.debit) : "—"}
                          </td>
                          <td className={clsx("py-2 px-4 tabular-nums", tx.credit > 0 ? "text-emerald-600" : "text-gray-300")}>
                            {tx.credit > 0 ? fmtFull(tx.credit) : "—"}
                          </td>
                          <td className={clsx("py-2 px-4 tabular-nums font-semibold", net > 0 ? "text-red-600" : net < 0 ? "text-emerald-600" : "text-gray-400")}>
                            {net !== 0 ? fmtFull(Math.abs(net)) : "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              {yearTxs.length > 200 && (
                <p className="text-[10px] text-gray-400 text-center py-2">
                  מוצגות 200 מתוך {yearTxs.length} עסקאות — השתמש בחיפוש לסינון
                </p>
              )}
            </div>
          </div>

          {/* Month-by-month expandable rows */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-xs font-bold text-gray-700">סיכום לפי חודשים — {selectedYear}</h3>
            </div>
            <table className="text-[11px] w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-right py-2 px-4 font-semibold text-gray-600">חודש</th>
                  <th className="text-right py-2 px-4 font-semibold text-gray-600">עסקאות</th>
                  <th className="text-right py-2 px-4 font-semibold text-gray-600">סה״כ</th>
                  <th className="text-right py-2 px-4 font-semibold text-gray-600">% מהשנה</th>
                  <th className="py-2 px-4" />
                </tr>
              </thead>
              <tbody>
                {MONTH_LABELS.map((label, i) => {
                  const total = monthlyTotals[i] ?? 0;
                  const count = accountTxs.filter((t) => {
                    const d = new Date(t.transaction_date);
                    return d.getFullYear() === selectedYear && d.getMonth() === i;
                  }).length;
                  const isExpanded = expandedMonth === i;
                  const pct = yearTotal > 0 ? (total / yearTotal) * 100 : 0;

                  return (
                    <tr
                      key={i}
                      onClick={() => setExpandedMonth(isExpanded ? null : i)}
                      className={clsx("border-b border-gray-50 cursor-pointer transition-colors",
                        isExpanded ? "bg-slate-50" : "hover:bg-gray-50/60",
                        total === 0 && "opacity-40",
                      )}
                    >
                      <td className="py-2 px-4 font-medium text-gray-700">{label}</td>
                      <td className="py-2 px-4 text-gray-500">{count}</td>
                      <td className={clsx("py-2 px-4 tabular-nums font-semibold", total > 0 ? "text-gray-800" : "text-gray-300")}>
                        {total > 0 ? fmtFull(total) : "—"}
                      </td>
                      <td className="py-2 px-4">
                        {total > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[80px]">
                              <div className="bg-slate-600 h-1.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <span className="text-[10px] text-gray-500">{pct.toFixed(0)}%</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-4 text-gray-400">
                        {count > 0 && (isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </td>
                    </tr>
                  );
                })}

                {/* Totals row */}
                <tr className="bg-slate-800 text-white">
                  <td className="py-2.5 px-4 font-bold">סה״כ {selectedYear}</td>
                  <td className="py-2.5 px-4">{yearTxs.length}</td>
                  <td className="py-2.5 px-4 tabular-nums font-bold">{fmtFull(yearTotal)}</td>
                  <td className="py-2.5 px-4 text-slate-400">100%</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
