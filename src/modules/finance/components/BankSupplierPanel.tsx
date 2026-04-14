"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Building2, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import { computeInsights } from "@/lib/supplierInsights";
import { BankSupplierOverviewTab } from "./BankSupplierOverviewTab";
import { BankSupplierChartsTab } from "./BankSupplierChartsTab";
import { BankSupplierCalendarTab } from "./BankSupplierCalendarTab";
import { BankSupplierTransactionsTab } from "./BankSupplierTransactionsTab";
import type { BankTransaction } from "../types";

interface Props {
  supplierKey: string;    // description or supplier_name used as the key
  displayName: string;    // shown as the panel title
  onClose: () => void;
}

const MONTH_LABELS = [
  "ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני",
  "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳",
];

type Tab = "overview" | "charts" | "calendar" | "transactions";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview",      label: "סקירה" },
  { id: "charts",        label: "גרפים" },
  { id: "calendar",      label: "יומן" },
  { id: "transactions",  label: "תנועות" },
];

export function BankSupplierPanel({ supplierKey, displayName, onClose }: Props) {
  const { state } = useSupabaseAuth();
  const companyId = state.status === "authed" ? state.user.selectedCompanyId : null;

  const [txs, setTxs] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [totalCompanyExpenses, setTotalCompanyExpenses] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Trigger slide-in animation after first paint
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Fetch supplier transactions — direct bank_transactions + split rows
  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const directQuery = supabase
      .from("bank_transactions")
      .select("*")
      .eq("company_id", companyId)
      .or(`supplier_name.eq.${supplierKey},description.ilike.%${supplierKey}%`)
      .order("date", { ascending: false })
      .limit(2000);

    // Also fetch split rows that match this supplier, joined with parent tx for date/amounts
    const splitQuery = supabase
      .from("bank_transaction_splits")
      .select("id, transaction_id, description, supplier_name, category_id, amount, notes, bank_transactions!inner(id, date, debit, credit, source_bank, bank_account_id, company_id)")
      .eq("company_id", companyId)
      .or(`supplier_name.eq.${supplierKey},description.ilike.%${supplierKey}%`)
      .limit(2000);

    Promise.all([directQuery, splitQuery]).then(([{ data: direct, error: err1 }, { data: splits, error: err2 }]) => {
      if (err1) { setError(err1.message); setLoading(false); return; }
      if (err2) { setError(err2.message); setLoading(false); return; }

      const directTxs = (direct as BankTransaction[]) ?? [];

      // Convert split rows to BankTransaction shape so the panel can use them uniformly
      type SplitRow = {
        id: string;
        transaction_id: string;
        description: string;
        supplier_name: string | null;
        category_id: string | null;
        amount: number;
        notes: string | null;
        bank_transactions: {
          id: string;
          date: string;
          debit: number;
          credit: number;
          source_bank: string;
          bank_account_id: string;
          company_id: string;
        };
      };
      const splitTxs: BankTransaction[] = ((splits as unknown as SplitRow[]) ?? []).map((s) => {
        const parent = s.bank_transactions;
        const isDebit = Number(parent.debit) > 0;
        const amt = Math.abs(Number(s.amount) || 0);
        return {
          ...parent,
          id: `${parent.id}::split::${s.id}`,
          description: s.description || "",
          supplier_name: s.supplier_name ?? null,
          category_id: s.category_id ?? undefined,
          notes: s.notes ?? null,
          debit: isDebit ? amt : 0,
          credit: isDebit ? 0 : amt,
          balance: null,
          details: "",
          reference: "",
          operation_code: null,
          batch_code: null,
          merged_into_id: null,
          is_split_line: true,
          split_parent_id: parent.id,
        } as unknown as BankTransaction;
      });

      // Merge: avoid duplicates (a direct tx that was split is already represented by split rows)
      const splitParentIds = new Set(splitTxs.map((s) => s.split_parent_id).filter(Boolean));
      const filteredDirect = directTxs.filter((t) => !splitParentIds.has(t.id));
      const merged = [...filteredDirect, ...splitTxs].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setTxs(merged);
      setLoading(false);
    });
  }, [companyId, supplierKey]);

  // Fetch total company expenses for the selected year (for % KPI)
  useEffect(() => {
    if (!companyId) return;
    const supabase = createClient();
    supabase
      .from("bank_transactions")
      .select("debit")
      .eq("company_id", companyId)
      .gt("debit", 0)
      .gte("date", `${selectedYear}-01-01`)
      .lte("date", `${selectedYear}-12-31`)
      .limit(10000)
      .then(({ data }) => {
        if (data) {
          const total = (data as { debit: number }[]).reduce((s, r) => s + r.debit, 0);
          setTotalCompanyExpenses(total);
        }
      });
  }, [companyId, selectedYear]);

  const years = useMemo(() => {
    const set = new Set(txs.map((t) => new Date(t.date).getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [txs]);

  useEffect(() => {
    if (years.length > 0 && !years.includes(selectedYear)) {
      setSelectedYear(years[0]!);
    }
  }, [years, selectedYear]);

  const expenseTxs = useMemo(() => txs.filter((t) => t.debit > 0), [txs]);

  const yearSummary = useMemo(
    () =>
      years.map((yr) => {
        const ytxs = expenseTxs.filter((t) => new Date(t.date).getFullYear() === yr);
        return { year: yr, total: ytxs.reduce((s, t) => s + t.debit, 0), count: ytxs.length };
      }),
    [expenseTxs, years],
  );

  const monthlyTotals = useMemo(() => {
    const months = Array.from({ length: 12 }, () => 0);
    for (const tx of expenseTxs) {
      const d = new Date(tx.date);
      if (d.getFullYear() !== selectedYear) continue;
      months[d.getMonth()] = (months[d.getMonth()] ?? 0) + tx.debit;
    }
    return months;
  }, [expenseTxs, selectedYear]);

  const monthCounts = useMemo(
    () =>
      MONTH_LABELS.map((_, i) => {
        const inMonth = expenseTxs.filter((t) => {
          const d = new Date(t.date);
          return d.getFullYear() === selectedYear && d.getMonth() === i;
        });
        return { total: monthlyTotals[i] ?? 0, count: inMonth.length };
      }),
    [expenseTxs, selectedYear, monthlyTotals],
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
      ? ((currentYearSummary?.total ?? 0) - prevYearSummary.total) / prevYearSummary.total * 100
      : null;

  const yearTxs = useMemo(
    () =>
      expenseTxs.filter((t) => {
        const d = new Date(t.date);
        if (d.getFullYear() !== selectedYear) return false;
        if (expandedMonth !== null && d.getMonth() !== expandedMonth) return false;
        return true;
      }),
    [expenseTxs, selectedYear, expandedMonth],
  );

  const chartData = MONTH_LABELS.map((label, i) => ({
    label,
    value: monthlyTotals[i] ?? 0,
  }));

  const insights = useMemo(
    () =>
      computeInsights({
        payments: expenseTxs.map((t) => ({ date: t.date, amount: t.debit })),
        yearTotal,
        totalCompanyExpenses,
        trendPct,
        selectedYear,
      }),
    [expenseTxs, yearTotal, totalCompanyExpenses, trendPct, selectedYear],
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
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center py-24 text-red-500 text-sm">
            {error}
          </div>
        ) : expenseTxs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-24 text-gray-400 text-sm">
            לא נמצאו תשלומים לספק זה
          </div>
        ) : (
          <>
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
                          ? "bg-blue-800 text-white"
                          : "bg-white border border-gray-200 text-gray-600 hover:border-blue-400",
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
                        ? "border-blue-600 text-blue-700"
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
                <BankSupplierOverviewTab
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
                <BankSupplierChartsTab
                  chartData={chartData}
                  monthCounts={monthCounts}
                  yearTotal={yearTotal}
                  currentYearCount={currentYearSummary?.count ?? 0}
                  selectedYear={selectedYear}
                  expandedMonth={expandedMonth}
                  onExpandMonth={setExpandedMonth}
                />
              )}
              {activeTab === "calendar" && (
                <BankSupplierCalendarTab
                  txs={expenseTxs}
                  selectedYear={selectedYear}
                />
              )}
              {activeTab === "transactions" && (
                <BankSupplierTransactionsTab
                  yearTxs={yearTxs}
                  exportTxs={expenseTxs.filter(
                    (t) => new Date(t.date).getFullYear() === selectedYear,
                  )}
                  expandedMonth={expandedMonth}
                  displayName={displayName}
                  selectedYear={selectedYear}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
