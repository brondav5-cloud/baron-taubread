"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { Upload, ChevronRight, ChevronLeft, Settings, BarChart3, Download, Clock, Receipt } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { BankSupplierPanel } from "@/modules/finance/components/BankSupplierPanel";
import { BankTransactionsFilterBar } from "@/modules/finance/components/BankTransactionsFilterBar";
import { TransactionEditModal } from "@/modules/finance/components/TransactionEditModal";
import { MergeTransactionsModal } from "@/modules/finance/components/MergeTransactionsModal";
import { loadXlsx } from "@/lib/loadXlsx";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import type { BankTransaction, BankCategory } from "@/modules/finance/types";

function getMonthRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

function FinancePageInner() {
  const { canAccess } = usePermissions();
  const hook = useBankTransactions();
  const { state } = useSupabaseAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // All hooks must appear before any conditional return (Rules of Hooks)
  const selectedCompanyId = state.status === "authed" ? state.user.selectedCompanyId : null;
  const [uploadOpen, setUploadOpen] = useState(false);
  const [checksOpen, setChecksOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<BankTransaction | null>(null);
  const [editTx, setEditTx] = useState<BankTransaction | null>(null);
  const [mergeTxs, setMergeTxs] = useState<BankTransaction[] | null>(null);
  const [openSupplier, setOpenSupplier] = useState<{ key: string; name: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showClassifyCol, setShowClassifyCol] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("finance_show_classify_col") !== "false";
  });
  const [extraCategories, setExtraCategories] = useState<BankCategory[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const currentYear = new Date().getFullYear();
  const [selectedFilterYear, setSelectedFilterYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);

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

  const openTransactionFromRow = useCallback(async (row: BankTransaction) => {
    const openId = row.split_parent_id ?? row.id;
    if (!selectedCompanyId) return;
    if (!row.split_parent_id) {
      setSelectedTx(row);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
      .from("bank_transactions")
      .select("*")
      .eq("id", openId)
      .eq("company_id", selectedCompanyId)
      .maybeSingle();
    if (data) setSelectedTx(data as BankTransaction);
  }, [selectedCompanyId]);

  const openEditFromRow = useCallback(async (row: BankTransaction) => {
    const openId = row.split_parent_id ?? row.id;
    if (!selectedCompanyId) return;
    if (!row.split_parent_id) {
      setEditTx(row);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
      .from("bank_transactions")
      .select("*")
      .eq("id", openId)
      .eq("company_id", selectedCompanyId)
      .maybeSingle();
    if (data) setEditTx(data as BankTransaction);
  }, [selectedCompanyId]);

  const clearTxQueryParam = useCallback(() => {
    const p = new URLSearchParams(searchParams.toString());
    if (!p.has("tx")) return;
    p.delete("tx");
    const qs = p.toString();
    router.replace(`/dashboard/finance${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [router, searchParams]);

  const txQueryId = searchParams.get("tx");
  useEffect(() => {
    if (!txQueryId || !selectedCompanyId) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("bank_transactions")
      .select("*")
      .eq("id", txQueryId)
      .eq("company_id", selectedCompanyId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        setSelectedTx(data as BankTransaction);
      });
    return () => {
      cancelled = true;
    };
  }, [txQueryId, selectedCompanyId]);

  const handleClassify = useCallback(async (txId: string, categoryId: string | null) => {
    const splitMarker = "::split::";
    if (txId.includes(splitMarker)) {
      const splitId = txId.split(splitMarker)[1];
      if (!splitId) return;
      await fetch("/api/finance/transactions/splits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ split_id: splitId, category_id: categoryId }),
      });
      return;
    }

    const body = categoryId
      ? { mode: "manual", tx_id: txId, category_id: categoryId }
      : { mode: "clear", tx_id: txId };
    await fetch("/api/finance/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }, []);

  const handleCategoryAdded = useCallback((cat: BankCategory) => {
    setExtraCategories((prev) => [...prev, cat]);
  }, []);

  const handleToggleClassifyCol = useCallback(() => {
    setShowClassifyCol((prev) => {
      const next = !prev;
      localStorage.setItem("finance_show_classify_col", String(next));
      return next;
    });
  }, []);

  const handleUnmerge = useCallback(async (tx: BankTransaction) => {
    if (!window.confirm(`לבטל מיזוג של "${tx.supplier_name ?? tx.description}"?`)) return;
    try {
      const res = await fetch("/api/finance/transactions/merge", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ master_id: tx.id }),
      });
      if (res.ok) hook.refresh();
    } catch { /* silent */ }
  }, [hook]);

  // Fetch available years from bank_transactions
  useEffect(() => {
    if (!selectedCompanyId) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("bank_transactions").select("date").eq("company_id", selectedCompanyId).order("date", { ascending: true }).limit(1),
      supabase.from("bank_transactions").select("date").eq("company_id", selectedCompanyId).order("date", { ascending: false }).limit(1),
    ]).then(([{ data: minData }, { data: maxData }]) => {
      const minYear = minData?.[0] ? new Date((minData[0] as { date: string }).date).getFullYear() : currentYear;
      const maxYear = maxData?.[0] ? new Date((maxData[0] as { date: string }).date).getFullYear() : currentYear;
      const years: number[] = [];
      for (let y = maxYear; y >= minYear; y--) years.push(y);
      setAvailableYears(years.length > 0 ? years : [currentYear]);
    });
  }, [selectedCompanyId, currentYear]);

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

  if (!canAccess("finance")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <div className="text-5xl">🔒</div>
        <h2 className="text-xl font-bold text-gray-800">אין לך גישה לדף זה</h2>
        <p className="text-gray-500 text-sm">
          פנה למנהל המערכת כדי לקבל גישה לתנועות בנק.
        </p>
      </div>
    );
  }

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
      <BankTransactionsFilterBar
        filters={hook.filters}
        accounts={hook.accounts}
        availableYears={availableYears}
        selectedFilterYear={selectedFilterYear}
        selectedMonth={selectedMonth}
        isLoading={hook.isLoading}
        onFiltersChange={hook.setFilters}
        onYearChange={(yr) => {
          setSelectedFilterYear(yr);
          if (selectedMonth !== null) {
            const { from, to } = getMonthRange(yr, selectedMonth);
            hook.setFilters((f) => ({ ...f, dateFrom: from, dateTo: to }));
          }
        }}
        onMonthChange={(month) => {
          if (month === null) {
            setSelectedMonth(null);
            hook.setFilters((f) => ({ ...f, dateFrom: "", dateTo: "" }));
          } else {
            const { from, to } = getMonthRange(selectedFilterYear, month);
            setSelectedMonth(month);
            hook.setFilters((f) => ({ ...f, dateFrom: from, dateTo: to }));
          }
        }}
        onRefresh={hook.refresh}
      />

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
        categories={[...hook.categories, ...extraCategories.filter((e) => !hook.categories.some((c) => c.id === e.id))]}
        isLoading={hook.isLoading}
        sortBy={hook.sortBy}
        sortDir={hook.sortDir}
        onSort={hook.setSort}
        onRowClick={(tx) => { void openTransactionFromRow(tx); }}
        onEditClick={(tx) => { void openEditFromRow(tx); }}
        onMergeSelected={setMergeTxs}
        onUnmergeClick={handleUnmerge}
        splitCounts={hook.splitCounts}
        searchFilter={hook.filters.search}
        categoryFilter={hook.filters.categoryId}
        onSearchChange={handleSearchChange}
        onCategoryChange={handleCategoryChange}
        onClassify={handleClassify}
        onCategoryAdded={handleCategoryAdded}
        showClassifyCol={showClassifyCol}
        onToggleClassifyCol={handleToggleClassifyCol}
        onOpenSupplierInsights={(key, name) => setOpenSupplier({ key, name })}
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
          onClose={() => {
            setSelectedTx(null);
            clearTxQueryParam();
          }}
          onSupplierClick={(key, name) => {
            setSelectedTx(null);
            clearTxQueryParam();
            setOpenSupplier({ key, name });
          }}
        />
      )}

      {openSupplier && (
        <BankSupplierPanel
          supplierKey={openSupplier.key}
          displayName={openSupplier.name}
          onClose={() => setOpenSupplier(null)}
        />
      )}

      {/* ── Edit transaction modal ──────────────────────────────────────────── */}
      {editTx && (
        <TransactionEditModal
          transaction={editTx}
          onClose={() => setEditTx(null)}
          onSaved={() => hook.refresh()}
        />
      )}

      {/* ── Merge transactions modal ────────────────────────────────────────── */}
      {mergeTxs && mergeTxs.length >= 2 && (
        <MergeTransactionsModal
          transactions={mergeTxs}
          onClose={() => setMergeTxs(null)}
          onMerged={() => { setMergeTxs(null); hook.refresh(); }}
        />
      )}
    </div>
  );
}

export default function FinancePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16 text-gray-400 text-sm">טוען...</div>}>
      <FinancePageInner />
    </Suspense>
  );
}
