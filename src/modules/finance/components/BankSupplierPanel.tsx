"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X, Building2, TrendingUp, TrendingDown, Minus,
  ChevronDown, ChevronUp, Search, Loader2,
} from "lucide-react";
import { clsx } from "clsx";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import type { BankTransaction } from "../types";

interface Props {
  supplierKey: string;       // description or supplier_name used as the key
  displayName: string;       // what to show as the title
  onClose: () => void;
}

const MONTH_LABELS = ["ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני", "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳"];

function fmtFull(n: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency", currency: "ILS", maximumFractionDigits: 0,
  }).format(n);
}

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function BankSupplierPanel({ supplierKey, displayName, onClose }: Props) {
  const { state } = useSupabaseAuth();
  const companyId = state.status === "authed" ? state.user.selectedCompanyId : null;

  const [txs, setTxs] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  // Fetch all matching transactions from Supabase
  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    // Search by description OR supplier_name containing the key
    const q = `%${supplierKey}%`;
    supabase
      .from("bank_transactions")
      .select("*")
      .eq("company_id", companyId)
      .or(`description.ilike.${q},supplier_name.ilike.${q}`)
      .order("date", { ascending: false })
      .limit(2000)
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setTxs((data as BankTransaction[]) ?? []);
        setLoading(false);
      });
  }, [companyId, supplierKey]);

  // Available years
  const years = useMemo(() => {
    const set = new Set(txs.map((t) => new Date(t.date).getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [txs]);

  // Set initial year once data loads
  useEffect(() => {
    if (years.length > 0 && !years.includes(selectedYear)) {
      setSelectedYear(years[0]!);
    }
  }, [years, selectedYear]);

  // Only debits (expenses) — credit transactions are receipts, not payments to supplier
  const expenseTxs = useMemo(() => txs.filter((t) => t.debit > 0), [txs]);

  // Per-year summary
  const yearSummary = useMemo(() => {
    return years.map((yr) => {
      const ytxs = expenseTxs.filter((t) => new Date(t.date).getFullYear() === yr);
      return { year: yr, total: ytxs.reduce((s, t) => s + t.debit, 0), count: ytxs.length };
    });
  }, [expenseTxs, years]);

  // Monthly totals for selected year
  const monthlyTotals = useMemo(() => {
    const months = Array.from({ length: 12 }, () => 0);
    for (const tx of expenseTxs) {
      const d = new Date(tx.date);
      if (d.getFullYear() !== selectedYear) continue;
      months[d.getMonth()] = (months[d.getMonth()] ?? 0) + tx.debit;
    }
    return months;
  }, [expenseTxs, selectedYear]);

  const yearTotal = monthlyTotals.reduce((s, v) => s + v, 0);
  const activeMonths = monthlyTotals.filter((v) => v > 0).length;
  const avgMonth = yearTotal / (activeMonths || 1);
  const maxMonthValue = Math.max(...monthlyTotals, 0);
  const maxMonthIndex = monthlyTotals.indexOf(maxMonthValue);

  const currentYearSummary = yearSummary.find((y) => y.year === selectedYear);
  const prevYearSummary = yearSummary.find((y) => y.year === selectedYear - 1);
  const trendPct =
    prevYearSummary && prevYearSummary.total > 0
      ? ((currentYearSummary?.total ?? 0) - prevYearSummary.total) / prevYearSummary.total * 100
      : null;

  // Transactions for selected year, filtered by month + search
  const yearTxs = useMemo(() => {
    let txList = expenseTxs.filter((t) => new Date(t.date).getFullYear() === selectedYear);
    if (expandedMonth !== null) {
      txList = txList.filter((t) => new Date(t.date).getMonth() === expandedMonth);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      txList = txList.filter(
        (t) =>
          (t.description ?? "").toLowerCase().includes(q) ||
          (t.details ?? "").toLowerCase().includes(q) ||
          (t.reference ?? "").toLowerCase().includes(q),
      );
    }
    return txList;
  }, [expenseTxs, selectedYear, expandedMonth, search]);

  const chartData = MONTH_LABELS.map((label, i) => ({
    label,
    value: monthlyTotals[i] ?? 0,
  }));

  return (
    <div className="fixed inset-0 z-[60] flex" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className="relative mr-auto ml-0 w-full max-w-3xl bg-white shadow-2xl overflow-y-auto flex flex-col"
        style={{ maxHeight: "100vh" }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-l from-blue-800 to-blue-900 text-white px-6 py-4 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-blue-300 shrink-0" />
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/40 text-blue-200">
                ספק / תיאור
              </span>
            </div>
            <h2 className="text-xl font-bold truncate">{displayName}</h2>
            <p className="text-blue-300 text-sm mt-0.5">
              {expenseTxs.length} תשלומים בסה״כ · תנועות בנק
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center py-24 text-red-500 text-sm">{error}</div>
        ) : expenseTxs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-24 text-gray-400 text-sm">
            לא נמצאו תשלומים לספק זה
          </div>
        ) : (
          <>
            {/* Year selector */}
            <div className="bg-slate-50 border-b border-gray-200 px-6 py-3">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">שנה:</span>
                  <div className="flex gap-1">
                    {years.map((yr) => (
                      <button
                        key={yr}
                        onClick={() => { setSelectedYear(yr); setExpandedMonth(null); }}
                        className={clsx(
                          "px-3 py-1 rounded-lg text-xs font-semibold transition-colors",
                          selectedYear === yr
                            ? "bg-blue-800 text-white"
                            : "bg-white border border-gray-200 text-gray-600 hover:border-blue-400",
                        )}
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                </div>
                {trendPct !== null && (
                  <div className={clsx(
                    "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg",
                    trendPct > 5 ? "bg-red-50 text-red-700" : trendPct < -5 ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600",
                  )}>
                    {trendPct > 5 ? <TrendingUp className="w-3.5 h-3.5" /> : trendPct < -5 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                    {trendPct > 0 ? "+" : ""}{trendPct.toFixed(1)}% לעומת {selectedYear - 1}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 p-6 space-y-5">

              {/* KPI cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "סה״כ שנה", value: fmtFull(yearTotal), sub: `${currentYearSummary?.count ?? 0} תשלומים` },
                  { label: "ממוצע חודשי", value: fmtFull(avgMonth), sub: `${activeMonths} חודשים פעילים` },
                  {
                    label: "חודש שיא",
                    value: maxMonthValue > 0 ? fmtFull(maxMonthValue) : "—",
                    sub: maxMonthValue > 0 ? (MONTH_LABELS[maxMonthIndex] ?? "") : "אין נתון",
                  },
                  {
                    label: "שינוי שנתי",
                    value: trendPct !== null ? `${trendPct > 0 ? "+" : ""}${trendPct.toFixed(1)}%` : "—",
                    sub: trendPct !== null ? `vs ${selectedYear - 1}` : "אין נתון קודם",
                    color: trendPct !== null ? (trendPct > 5 ? "text-red-600" : trendPct < -5 ? "text-emerald-600" : "text-gray-900") : "text-gray-900",
                  },
                ].map((k) => (
                  <div key={k.label} className="bg-white border border-gray-200 rounded-2xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-0.5">{k.label}</p>
                    <p className={clsx("text-lg font-bold tabular-nums leading-tight", ("color" in k && k.color) ? k.color : "text-gray-900")}>
                      {k.value}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{k.sub}</p>
                  </div>
                ))}
              </div>

              {/* Multi-year comparison */}
              {years.length > 1 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  <h3 className="text-xs font-bold text-gray-700 mb-3">השוואה שנתית</h3>
                  <div className="flex items-end gap-3 h-20">
                    {yearSummary.map(({ year: yr, total }) => {
                      const maxVal = Math.max(...yearSummary.map((y) => y.total));
                      const height = maxVal > 0 ? (total / maxVal) * 100 : 0;
                      return (
                        <div
                          key={yr}
                          className="flex-1 flex flex-col items-center gap-1 cursor-pointer"
                          onClick={() => { setSelectedYear(yr); setExpandedMonth(null); }}
                        >
                          <span className="text-[9px] text-gray-500 tabular-nums">{fmt(total)}</span>
                          <div
                            className={clsx(
                              "w-full rounded-t-sm transition-all",
                              yr === selectedYear ? "bg-blue-700" : "bg-blue-200 hover:bg-blue-300",
                            )}
                            style={{ height: `${Math.max(height, 4)}%` }}
                          />
                          <span className={clsx("text-[10px] font-semibold", yr === selectedYear ? "text-blue-800" : "text-gray-400")}>
                            {yr}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Monthly bar chart */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-gray-700">ציר תשלומים חודשי — {selectedYear}</h3>
                  {expandedMonth !== null && (
                    <button onClick={() => setExpandedMonth(null)} className="text-[10px] text-blue-600 hover:underline">
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
                      formatter={(v: number) => [fmtFull(v), "תשלום"]}
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                    />
                    <Bar
                      dataKey="value"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(_, index) => setExpandedMonth(expandedMonth === index ? null : index)}
                    >
                      {chartData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={expandedMonth === i ? "#1d4ed8" : (chartData[i]?.value ?? 0) > 0 ? "#3b82f6" : "#e5e7eb"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-gray-400 text-center mt-1">לחץ על עמודה לסינון תנועות</p>
              </div>

              {/* Month-by-month breakdown */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="text-xs font-bold text-gray-700">פילוח לפי חודשים — {selectedYear}</h3>
                </div>
                <table className="text-[11px] w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-right py-2 px-4 font-semibold text-gray-600">חודש</th>
                      <th className="text-right py-2 px-4 font-semibold text-gray-600">תשלומים</th>
                      <th className="text-right py-2 px-4 font-semibold text-gray-600">סה״כ</th>
                      <th className="text-right py-2 px-4 font-semibold text-gray-600">% מהשנה</th>
                      <th className="py-2 px-4 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {MONTH_LABELS.map((label, i) => {
                      const total = monthlyTotals[i] ?? 0;
                      const count = expenseTxs.filter((t) => {
                        const d = new Date(t.date);
                        return d.getFullYear() === selectedYear && d.getMonth() === i;
                      }).length;
                      const isExpanded = expandedMonth === i;
                      const pct = yearTotal > 0 ? (total / yearTotal) * 100 : 0;

                      return (
                        <tr
                          key={i}
                          onClick={() => count > 0 && setExpandedMonth(isExpanded ? null : i)}
                          className={clsx(
                            "border-b border-gray-50 transition-colors",
                            count > 0 ? "cursor-pointer" : "opacity-35",
                            isExpanded ? "bg-blue-50" : count > 0 ? "hover:bg-gray-50/60" : "",
                          )}
                        >
                          <td className="py-2 px-4 font-medium text-gray-700">{label}</td>
                          <td className="py-2 px-4 text-gray-500">{count > 0 ? count : "—"}</td>
                          <td className={clsx("py-2 px-4 tabular-nums font-semibold", total > 0 ? "text-gray-800" : "text-gray-300")}>
                            {total > 0 ? fmtFull(total) : "—"}
                          </td>
                          <td className="py-2 px-4">
                            {total > 0 && (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[80px]">
                                  <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
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
                    <tr className="bg-blue-900 text-white">
                      <td className="py-2.5 px-4 font-bold">סה״כ {selectedYear}</td>
                      <td className="py-2.5 px-4">{currentYearSummary?.count ?? 0}</td>
                      <td className="py-2.5 px-4 tabular-nums font-bold">{fmtFull(yearTotal)}</td>
                      <td className="py-2.5 px-4 text-blue-300">100%</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Transaction list */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
                  <h3 className="text-xs font-bold text-gray-700">
                    תנועות{expandedMonth !== null ? ` — ${MONTH_LABELS[expandedMonth]}` : ""} ({yearTxs.length})
                  </h3>
                  <div className="relative">
                    <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="חיפוש..."
                      className="pr-8 pl-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-300 w-44"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto" dir="rtl">
                  <table className="text-[11px] w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-right py-2.5 px-4 font-semibold text-gray-600">תאריך</th>
                        <th className="text-right py-2.5 px-4 font-semibold text-gray-600">תיאור</th>
                        <th className="text-right py-2.5 px-4 font-semibold text-gray-600">אסמכתא</th>
                        <th className="text-right py-2.5 px-4 font-semibold text-gray-600">סכום</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearTxs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-10 text-center text-gray-400">
                            לא נמצאו תנועות
                          </td>
                        </tr>
                      ) : (
                        yearTxs.slice(0, 200).map((tx) => (
                          <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                            <td className="py-2 px-4 tabular-nums text-gray-500">{fmtDate(tx.date)}</td>
                            <td className="py-2 px-4 text-gray-800 max-w-[220px]">
                              {tx.supplier_name && (
                                <p className="font-medium">{tx.supplier_name}</p>
                              )}
                              <p className={clsx("truncate", tx.supplier_name ? "text-[10px] text-teal-500" : "font-medium")}>
                                {tx.description}
                              </p>
                              {tx.details && !tx.supplier_name && (
                                <p className="text-[10px] text-gray-400 truncate">{tx.details}</p>
                              )}
                            </td>
                            <td className="py-2 px-4 text-gray-400 font-mono">{tx.reference || "—"}</td>
                            <td className="py-2 px-4 tabular-nums font-semibold text-red-600">
                              {fmtFull(tx.debit)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  {yearTxs.length > 200 && (
                    <p className="text-[10px] text-gray-400 text-center py-2">
                      מוצגות 200 מתוך {yearTxs.length} תנועות
                    </p>
                  )}
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
}
