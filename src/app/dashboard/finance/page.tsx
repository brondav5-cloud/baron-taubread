"use client";

import { useState, useCallback } from "react";
import { Upload, ChevronRight, ChevronLeft, RefreshCw, Settings, BarChart3, Download, Clock, Receipt } from "lucide-react";
import Link from "next/link";
import { useBankTransactions } from "@/modules/finance/hooks/useBankTransactions";
import { BankTransactionsTable } from "@/modules/finance/components/BankTransactionsTable";
import { UploadBankFileModal } from "@/modules/finance/components/UploadBankFileModal";
import { TransactionDetailModal } from "@/modules/finance/components/TransactionDetailModal";
import { FileHistoryPanel } from "@/modules/finance/components/FileHistoryPanel";
import { AccountsManagerPanel } from "@/modules/finance/components/AccountsManagerPanel";
import { ChecksRegistryModal } from "@/modules/finance/components/ChecksRegistryModal";
import { BalanceChart } from "@/modules/finance/components/BalanceChart";
import { MonthlyTrendsChart } from "@/modules/finance/components/MonthlyTrendsChart";
import { CashRunwayCard } from "@/modules/finance/components/CashRunwayCard";
import { UnclassifiedAlert } from "@/modules/finance/components/UnclassifiedAlert";
import { loadXlsx } from "@/lib/loadXlsx";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import type { SourceBank, BankTransaction } from "@/modules/finance/types";

const BANK_OPTIONS: { value: SourceBank | ""; label: string }[] = [
  { value: "", label: "כל הבנקים" },
  { value: "leumi", label: "לאומי" },
  { value: "hapoalim", label: "הפועלים" },
  { value: "mizrahi", label: "מזרחי" },
];

const MONTH_NAMES = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

function getMonthRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export default function FinancePage() {
  const hook = useBankTransactions();
  const { state } = useSupabaseAuth();
  const selectedCompanyId = state.status === "authed" ? state.user.selectedCompanyId : null;
  const [uploadOpen, setUploadOpen] = useState(false);
  const [checksOpen, setChecksOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<BankTransaction | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const currentYear = new Date().getFullYear();

  const totalPages = Math.ceil(hook.totalCount / hook.pageSize);

  const { setFilters } = hook;

  const handleSearchChange = useCallback((search: string) => {
    setFilters((f) => ({ ...f, search }));
  }, [setFilters]);

  const handleCategoryChange = useCallback((categoryId: string) => {
    setFilters((f) => ({ ...f, categoryId }));
  }, [setFilters]);

  const handleUploadSuccess = useCallback(() => {
    hook.refresh();
  }, [hook]);

  const handleExport = useCallback(async () => {
    if (!selectedCompanyId) return;
    setExporting(true);
    try {
      const supabase = createClient();
      const f = hook.filters;
      let query = supabase
        .from("bank_transactions")
        .select("date,description,details,reference,debit,credit,balance,category_id,operation_code,source_bank")
        .eq("company_id", selectedCompanyId)
        .order("date", { ascending: false })
        .limit(5000);

      if (f.dateFrom) query = query.gte("date", f.dateFrom);
      if (f.dateTo) query = query.lte("date", f.dateTo);
      if (f.bankAccountId) query = query.eq("bank_account_id", f.bankAccountId);
      if (f.sourceBank) query = query.eq("source_bank", f.sourceBank);
      if (f.search.trim()) {
        const s = `%${f.search.trim()}%`;
        query = query.or(`description.ilike.${s},details.ilike.${s},reference.ilike.${s}`);
      }

      const { data } = await query;
      if (!data?.length) return;

      const catMap = Object.fromEntries(hook.categories.map((c) => [c.id, c.name]));
      const rows = data.map((tx) => ({
        "תאריך": tx.date,
        "תיאור": tx.description,
        "פרטים": tx.details,
        "אסמכתא": tx.reference,
        "חובה": tx.debit,
        "זכות": tx.credit,
        "יתרה": tx.balance ?? "",
        "קטגוריה": tx.category_id ? (catMap[tx.category_id] ?? "") : "",
        "בנק": tx.source_bank,
      }));

      const XLSX = await loadXlsx();
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "תנועות");
      XLSX.writeFile(wb, `תנועות_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      setExporting(false);
    }
  }, [hook.filters, hook.categories, selectedCompanyId]);

  return (
    <div className="space-y-5 pb-8">
      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">תנועות בנק</h1>
          {hook.totalCount > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              {hook.totalCount.toLocaleString()} תנועות סה״כ
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-sm font-medium transition-colors ${showHistory ? "bg-gray-100 border-gray-300 text-gray-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            <Clock className="w-4 h-4" />
            היסטוריה
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || hook.totalCount === 0}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            {exporting ? "מייצא..." : "ייצא Excel"}
          </button>
          <Link
            href="/dashboard/finance/pnl"
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            רווח והפסד
          </Link>
          <Link
            href="/dashboard/finance/categories"
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            קטגוריות
          </Link>
          <button
            onClick={() => setChecksOpen(true)}
            className="flex items-center gap-2 px-3 py-2 border border-teal-200 text-teal-700 bg-teal-50 rounded-xl text-sm font-medium hover:bg-teal-100 transition-colors"
          >
            <Receipt className="w-4 h-4" />
            שיקים
          </button>
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            העלאת קובץ
          </button>
        </div>
      </div>

      {/* ── Filters bar ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        {/* Quick month selector */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-gray-400 font-medium ml-1">חודש מהיר:</span>
          {MONTH_NAMES.map((name, idx) => {
            const isActive = selectedMonth === idx;
            return (
              <button
                key={idx}
                onClick={() => {
                  if (isActive) {
                    setSelectedMonth(null);
                    hook.setFilters((f) => ({ ...f, dateFrom: "", dateTo: "" }));
                  } else {
                    const { from, to } = getMonthRange(currentYear, idx);
                    setSelectedMonth(idx);
                    hook.setFilters((f) => ({ ...f, dateFrom: from, dateTo: to }));
                  }
                }}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  isActive
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>

        {/* Main filter row */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Account selector */}
          {hook.accounts.length > 1 && (
            <select
              value={hook.filters.bankAccountId}
              onChange={(e) =>
                hook.setFilters((f) => ({ ...f, bankAccountId: e.target.value }))
              }
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
            >
              <option value="">כל החשבונות</option>
              {hook.accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.display_name}</option>
              ))}
            </select>
          )}

          {/* Bank filter */}
          <select
            value={hook.filters.sourceBank}
            onChange={(e) =>
              hook.setFilters((f) => ({ ...f, sourceBank: e.target.value as SourceBank | "" }))
            }
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          >
            {BANK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Date from */}
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-gray-400 font-medium">מתאריך</label>
            <input
              type="date"
              value={hook.filters.dateFrom}
              onChange={(e) => {
                setSelectedMonth(null);
                hook.setFilters((f) => ({ ...f, dateFrom: e.target.value }));
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
            />
          </div>

          <span className="text-gray-400 text-sm mt-4">—</span>

          {/* Date to */}
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-gray-400 font-medium">עד תאריך</label>
            <input
              type="date"
              value={hook.filters.dateTo}
              onChange={(e) => {
                setSelectedMonth(null);
                hook.setFilters((f) => ({ ...f, dateTo: e.target.value }));
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={hook.refresh}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 transition-colors mt-4"
            title="רענן"
          >
            <RefreshCw className={`w-4 h-4 ${hook.isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── File history + accounts panel ──────────────────────────────────── */}
      {showHistory && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FileHistoryPanel accounts={hook.accounts} />
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b bg-gray-50 flex items-center gap-2">
              <span className="font-semibold text-gray-700 text-sm">חשבונות בנק</span>
            </div>
            <AccountsManagerPanel />
          </div>
        </div>
      )}

      {/* ── Unclassified alert ─────────────────────────────────────────────── */}
      <UnclassifiedAlert />

      {/* ── KPI row: balance chart + cash runway ───────────────────────────── */}
      {hook.accounts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <BalanceChart accounts={hook.accounts} />
          </div>
          <CashRunwayCard />
        </div>
      )}

      {/* ── Monthly trends chart ───────────────────────────────────────────── */}
      <MonthlyTrendsChart />

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {hook.error && (
        <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">
          שגיאה: {hook.error}
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <BankTransactionsTable
        transactions={hook.transactions}
        categories={hook.categories}
        isLoading={hook.isLoading}
        sortBy={hook.sortBy}
        sortDir={hook.sortDir}
        onSort={hook.setSort}
        onRowClick={setSelectedTx}
        splitCounts={hook.splitCounts}
        searchFilter={hook.filters.search}
        categoryFilter={hook.filters.categoryId}
        onSearchChange={handleSearchChange}
        onCategoryChange={handleCategoryChange}
      />

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            עמוד {hook.page + 1} מתוך {totalPages.toLocaleString()}
            {" "}·{" "}
            {hook.totalCount.toLocaleString()} תנועות
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => hook.setPage(hook.page - 1)}
              disabled={hook.page === 0}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => hook.setPage(hook.page + 1)}
              disabled={hook.page >= totalPages - 1}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Upload modal ───────────────────────────────────────────────────── */}
      {uploadOpen && (
        <UploadBankFileModal
          onClose={() => setUploadOpen(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* ── Checks registry modal ───────────────────────────────────────────── */}
      {checksOpen && (
        <ChecksRegistryModal
          onClose={() => setChecksOpen(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* ── Transaction detail modal ────────────────────────────────────────── */}
      {selectedTx && (
        <TransactionDetailModal
          transaction={selectedTx}
          onClose={() => setSelectedTx(null)}
        />
      )}
    </div>
  );
}
