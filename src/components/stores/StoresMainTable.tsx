"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { clsx } from "clsx";
import {
  formatNumber,
  formatPercent,
  getMetricColor,
} from "@/lib/calculations";
import { calcMonthlyTotals, type MonthSelection } from "@/components/ui";
import {
  STATUS_DISPLAY_LONG,
  STATUS_DISPLAY_SHORT,
  STATUS_COLORS_LONG,
  STATUS_COLORS_SHORT,
  type StoreWithStatus,
} from "@/types/data";
import { SortIcon } from "./SortIcon";
import { StoresPagination } from "./StoresPagination";
import { StoreTablesView, StoreRowsView } from "./table-modes";
import type {
  ViewMode,
  SortKey,
  SortDirection,
  TotalsData,
} from "@/hooks/useStoresPage";

interface StoresMainTableProps {
  stores: StoreWithStatus[];
  paginatedStores: StoreWithStatus[];
  filteredStores: StoreWithStatus[];
  viewMode: ViewMode;
  isCompare: boolean;
  displayMode: "rows" | "columns" | "tables";
  monthSelection: MonthSelection;
  sortKey: SortKey | null;
  sortDirection: SortDirection;
  selectedStoreIds: Set<number>;
  totals: TotalsData | null;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onSort: (key: SortKey) => void;
  onToggleStoreSelection: (storeId: number) => void;
  onSelectAllStores: () => void;
  onClearStoreSelection: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  calcChange: (a: number, b: number) => number;
  getMonthsLabel: (months: string[]) => string;
}

