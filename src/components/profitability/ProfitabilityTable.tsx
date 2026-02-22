"use client";

import Link from "next/link";
import { ChevronLeft, ArrowUpDown, Truck } from "lucide-react";
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
  totals: { count: number; sales: number; qty: number; profit: number };
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

export function ProfitabilityTable({
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
  const SortHeader = ({
    field,
    children,
    className = "",
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => (
    <th className={clsx("px-3 py-3 font-semibold text-gray-700", className)}>
      <button
        onClick={() => onToggleSort(field)}
        className="flex items-center gap-1 hover:text-blue-600 mx-auto"
      >
        {children}
        <ArrowUpDown
          className={clsx("w-4 h-4", sortField === field && "text-blue-600")}
        />
      </button>
    </th>
  );

  const allSelected =
    stores.length > 0 && stores.every((s) => selectedIds.has(s.id));

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <span className="text-base text-gray-600">
            <span className="font-bold text-gray-900">{totals.count}</span>{" "}
            חנויות
          </span>
          {selectedIds.size > 0 && (
            <button
              onClick={onClearSelection}
              className="text-sm text-blue-600 hover:underline"
            >
              בטל בחירה ({selectedIds.size})
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">הצג:</span>
          <select
            value={pageSize}
            onChange={(e) =>
              onPageSizeChange(
                e.target.value === "all" ? "all" : parseInt(e.target.value),
              )
            }
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg"
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
        <table className="w-full text-[15px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() =>
                    allSelected ? onClearSelection() : onSelectAll()
                  }
                  className="w-5 h-5 rounded border-gray-300 cursor-pointer"
                />
              </th>
              <th className="px-3 py-3 text-right font-semibold text-gray-700 w-14">
                #
              </th>
              <SortHeader field="name" className="text-right min-w-[180px]">
                חנות
              </SortHeader>
              <SortHeader field="city" className="text-center">
                עיר
              </SortHeader>
              <SortHeader field="qty" className="text-center">
                כמות 2025
              </SortHeader>
              <SortHeader field="sales" className="text-center">
                מחזור 2025
              </SortHeader>
              <SortHeader field="returns" className="text-center">
                החזרות %
              </SortHeader>
              <SortHeader field="margin" className="text-center">
                רווחיות %
              </SortHeader>
              <SortHeader field="profit" className="text-center bg-green-50">
                רווח {PROFIT_TYPE_LABELS[profitType]}
              </SortHeader>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stores.map((store, idx) => {
              const profit = getProfit(store);
              const margin = getMargin(store);
              const rank =
                pageSize === "all"
                  ? idx + 1
                  : (currentPage - 1) * pageSize + idx + 1;
              const isSelected = selectedIds.has(store.id);

              return (
                <tr
                  key={store.id}
                  className={clsx(
                    "hover:bg-gray-50",
                    isSelected && "bg-blue-50",
                  )}
                >
                  <td className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelection(store.id)}
                      className="w-5 h-5 rounded border-gray-300 cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-3 text-center text-gray-500 font-medium">
                    {rank}
                  </td>
                  <td className="px-3 py-3">
                    <div className="max-w-[200px]">
                      <p
                        className="font-semibold text-gray-900 truncate"
                        title={store.name}
                      >
                        {store.name}
                      </p>
                      {store.driverGroup && (
                        <p className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
                          <Truck className="w-3 h-3" /> {store.driverGroup}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center text-gray-700">
                    {store.city}
                  </td>
                  <td className="px-3 py-3 text-center font-medium text-gray-900">
                    {formatNumber(store.qty)}
                  </td>
                  <td className="px-3 py-3 text-center font-medium text-gray-900">
                    {formatCurrency(store.sales)}
                  </td>
                  <td
                    className={clsx(
                      "px-3 py-3 text-center font-medium",
                      store.returns > 15 ? "text-red-600" : "text-gray-600",
                    )}
                  >
                    {store.returns.toFixed(1)}%
                  </td>
                  <td
                    className={clsx(
                      "px-3 py-3 text-center font-bold",
                      margin >= 0 ? "text-blue-600" : "text-red-600",
                    )}
                  >
                    {margin.toFixed(1)}%
                  </td>
                  <td
                    className={clsx(
                      "px-3 py-3 text-center font-bold",
                      profit >= 0
                        ? "text-green-600 bg-green-50/50"
                        : "text-red-600 bg-red-50/50",
                    )}
                  >
                    {formatCurrency(profit)}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/dashboard/stores/${store.id}`}
                      className="text-gray-400 hover:text-blue-600"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-100 font-semibold text-[15px]">
            <tr>
              <td colSpan={4} className="px-3 py-3 text-right text-gray-700">
                סה״כ {totals.count} חנויות
              </td>
              <td className="px-3 py-3 text-center text-gray-900">
                {formatNumber(totals.qty)}
              </td>
              <td className="px-3 py-3 text-center text-gray-900">
                {formatCurrency(totals.sales)}
              </td>
              <td className="px-3 py-3 text-center">-</td>
              <td className="px-3 py-3 text-center">-</td>
              <td
                className={clsx(
                  "px-3 py-3 text-center",
                  totals.profit >= 0
                    ? "text-green-600 bg-green-100"
                    : "text-red-600 bg-red-100",
                )}
              >
                {formatCurrency(totals.profit)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagination */}
      {pageSize !== "all" && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-sm text-gray-600">
            עמוד {currentPage} מתוך {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              הקודם
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              הבא
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
