"use client";

import { RefreshCw } from "lucide-react";
import type { BankTransactionFilters } from "../hooks/useBankTransactions";
import type { BankAccount, SourceBank } from "../types";

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

interface Props {
  filters: BankTransactionFilters;
  accounts: BankAccount[];
  availableYears: number[];
  selectedFilterYear: number;
  selectedMonth: number | null;
  isLoading: boolean;
  onFiltersChange: (f: BankTransactionFilters | ((prev: BankTransactionFilters) => BankTransactionFilters)) => void;
  onYearChange: (yr: number) => void;
  onMonthChange: (month: number | null) => void;
  /** Clears only the month-button highlight without touching the date range fields */
  onClearMonthHighlight: () => void;
  onRefresh: () => void;
}

export function BankTransactionsFilterBar({
  filters,
  accounts,
  availableYears,
  selectedFilterYear,
  selectedMonth,
  isLoading,
  onFiltersChange,
  onYearChange,
  onMonthChange,
  onClearMonthHighlight,
  onRefresh,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      {/* Year selector */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-xs text-gray-400 font-medium ml-1">שנה:</span>
        {availableYears.map((yr) => (
          <button
            key={yr}
            onClick={() => onYearChange(yr)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
              selectedFilterYear === yr
                ? "bg-blue-700 text-white border-blue-700"
                : "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-700"
            }`}
          >
            {yr}
          </button>
        ))}
      </div>

      {/* Month selector */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-xs text-gray-400 font-medium ml-1">חודש:</span>
        {MONTH_NAMES.map((name, idx) => (
          <button
            key={idx}
            onClick={() => onMonthChange(selectedMonth === idx ? null : idx)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              selectedMonth === idx
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Main filter row */}
      <div className="flex flex-wrap gap-2 items-center">
        {accounts.length > 1 && (
          <select
            value={filters.bankAccountId}
            onChange={(e) => onFiltersChange((f) => ({ ...f, bankAccountId: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          >
            <option value="">כל החשבונות</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.display_name}</option>
            ))}
          </select>
        )}

        <select
          value={filters.sourceBank}
          onChange={(e) => onFiltersChange((f) => ({ ...f, sourceBank: e.target.value as SourceBank | "" }))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
        >
          {BANK_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Debit / Credit toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
          {(["all", "debit", "credit"] as const).map((type) => (
            <button
              key={type}
              onClick={() => onFiltersChange((f) => ({ ...f, amountType: type }))}
              className={`px-3 py-2 transition-colors border-r last:border-r-0 border-gray-200 ${
                filters.amountType === type
                  ? type === "debit"
                    ? "bg-red-500 text-white"
                    : type === "credit"
                      ? "bg-green-500 text-white"
                      : "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {type === "all" ? "הכל" : type === "debit" ? "חובה" : "זכות"}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-400 font-medium">מתאריך</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => {
              onClearMonthHighlight();
              onFiltersChange((f) => ({ ...f, dateFrom: e.target.value }));
            }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          />
        </div>

        <span className="text-gray-400 text-sm mt-4">—</span>

        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-400 font-medium">עד תאריך</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => {
              onClearMonthHighlight();
              onFiltersChange((f) => ({ ...f, dateTo: e.target.value }));
            }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          />
        </div>

        <button
          onClick={onRefresh}
          className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 transition-colors mt-4"
          title="רענן"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>
    </div>
  );
}