export function StoresMainTable({
  stores,
  paginatedStores,
  filteredStores,
  viewMode,
  isCompare,
  displayMode,
  monthSelection,
  sortKey,
  sortDirection,
  selectedStoreIds,
  totals,
  currentPage,
  totalPages,
  pageSize,
  onSort,
  onToggleStoreSelection,
  onSelectAllStores,
  onClearStoreSelection,
  onPageChange,
  onPageSizeChange,
  calcChange,
  getMonthsLabel,
}: StoresMainTableProps) {
  // Sortable header component
  const SortableHeader = ({
    sortKeyVal,
    children,
    className = "",
  }: {
    sortKeyVal: SortKey;
    children: React.ReactNode;
    className?: string;
  }) => (
    <th
      className={clsx(
        "px-3 py-3 text-center cursor-pointer hover:bg-white/10 transition-colors select-none",
        className,
      )}
      onClick={() => onSort(sortKeyVal)}
    >
      {children}
      <SortIcon direction={sortKey === sortKeyVal ? sortDirection : null} />
    </th>
  );

  // TABLES MODE - Two separate tables
  if (viewMode === "data" && isCompare && displayMode === "tables") {
    return (
      <StoreTablesView
        stores={filteredStores}
        mainMonths={monthSelection.months}
        compareMonths={monthSelection.compareMonths}
        mainLabel={getMonthsLabel(monthSelection.months)}
        compareLabel={getMonthsLabel(monthSelection.compareMonths)}
      />
    );
  }

  // ROWS MODE - Multiple rows per store
  if (viewMode === "data" && isCompare && displayMode === "rows") {
    return (
      <StoreRowsView
        stores={filteredStores}
        monthSelection={monthSelection}
        calcChange={calcChange}
      />
    );
  }

  // Render table headers based on mode
  const renderHeaders = () => {
    if (viewMode === "metrics") {
      return (
        <>
          <SortableHeader sortKeyVal="status_long">
            <div>סטטוס</div>
            <div className="text-xs opacity-75">ארוך</div>
          </SortableHeader>
          <SortableHeader sortKeyVal="metric_12v12">
            <div>שנתי</div>
            <div className="text-xs opacity-75 font-normal">
              ינו 24 - ינו 25
            </div>
          </SortableHeader>
          <SortableHeader sortKeyVal="metric_3v3">
            <div>3 חודשים</div>
            <div className="text-xs opacity-75 font-normal">נוב-ינו</div>
          </SortableHeader>
          <SortableHeader sortKeyVal="metric_6v6">
            <div>6 חודשים</div>
            <div className="text-xs opacity-75 font-normal">אוג-ינו</div>
          </SortableHeader>
          <SortableHeader sortKeyVal="metric_2v2">
            <div>2 חודשים</div>
            <div className="text-xs opacity-75 font-normal">דצמ-ינו</div>
          </SortableHeader>
          <SortableHeader sortKeyVal="status_short">
            <div>סטטוס</div>
            <div className="text-xs opacity-75">קצר</div>
          </SortableHeader>
          <SortableHeader sortKeyVal="metric_peak_distance">
            <div>מרחק</div>
            <div className="text-xs opacity-75 font-normal">מהשיא</div>
          </SortableHeader>
          <SortableHeader sortKeyVal="returns_pct_last6">
            <div>החזרות</div>
            <div className="text-xs opacity-75 font-normal">6 חודשים</div>
          </SortableHeader>
        </>
      );
    }
    if (isCompare) {
      return (
        <>
          <SortableHeader sortKeyVal="gross" className="bg-primary-600">
            ברוטו
          </SortableHeader>
          <th className="px-3 py-3 text-center bg-orange-500">ברוטו הש׳</th>
          <th className="px-3 py-3 text-center">%</th>
          <SortableHeader sortKeyVal="qty" className="bg-primary-600">
            נטו
          </SortableHeader>
          <th className="px-3 py-3 text-center bg-orange-500">נטו הש׳</th>
          <th className="px-3 py-3 text-center">%</th>
          <SortableHeader sortKeyVal="sales" className="bg-primary-600">
            מחזור
          </SortableHeader>
          <th className="px-3 py-3 text-center bg-orange-500">מחזור הש׳</th>
          <th className="px-3 py-3 text-center">%</th>
        </>
      );
    }
    return (
      <>
        <SortableHeader sortKeyVal="gross">ברוטו</SortableHeader>
        <SortableHeader sortKeyVal="qty">נטו</SortableHeader>
        <SortableHeader sortKeyVal="returns">חזרות</SortableHeader>
        <SortableHeader sortKeyVal="returns_pct_last6">חזרות %</SortableHeader>
        <SortableHeader sortKeyVal="sales">מחזור</SortableHeader>
        <th className="px-3 py-3 text-center">כמות 2024</th>
        <SortableHeader sortKeyVal="qty_2025">כמות 2025</SortableHeader>
        <SortableHeader sortKeyVal="sales_2025">מחזור 2025</SortableHeader>
      </>
    );
  };

  // Render summary row cells based on mode
  const renderSummaryCells = () => {
    if (!totals) return null;

    if (viewMode === "metrics") {
      return (
        <>
          <td className="px-3 py-3 text-center">-</td>
          <td className="px-3 py-3 text-center">
            <span className={getMetricColor(totals.metric_12v12)}>
              {formatPercent(totals.metric_12v12)}
            </span>
          </td>
          <td className="px-3 py-3 text-center">
            <span className={getMetricColor(totals.metric_3v3)}>
              {formatPercent(totals.metric_3v3)}
            </span>
          </td>
          <td className="px-3 py-3 text-center">
            <span className={getMetricColor(totals.metric_6v6)}>
              {formatPercent(totals.metric_6v6)}
            </span>
          </td>
          <td className="px-3 py-3 text-center">
            <span className={getMetricColor(totals.metric_2v2)}>
              {formatPercent(totals.metric_2v2)}
            </span>
          </td>
          <td className="px-3 py-3 text-center">-</td>
          <td className="px-3 py-3 text-center">
            <span className={getMetricColor(totals.metric_peak_distance)}>
              {formatPercent(totals.metric_peak_distance)}
            </span>
          </td>
          <td className="px-3 py-3 text-center text-red-600">
            {totals.returns_pct_last6.toFixed(1)}%
          </td>
        </>
      );
    }
    if (isCompare && totals.comp) {
      return (
        <>
          <td className="px-3 py-3 text-center text-primary-700">
            {formatNumber(totals.main.gross)}
          </td>
          <td className="px-3 py-3 text-center text-orange-600">
            {formatNumber(totals.comp.gross)}
          </td>
          <td className="px-3 py-3 text-center">
            <span
              className={
                calcChange(totals.main.gross, totals.comp.gross) >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }
            >
              {calcChange(totals.main.gross, totals.comp.gross).toFixed(1)}%
            </span>
          </td>
          <td className="px-3 py-3 text-center text-primary-700">
            {formatNumber(totals.main.qty)}
          </td>
          <td className="px-3 py-3 text-center text-orange-600">
            {formatNumber(totals.comp.qty)}
          </td>
          <td className="px-3 py-3 text-center">
            <span
              className={
                calcChange(totals.main.qty, totals.comp.qty) >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }
            >
              {calcChange(totals.main.qty, totals.comp.qty).toFixed(1)}%
            </span>
          </td>
          <td className="px-3 py-3 text-center text-primary-700">
            ₪{formatNumber(Math.round(totals.main.sales))}
          </td>
          <td className="px-3 py-3 text-center text-orange-600">
            ₪{formatNumber(Math.round(totals.comp.sales))}
          </td>
          <td className="px-3 py-3 text-center">
            <span
              className={
                calcChange(totals.main.sales, totals.comp.sales) >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }
            >
              {calcChange(totals.main.sales, totals.comp.sales).toFixed(1)}%
            </span>
          </td>
        </>
      );
    }
    return (
      <>
        <td className="px-3 py-3 text-center text-blue-700">
          {formatNumber(totals.main.gross)}
        </td>
        <td className="px-3 py-3 text-center text-green-700">
          {formatNumber(totals.main.qty)}
        </td>
        <td className="px-3 py-3 text-center text-red-600">
          {formatNumber(totals.main.returns)}
        </td>
        <td className="px-3 py-3 text-center">
          {totals.main.returnsPct.toFixed(1)}%
        </td>
        <td className="px-3 py-3 text-center text-purple-700">
          ₪{formatNumber(Math.round(totals.main.sales))}
        </td>
        <td className="px-3 py-3 text-center">-</td>
        <td className="px-3 py-3 text-center">-</td>
        <td className="px-3 py-3 text-center">-</td>
      </>
    );
  };

  // Render store row cells based on mode
  const renderStoreCells = (store: StoreWithStatus) => {
    const longColors = STATUS_COLORS_LONG[store.status_long];
    const shortColors = STATUS_COLORS_SHORT[store.status_short];
    const main = calcMonthlyTotals(store, monthSelection.months);
    const comp = isCompare
      ? calcMonthlyTotals(store, monthSelection.compareMonths)
      : null;

    if (viewMode === "metrics") {
      return (
        <>
          <td className="px-3 py-3 text-center">
            <span
              className={clsx(
                "px-2 py-1 rounded-full text-xs font-medium",
                longColors.bg,
                longColors.text,
              )}
            >
              {STATUS_DISPLAY_LONG[store.status_long]}
            </span>
          </td>
          <td className="px-3 py-3 text-center">
            <span
              className={clsx(
                "font-bold text-base",
                getMetricColor(store.metric_12v12),
              )}
            >
              {formatPercent(store.metric_12v12)}
            </span>
            <div className="text-sm text-gray-500 mt-0.5">
              {formatNumber(store.qty_2024)}→{formatNumber(store.qty_2025)}
            </div>
          </td>
          <td className="px-3 py-3 text-center">
            <span
              className={clsx(
                "font-bold text-base",
                getMetricColor(store.metric_3v3),
              )}
            >
              {formatPercent(store.metric_3v3)}
            </span>
          </td>
          <td className="px-3 py-3 text-center">
            <span
              className={clsx(
                "font-bold text-base",
                getMetricColor(store.metric_6v6),
              )}
            >
              {formatPercent(store.metric_6v6)}
            </span>
          </td>
          <td className="px-3 py-3 text-center">
            <span
              className={clsx(
                "font-bold text-base",
                getMetricColor(store.metric_2v2),
              )}
            >
              {formatPercent(store.metric_2v2)}
            </span>
          </td>
          <td className="px-3 py-3 text-center">
            <span
              className={clsx(
                "px-2 py-1 rounded-full text-xs font-medium",
                shortColors.bg,
                shortColors.text,
              )}
            >
              {STATUS_DISPLAY_SHORT[store.status_short]}
            </span>
          </td>
          <td className="px-3 py-3 text-center">
            <span
              className={clsx(
                "font-bold",
                getMetricColor(store.metric_peak_distance),
              )}
            >
              {formatPercent(store.metric_peak_distance)}
            </span>
          </td>
          <td className="px-3 py-3 text-center">
            <span
              className={
                store.returns_pct_last6 > 15 ? "text-red-600 font-bold" : ""
              }
            >
              {store.returns_pct_last6.toFixed(1)}%
            </span>
          </td>
        </>
      );
    }
    if (isCompare && comp) {
      return (
        <>
          <td className="px-3 py-3 text-center text-primary-700 font-medium">
            {formatNumber(main.gross)}
          </td>
          <td className="px-3 py-3 text-center text-orange-600">
            {formatNumber(comp.gross)}
          </td>
          <td className="px-3 py-3 text-center">
            <span
              className={clsx(
                "font-bold",
                calcChange(main.gross, comp.gross) >= 0
                  ? "text-green-600"
                  : "text-red-600",
              )}
            >
              {calcChange(main.gross, comp.gross).toFixed(1)}%
            </span>
          </td>
          <td className="px-3 py-3 text-center text-primary-700 font-medium">
            {formatNumber(main.qty)}
          </td>
          <td className="px-3 py-3 text-center text-orange-600">
            {formatNumber(comp.qty)}
          </td>
          <td className="px-3 py-3 text-center">
            <span
              className={clsx(
                "font-bold",
                calcChange(main.qty, comp.qty) >= 0
                  ? "text-green-600"
                  : "text-red-600",
              )}
            >
              {calcChange(main.qty, comp.qty).toFixed(1)}%
            </span>
          </td>
          <td className="px-3 py-3 text-center text-primary-700 font-medium">
            ₪{formatNumber(Math.round(main.sales))}
          </td>
          <td className="px-3 py-3 text-center text-orange-600">
            ₪{formatNumber(Math.round(comp.sales))}
          </td>
          <td className="px-3 py-3 text-center">
            <span
              className={clsx(
                "font-bold",
                calcChange(main.sales, comp.sales) >= 0
                  ? "text-green-600"
                  : "text-red-600",
              )}
            >
              {calcChange(main.sales, comp.sales).toFixed(1)}%
            </span>
          </td>
        </>
      );
    }
    return (
      <>
        <td className="px-3 py-3 text-center text-blue-700 font-medium">
          {formatNumber(main.gross)}
        </td>
        <td className="px-3 py-3 text-center text-green-700 font-medium">
          {formatNumber(main.qty)}
        </td>
        <td className="px-3 py-3 text-center text-red-600">
          {formatNumber(main.returns)}
        </td>
        <td className="px-3 py-3 text-center">
          <span
            className={main.returnsPct > 15 ? "text-red-600 font-bold" : ""}
          >
            {main.returnsPct.toFixed(1)}%
          </span>
        </td>
        <td className="px-3 py-3 text-center text-purple-700 font-medium">
          ₪{formatNumber(Math.round(main.sales))}
        </td>
        <td className="px-3 py-3 text-center">
          {formatNumber(store.qty_2024)}
        </td>
        <td className="px-3 py-3 text-center font-bold">
          {formatNumber(store.qty_2025)}
        </td>
        <td className="px-3 py-3 text-center font-bold">
          ₪{formatNumber(Math.round(store.sales_2025))}
        </td>
      </>
    );
  };

  // DEFAULT: COLUMNS MODE or Metrics mode or Non-compare data mode
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[15px]">
          <thead className="bg-primary-500 text-white">
            <tr>
              <th className="px-2 py-3 w-12">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded cursor-pointer"
                  checked={
                    selectedStoreIds.size === paginatedStores.length &&
                    paginatedStores.length > 0
                  }
                  onChange={(e) =>
                    e.target.checked
                      ? onSelectAllStores()
                      : onClearStoreSelection()
                  }
                />
              </th>
              <SortableHeader sortKeyVal="name" className="text-right">
                חנות
              </SortableHeader>
              {renderHeaders()}
              <th className="px-2 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {totals && (
              <tr className="bg-blue-50 border-b-2 border-blue-200 font-bold">
                <td className="px-2 py-3"></td>
                <td className="px-4 py-3 text-right text-blue-700">
                  Σ סה״כ {totals.count}
                </td>
                {renderSummaryCells()}
                <td className="px-2 py-3"></td>
              </tr>
            )}
            {paginatedStores.map((store) => (
              <tr
                key={store.id}
                className={clsx(
                  "border-b border-gray-100 hover:bg-gray-50",
                  selectedStoreIds.has(store.id) && "bg-purple-50",
                )}
              >
                <td className="px-2 py-3 text-center">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded cursor-pointer"
                    checked={selectedStoreIds.has(store.id)}
                    onChange={() => onToggleStoreSelection(store.id)}
                  />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/stores/${store.id}`}
                    className="hover:text-primary-600"
                  >
                    <div className="font-semibold text-gray-900">
                      {store.name}
                    </div>
                    <div className="text-sm text-gray-500">{store.city}</div>
                  </Link>
                </td>
                {renderStoreCells(store)}
                <td className="px-2 py-3">
                  <Link href={`/dashboard/stores/${store.id}`}>
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <StoresPagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={stores.length}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
      {stores.length === 0 && (
        <div className="p-12 text-center text-gray-500">לא נמצאו חנויות</div>
      )}
    </div>
  );
}
