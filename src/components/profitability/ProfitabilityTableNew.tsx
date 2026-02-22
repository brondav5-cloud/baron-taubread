"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Truck, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { formatNumber, formatCurrency } from "@/lib/calculations";
import type {
  StoreProfitRow,
  SortField,
  ProfitType,
} from "@/hooks/useProfitabilityPage";
import { PROFIT_TYPE_LABELS } from "@/hooks/useProfitabilityPage";

interface Props {
  stores: StoreProfitRow[];
  totals: {
    count: number;
    sales: number;
    qty: number;
    profit: number;
    avgMargin: number;
  };
  selectedIds: Set<number>;
  sortField: SortField;
  profitType: ProfitType;
  currentPage: number;
  pageSize: number | "all";
  totalPages: number;
  onToggleSort: (field: SortField) => void;
  onToggleSelection: (id: number) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number | "all") => void;
  getProfit: (store: StoreProfitRow) => number;
  getMargin: (store: StoreProfitRow) => number;
}

const PAGE_SIZES = [25, 50, 100, "all"] as const;

export function ProfitabilityTableNew({
  stores,
  totals,
  selectedIds,
  sortField,
  profitType,
  currentPage,
  pageSize,
  totalPages,
  onToggleSort,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  onPageChange,
  onPageSizeChange,
  getProfit,
  getMargin,
}: Props) {
  const [expandedStoreId, setExpandedStoreId] = useState<number | null>(null);

  const SortHeader = ({
    field,
    children,
    className = "",
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => (
    <th
      className={clsx(
        "px-3 py-3 font-semibold text-gray-600 text-sm",
        className,
      )}
    >
      <button
        onClick={() => onToggleSort(field)}
        className="flex items-center gap-1 hover:text-blue-600 mx-auto transition-colors"
      >
        {children}
        <ArrowUpDown
          className={clsx(
            "w-3.5 h-3.5",
            sortField === field ? "text-blue-600" : "text-gray-400",
          )}
        />
      </button>
    </th>
  );

  const allSelected =
    stores.length > 0 && stores.every((s) => selectedIds.has(s.id));

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
      {/* Table Header Bar */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-gray-50 to-white border-b">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold text-gray-900">
            רווחיות לפי חנויות
          </h3>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            {totals.count} חנויות
          </span>
          {selectedIds.size > 0 && (
            <button
              onClick={onClearSelection}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              ✕ בטל בחירה ({selectedIds.size})
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">הצג:</span>
          <select
            value={pageSize}
            onChange={(e) =>
              onPageSizeChange(
                e.target.value === "all" ? "all" : parseInt(e.target.value),
              )
            }
            className="px-3 py-2 text-sm bg-gray-100 border-0 rounded-xl font-medium"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size === "all" ? "הכל" : size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {/* Summary Row - Under Headers */}
            <tr className="bg-gradient-to-r from-blue-50 to-green-50 border-b-2 border-blue-200">
              <td className="px-3 py-3"></td>
              <td className="px-3 py-3"></td>
              <td className="px-3 py-3 text-right">
                <span className="text-xs text-gray-500 block">סה״כ</span>
                <span className="font-bold text-gray-900">
                  {totals.count} חנויות
                </span>
              </td>
              <td className="px-3 py-3 text-center">-</td>
              <td className="px-3 py-3 text-center">
                <span className="text-xs text-gray-500 block">סה״כ יחידות</span>
                <span className="font-bold text-gray-900">
                  {formatNumber(totals.qty)}
                </span>
              </td>
              <td className="px-3 py-3 text-center">
                <span className="text-xs text-gray-500 block">סה״כ מחזור</span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(totals.sales)}
                </span>
              </td>
              <td className="px-3 py-3 text-center">-</td>
              <td className="px-3 py-3 text-center">
                <span className="text-xs text-gray-500 block">ממוצע</span>
                <span className="font-bold text-blue-600">
                  {totals.avgMargin.toFixed(1)}%
                </span>
              </td>
              <td className="px-3 py-3 text-center bg-green-100/50">
                <span className="text-xs text-gray-500 block">סה״כ רווח</span>
                <span
                  className={clsx(
                    "font-bold text-lg",
                    totals.profit >= 0 ? "text-green-600" : "text-red-600",
                  )}
                >
                  {formatCurrency(totals.profit)}
                </span>
              </td>
              <td className="px-3 py-3"></td>
            </tr>

            {/* Column Headers */}
            <tr className="bg-gray-50 border-b">
              <th className="px-3 py-3 w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() =>
                    allSelected ? onClearSelection() : onSelectAll()
                  }
                  className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                />
              </th>
              <th className="px-3 py-3 text-right font-semibold text-gray-600 text-sm w-12">
                #
              </th>
              <SortHeader field="name" className="text-right min-w-[180px]">
                חנות
              </SortHeader>
              <SortHeader field="city" className="text-center">
                עיר
              </SortHeader>
              <SortHeader field="qty" className="text-center">
                כמות
              </SortHeader>
              <SortHeader field="sales" className="text-center">
                מחזור
              </SortHeader>
              <SortHeader field="returns" className="text-center">
                החזרות
              </SortHeader>
              <SortHeader field="margin" className="text-center">
                רווחיות
              </SortHeader>
              <SortHeader field="profit" className="text-center bg-green-50">
                רווח {PROFIT_TYPE_LABELS[profitType]}
              </SortHeader>
              <th className="w-12"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {stores.map((store, idx) => {
              const profit = getProfit(store);
              const margin = getMargin(store);
              const rank =
                pageSize === "all"
                  ? idx + 1
                  : (currentPage - 1) * (pageSize as number) + idx + 1;
              const isSelected = selectedIds.has(store.id);
              const isExpanded = expandedStoreId === store.id;

              return (
                <tr
                  key={store.id}
                  className={clsx(
                    "hover:bg-gray-50 transition-colors",
                    isSelected && "bg-blue-50/50",
                    isExpanded && "bg-blue-50",
                  )}
                >
                  <td className="px-3 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelection(store.id)}
                      className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-3.5 text-center text-gray-400 text-sm font-medium">
                    {rank}
                  </td>
                  <td className="px-3 py-3.5">
                    <Link
                      href={`/dashboard/stores/${store.id}`}
                      className="block group"
                    >
                      <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate max-w-[200px]">
                        {store.name}
                      </p>
                      {store.driverGroup && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Truck className="w-3 h-3" /> {store.driverGroup}
                        </p>
                      )}
                    </Link>
                  </td>
                  <td className="px-3 py-3.5 text-center text-gray-600">
                    {store.city}
                  </td>
                  <td className="px-3 py-3.5 text-center font-medium text-gray-900">
                    {formatNumber(store.qty)}
                  </td>
                  <td className="px-3 py-3.5 text-center font-medium text-gray-900">
                    {formatCurrency(store.sales)}
                  </td>
                  <td className="px-3 py-3.5 text-center">
                    <span
                      className={clsx(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        store.returns > 15
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600",
                      )}
                    >
                      {store.returns.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-center">
                    <span
                      className={clsx(
                        "font-bold",
                        margin >= 25
                          ? "text-green-600"
                          : margin >= 15
                            ? "text-blue-600"
                            : "text-orange-600",
                      )}
                    >
                      {margin.toFixed(1)}%
                    </span>
                  </td>
                  <td
                    className={clsx(
                      "px-3 py-3.5 text-center font-bold",
                      profit >= 0
                        ? "text-green-600 bg-green-50/30"
                        : "text-red-600 bg-red-50/30",
                    )}
                  >
                    {formatCurrency(profit)}
                  </td>
                  <td className="px-3 py-3.5">
                    <button
                      onClick={() =>
                        setExpandedStoreId(isExpanded ? null : store.id)
                      }
                      className={clsx(
                        "p-1 rounded-lg transition-all",
                        isExpanded
                          ? "text-blue-600 bg-blue-100 rotate-180"
                          : "text-gray-400 hover:text-blue-600 hover:bg-blue-50",
                      )}
                      title="הצג רווחיות לפי מוצרים"
                    >
                      <ChevronDown className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageSize !== "all" && totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-4 border-t bg-gray-50">
          <span className="text-sm text-gray-600">
            עמוד <span className="font-semibold">{currentPage}</span> מתוך{" "}
            <span className="font-semibold">{totalPages}</span>
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium bg-white border rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              הקודם
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium bg-white border rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              הבא
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
