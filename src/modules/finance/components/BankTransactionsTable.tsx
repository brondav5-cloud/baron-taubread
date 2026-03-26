"use client";

import { memo, useState, useEffect, useRef } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, X, Filter } from "lucide-react";
import type { BankTransaction, BankCategory, SourceBank } from "../types";
import type { SortBy, SortDir } from "../hooks/useBankTransactions";

const BANK_LABELS: Record<SourceBank, { label: string; color: string }> = {
  leumi: { label: "לאומי", color: "bg-blue-100 text-blue-700" },
  hapoalim: { label: "הפועלים", color: "bg-orange-100 text-orange-700" },
  mizrahi: { label: "מזרחי", color: "bg-yellow-100 text-yellow-700" },
};

const CAT_TYPE_COLOR: Record<string, string> = {
  income:   "bg-green-100 text-green-700",
  expense:  "bg-red-100 text-red-700",
  transfer: "bg-blue-100 text-blue-700",
  ignore:   "bg-gray-100 text-gray-400",
};

function fmt(n: number): string {
  return n.toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

interface Props {
  transactions: BankTransaction[];
  categories?: BankCategory[];
  isLoading: boolean;
  sortBy?: SortBy;
  sortDir?: SortDir;
  onSort?: (col: SortBy) => void;
  onRowClick?: (tx: BankTransaction) => void;
  /** Maps transaction_id → split count (from useBankTransactions) */
  splitCounts?: Map<string, number>;
  // Inline filter props
  searchFilter?: string;
  categoryFilter?: string;
  onSearchChange?: (v: string) => void;
  onCategoryChange?: (v: string) => void;
}

function SortIcon({ col, sortBy, sortDir }: { col: SortBy; sortBy?: SortBy; sortDir?: SortDir }) {
  if (sortBy !== col) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300 inline ml-1" />;
  return sortDir === "asc"
    ? <ChevronUp className="w-3.5 h-3.5 text-blue-500 inline ml-1" />
    : <ChevronDown className="w-3.5 h-3.5 text-blue-500 inline ml-1" />;
}

export const BankTransactionsTable = memo(function BankTransactionsTable({
  transactions,
  categories = [],
  isLoading,
  sortBy,
  sortDir,
  onSort,
  onRowClick,
  splitCounts,
  searchFilter = "",
  categoryFilter = "",
  onSearchChange,
  onCategoryChange,
}: Props) {
  const catMap = new Map(categories.map((c) => [c.id, c]));

  const [showFilters, setShowFilters] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchFilter);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const hasActiveFilters = searchFilter !== "" || categoryFilter !== "";
  const isFiltersOpen = showFilters || hasActiveFilters;

  // Debounce search → parent
  useEffect(() => {
    const t = setTimeout(() => { onSearchChange?.(localSearch); }, 400);
    return () => clearTimeout(t);
  }, [localSearch, onSearchChange]);

  // Sync when parent clears the filter externally
  useEffect(() => {
    if (searchFilter === "" && localSearch !== "") setLocalSearch("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchFilter]);

  // Auto-focus search input when filter row opens
  useEffect(() => {
    if (isFiltersOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [isFiltersOpen]);

  const clearAllFilters = () => {
    setLocalSearch("");
    onSearchChange?.("");
    onCategoryChange?.("");
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div key={i} className={`flex gap-4 px-4 py-3 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
            {[80, 160, 120, 90, 90, 100].map((w, j) => (
              <div key={j} className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: w }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0 && !hasActiveFilters) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-center py-16 text-gray-400">
        <p className="font-medium">אין תנועות להצגה</p>
        <p className="text-sm mt-1">העלה קובץ תנועות בנק כדי להתחיל</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right" dir="rtl">
          <thead>
            {/* ── Sort headers row ── */}
            <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-semibold uppercase tracking-wide">
              <th
                className="px-4 py-3 whitespace-nowrap cursor-pointer hover:text-gray-700 select-none"
                onClick={() => onSort?.("date")}
              >
                תאריך<SortIcon col="date" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th className="px-4 py-3">תיאור</th>
              <th className="px-4 py-3 hidden md:table-cell">אסמכתא</th>
              <th
                className="px-4 py-3 text-left whitespace-nowrap cursor-pointer hover:text-gray-700 select-none"
                onClick={() => onSort?.("debit")}
              >
                חובה ₪<SortIcon col="debit" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th
                className="px-4 py-3 text-left whitespace-nowrap cursor-pointer hover:text-gray-700 select-none"
                onClick={() => onSort?.("credit")}
              >
                זכות ₪<SortIcon col="credit" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th
                className="px-4 py-3 text-left whitespace-nowrap hidden lg:table-cell cursor-pointer hover:text-gray-700 select-none"
                onClick={() => onSort?.("balance")}
              >
                יתרה ₪<SortIcon col="balance" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th className="px-4 py-3 hidden lg:table-cell">קטגוריה</th>
              <th className="px-4 py-3 hidden md:table-cell">
                <div className="flex items-center justify-between gap-2">
                  <span>בנק</span>
                  <button
                    onClick={() => setShowFilters((v) => !v)}
                    title={isFiltersOpen ? "הסתר סינון" : "סנן"}
                    className={`p-1 rounded transition-colors ${
                      isFiltersOpen
                        ? "bg-blue-100 text-blue-600"
                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                  </button>
                </div>
              </th>
            </tr>

            {/* ── Inline filter row ── */}
            {isFiltersOpen && (
              <tr className="bg-blue-50/40 border-b border-blue-100 text-xs">
                <th className="px-2 py-1.5" />
                <th className="px-2 py-1.5">
                  <div className="relative" dir="rtl">
                    <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={localSearch}
                      onChange={(e) => setLocalSearch(e.target.value)}
                      placeholder="חפש תיאור / אסמכתא..."
                      className="w-full border border-blue-200 rounded-md pr-6 pl-6 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white placeholder:text-gray-400"
                    />
                    {localSearch && (
                      <button
                        onClick={() => setLocalSearch("")}
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </th>
                <th className="px-2 py-1.5 hidden md:table-cell" />
                <th className="px-2 py-1.5" />
                <th className="px-2 py-1.5" />
                <th className="px-2 py-1.5 hidden lg:table-cell" />
                <th className="px-2 py-1.5 hidden lg:table-cell">
                  {categories.length > 0 && (
                    <select
                      value={categoryFilter}
                      onChange={(e) => onCategoryChange?.(e.target.value)}
                      className="w-full border border-blue-200 rounded-md px-1.5 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                    >
                      <option value="">כל הקטגוריות</option>
                      <option value="none">ללא קטגוריה</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </th>
                <th className="px-2 py-1.5 hidden md:table-cell">
                  {hasActiveFilters && (
                    <button
                      onClick={clearAllFilters}
                      className="flex items-center gap-0.5 text-xs text-red-400 hover:text-red-600 font-normal whitespace-nowrap"
                    >
                      <X className="w-3 h-3" />
                      נקה
                    </button>
                  )}
                </th>
              </tr>
            )}
          </thead>

          <tbody className="divide-y divide-gray-50">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  <p className="font-medium">לא נמצאו תנועות לפי הסינון</p>
                  <button onClick={clearAllFilters} className="text-sm text-blue-500 hover:underline mt-1">נקה סינון</button>
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const isDebit = tx.debit > 0;
                const isCredit = tx.credit > 0;
                const bankInfo = BANK_LABELS[tx.source_bank];
                const cat = tx.category_id ? catMap.get(tx.category_id) : undefined;
                const splitCount = splitCounts?.get(tx.id) ?? 0;

                return (
                  <tr
                    key={tx.id}
                    onClick={() => onRowClick?.(tx)}
                    className={`transition-colors ${onRowClick ? "cursor-pointer" : ""} ${
                      isDebit ? "bg-red-50/30 hover:bg-red-50" : isCredit ? "bg-green-50/30 hover:bg-green-50" : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap font-mono text-xs">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-4 py-3">
                      {tx.supplier_name ? (
                        <>
                          <p className="font-medium text-gray-800 truncate max-w-[200px]">{tx.supplier_name}</p>
                          <p className="text-xs text-teal-500 truncate max-w-[200px]">{tx.description}</p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-gray-800 truncate max-w-[200px]">{tx.description}</p>
                          {tx.details && (
                            <p className="text-xs text-gray-400 truncate max-w-[200px]">{tx.details}</p>
                          )}
                        </>
                      )}
                     {splitCount > 0 && (
                       <span
                         className="inline-flex items-center gap-0.5 mt-0.5 text-[10px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-1.5 py-0.5"
                         title={`תנועה זו מפוצלת ל-${splitCount} שורות — לחץ לפרטים`}
                       >
                         ⬡ {splitCount} פיצולים
                       </span>
                     )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-400 text-xs font-mono">
                      {tx.reference}
                    </td>
                    <td className="px-4 py-3 text-left">
                      {isDebit && (
                        <span className="text-red-600 font-semibold font-mono">{fmt(tx.debit)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-left">
                      {isCredit && (
                        <span className="text-green-600 font-semibold font-mono">{fmt(tx.credit)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-left hidden lg:table-cell">
                      {tx.balance != null && (
                        <span className={`font-mono text-xs ${tx.balance < 0 ? "text-red-500" : "text-gray-500"}`}>
                          {fmt(tx.balance)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {cat && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_TYPE_COLOR[cat.type] ?? "bg-gray-100 text-gray-500"}`}>
                          {cat.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {bankInfo && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bankInfo.color}`}>
                          {bankInfo.label}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});
