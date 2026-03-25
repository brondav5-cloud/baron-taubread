"use client";

import { useState, useCallback } from "react";
import { Upload, Search, ChevronRight, ChevronLeft, RefreshCw } from "lucide-react";
import { useBankTransactions } from "@/modules/finance/hooks/useBankTransactions";
import { BankTransactionsTable } from "@/modules/finance/components/BankTransactionsTable";
import { UploadBankFileModal } from "@/modules/finance/components/UploadBankFileModal";
import { TransactionDetailModal } from "@/modules/finance/components/TransactionDetailModal";
import type { SourceBank, BankTransaction } from "@/modules/finance/types";

const BANK_OPTIONS: { value: SourceBank | ""; label: string }[] = [
  { value: "", label: "כל הבנקים" },
  { value: "leumi", label: "לאומי" },
  { value: "hapoalim", label: "הפועלים" },
  { value: "mizrahi", label: "מזרחי" },
];

export default function FinancePage() {
  const hook = useBankTransactions();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<BankTransaction | null>(null);
  const [searchInput, setSearchInput] = useState("");

  const totalPages = Math.ceil(hook.totalCount / hook.pageSize);

  const handleSearchCommit = useCallback(() => {
    hook.setFilters((f) => ({ ...f, search: searchInput }));
  }, [hook, searchInput]);

  const handleUploadSuccess = useCallback(() => {
    hook.refresh();
  }, [hook]);

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
        <button
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Upload className="w-4 h-4" />
          העלאת קובץ
        </button>
      </div>

      {/* ── Filters bar ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchCommit()}
            onBlur={handleSearchCommit}
            placeholder="חיפוש תיאור / אסמכתא..."
            className="w-full border border-gray-200 rounded-lg pr-9 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

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
        <input
          type="date"
          value={hook.filters.dateFrom}
          onChange={(e) =>
            hook.setFilters((f) => ({ ...f, dateFrom: e.target.value }))
          }
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
        />
        <span className="text-gray-400 text-sm">—</span>
        <input
          type="date"
          value={hook.filters.dateTo}
          onChange={(e) =>
            hook.setFilters((f) => ({ ...f, dateTo: e.target.value }))
          }
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
        />

        {/* Refresh */}
        <button
          onClick={hook.refresh}
          className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 transition-colors"
          title="רענן"
        >
          <RefreshCw className={`w-4 h-4 ${hook.isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {hook.error && (
        <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">
          שגיאה: {hook.error}
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <BankTransactionsTable
        transactions={hook.transactions}
        isLoading={hook.isLoading}
        onRowClick={setSelectedTx}
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
