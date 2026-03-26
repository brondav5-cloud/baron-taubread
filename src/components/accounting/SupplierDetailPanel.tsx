"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Building2 } from "lucide-react";
import { clsx } from "clsx";
import { computeInsights } from "@/lib/supplierInsights";
import { SupplierOverviewTab } from "./SupplierOverviewTab";
import { SupplierChartsTab } from "./SupplierChartsTab";
import { SupplierCalendarTab } from "./SupplierCalendarTab";
import { SupplierTransactionsTab } from "./SupplierTransactionsTab";
import type { DbTransaction, DbCounterAccountName } from "@/types/accounting";

interface Props {
  counterAccount: string;
  displayName: string;
  transactions: DbTransaction[];
  counterNames: DbCounterAccountName[];
  years: number[];
  initialYear?: number;
  onClose: () => void;
}

const MONTH_LABELS = [
  "ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני",
  "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳",
];

type Tab = "overview" | "charts" | "calendar" | "transactions";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview",     label: "סקירה" },
  { id: "charts",       label: "גרפים" },
  { id: "calendar",     label: "יומן" },
  { id: "transactions", label: "תנועות" },
];

export default function SupplierDetailPanel({
  counterAccount,
  displayName,
  transactions,
  counterNames,
  years,
  initialYear,
  onClose,
}: Props) {
  const [selectedYear, setSelectedYear] = useState(
    initialYear ?? years[0] ?? new Date().getFullYear(),
  );
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [mounted, setMounted] = useState(false);

  // Trigger slide-in animation
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const counterNameMap = useMemo(
    () => new Map(counterNames.map((c) => [c.counter_account_code, c.display_name])),
    [counterNames],
  );

  // All transactions for this supplier
  const supplierTxs = useMemo(
    () => transactions.filter((t) => t.counter_account === counterAccount),
    [transactions, counterAccount],
  );

  // Total company expenses for selected year (all suppliers, debit - credit > 0)
  const totalCompanyExpenses = useMemo(() => {
    return transactions
      .filter((t) => new Date(t.transaction_date).getFullYear() === selectedYear)
      .reduce((s, t) => {
        const net = t.debit - t.credit;
        return s + (net > 0 ? net : 0);
      }, 0);
  }, [transactions, selectedYear]);

  // Per-year summary
  const yearSummary = useMemo(
    () =>
      years.map((yr) => {
        const ytxs = supplierTxs.filter(
          (t) => new Date(t.transaction_date).getFullYear() === yr,
        );
        const total = ytxs.reduce((s, t) => s + (t.debit - t.credit), 0);
        return { year: yr, total, count: ytxs.length };
      }),
    [supplierTxs, years],
  );

  // Monthly totals for selected year
  const monthlyTotals = useMemo(() => {
    const months = Array.from({ length: 12 }, () => 0);
    for (const tx of supplierTxs) {
      const d = new Date(tx.transaction_date);
      if (d.getFullYear() !== selectedYear) continue;
      months[d.getMonth()] = (months[d.getMonth()] ?? 0) + (tx.debit - tx.credit);
    }
    return months;
  }, [supplierTxs, selectedYear]);

  const monthCounts = useMemo(
    () =>
      MONTH_LABELS.map((_, i) => {
        const inMonth = supplierTxs.filter((t) => {
          const d = new Date(t.transaction_date);
          return d.getFullYear() === selectedYear && d.getMonth() === i;
        });
        return { total: monthlyTotals[i] ?? 0, count: inMonth.length };
      }),
    [supplierTxs, selectedYear, monthlyTotals],
  );

  const yearTotal = monthlyTotals.reduce((s, v) => s + v, 0);
  const activeMonths = monthlyTotals.filter((v) => v > 0).length;
  const avgMonth = yearTotal / (activeMonths || 1);
  const maxMonthValue = Math.max(...monthlyTotals, 0);
  const maxMonthIndex = monthlyTotals.indexOf(maxMonthValue);
  const currentYearSummary = yearSummary.find((y) => y.year === selectedYear);
  const prevYearSummary = yearSummary.find((y) => y.year === selectedYear - 1);
  const trendPct =
    prevYearSummary && prevYearSummary.total > 0
      ? ((currentYearSummary?.total ?? 0) - prevYearSummary.total) /
        prevYearSummary.total * 100
      : null;

  // Transactions for selected year, filtered by month
  const yearTxs = useMemo(
    () =>
      supplierTxs
        .filter((t) => {
          const d = new Date(t.transaction_date);
          if (d.getFullYear() !== selectedYear) return false;
          if (expandedMonth !== null && d.getMonth() !== expandedMonth) return false;
          return true;
        })
        .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date)),
    [supplierTxs, selectedYear, expandedMonth],
  );

  const chartData = MONTH_LABELS.map((label, i) => ({
    label,
    value: monthlyTotals[i] ?? 0,
  }));

  // Account breakdown for selected year
  const accountsBreakdown = useMemo(() => {
    const yearAll = supplierTxs.filter(
      (t) => new Date(t.transaction_date).getFullYear() === selectedYear,
    );
    const map = new Map<string, { name: string | null; total: number; count: number }>();
    for (const tx of yearAll) {
      const ex = map.get(tx.account_id) ?? { name: tx.original_account_name, total: 0, count: 0 };
      ex.total += tx.debit - tx.credit;
      ex.count += 1;
      map.set(tx.account_id, ex);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .filter((a) => a.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [supplierTxs, selectedYear]);

  const insights = useMemo(
    () =>
      computeInsights({
        payments: supplierTxs.map((t) => ({
          date: t.transaction_date,
          amount: t.debit - t.credit,
        })),
        yearTotal,
        totalCompanyExpenses,
        trendPct,
        selectedYear,
      }),
    [supplierTxs, yearTotal, totalCompanyExpenses, trendPct, selectedYear],
  );

  const handleYearChange = (yr: number) => {
    setSelectedYear(yr);
    setExpandedMonth(null);
  };

  return (
    <div className="fixed inset-0 z-[60] flex" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel — slides in from the right */}
      <div
        className={clsx(
          "relative mr-auto ml-0 w-full max-w-3xl bg-white shadow-2xl overflow-y-auto flex flex-col",
          "transition-transform duration-300 ease-out",
          mounted ? "translate-x-0" : "translate-x-full",
        )}
        style={{ maxHeight: "100vh" }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-l from-indigo-800 to-indigo-900 text-white px-6 py-4 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-indigo-300 shrink-0" />
              <code className="bg-white/20 text-white px-2 py-0.5 rounded text-xs font-mono">
                {counterAccount}
              </code>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/40 text-indigo-200">
                ספק
              </span>
            </div>
            <h2 className="text-xl font-bold truncate">{displayName}</h2>
            <p className="text-indigo-300 text-sm mt-0.5">
              {supplierTxs.length} תנועות בסה״כ ·{" "}
              {counterNameMap.get(counterAccount) ?? displayName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Year selector */}
        <div className="bg-slate-50 border-b border-gray-200 px-6 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-500">שנה:</span>
            <div className="flex gap-1">
              {years.map((yr) => (
                <button
                  key={yr}
                  onClick={() => handleYearChange(yr)}
                  className={clsx(
                    "px-3 py-1 rounded-lg text-xs font-semibold transition-colors",
                    selectedYear === yr
                      ? "bg-indigo-800 text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-400",
                  )}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="bg-white border-b border-gray-200 px-6 sticky top-[72px] z-10">
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "px-4 py-3 text-xs font-semibold border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 p-6">
          {activeTab === "overview" && (
            <SupplierOverviewTab
              yearTotal={yearTotal}
              avgMonth={avgMonth}
              activeMonths={activeMonths}
              maxMonthValue={maxMonthValue}
              maxMonthIndex={maxMonthIndex}
              trendPct={trendPct}
              selectedYear={selectedYear}
              currentYearSummary={currentYearSummary}
              yearSummary={yearSummary}
              years={years}
              totalCompanyExpenses={totalCompanyExpenses}
              insights={insights}
              onYearChange={handleYearChange}
            />
          )}
          {activeTab === "charts" && (
            <SupplierChartsTab
              chartData={chartData}
              monthCounts={monthCounts}
              yearTotal={yearTotal}
              currentYearCount={currentYearSummary?.count ?? 0}
              selectedYear={selectedYear}
              expandedMonth={expandedMonth}
              accountsBreakdown={accountsBreakdown}
              onExpandMonth={setExpandedMonth}
            />
          )}
          {activeTab === "calendar" && (
            <SupplierCalendarTab
              supplierTxs={supplierTxs}
              selectedYear={selectedYear}
            />
          )}
          {activeTab === "transactions" && (
            <SupplierTransactionsTab
              yearTxs={yearTxs}
              exportTxs={supplierTxs.filter(
                (t) => new Date(t.transaction_date).getFullYear() === selectedYear,
              )}
              expandedMonth={expandedMonth}
              displayName={displayName}
              selectedYear={selectedYear}
            />
          )}
        </div>
      </div>
    </div>
  );
}
