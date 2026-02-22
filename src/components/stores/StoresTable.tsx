"use client";

import { memo, useMemo, useState, useCallback } from "react";

import { StoreRow } from "./StoreRow";
import {
  formatNumber,
  formatPercent,
  getMetricColor,
} from "@/lib/calculations";
import { calcMonthlyTotals, type MonthSelection } from "@/components/ui";
import type { StoreWithStatus } from "@/types/data";

// ============================================
// TYPES
// ============================================

type ViewMode = "metrics" | "data";

interface StoresTableProps {
  stores: StoreWithStatus[];
  viewMode: ViewMode;
  monthSelection: MonthSelection;
  isCompare: boolean;
}

// ============================================
// HELPERS
// ============================================

const calcChange = (a: number, b: number): number => {
  if (b === 0) return 0;
  return ((a - b) / b) * 100;
};

// ============================================
// SUMMARY ROW COMPONENT
// ============================================

interface SummaryRowProps {
  stores: StoreWithStatus[];
  viewMode: ViewMode;
  monthSelection: MonthSelection;
  isCompare: boolean;
}

const SummaryRow = memo(function SummaryRow({
  stores,
  viewMode,
  monthSelection,
  isCompare,
}: SummaryRowProps) {
  const totals = useMemo(() => {
    if (stores.length === 0) return null;

    const count = stores.length;
    let mainQty = 0,
      mainSales = 0,
      mainGross = 0,
      mainReturns = 0;
    let compQty = 0,
      compSales = 0,
      compGross = 0,
      compReturns = 0;

    stores.forEach((store) => {
      const main = calcMonthlyTotals(store, monthSelection.months);
      mainQty += main.qty;
      mainSales += main.sales;
      mainGross += main.gross;
      mainReturns += main.returns;

      if (isCompare) {
        const comp = calcMonthlyTotals(store, monthSelection.compareMonths);
        compQty += comp.qty;
        compSales += comp.sales;
        compGross += comp.gross;
        compReturns += comp.returns;
      }
    });

    return {
      count,
      metric_12v12: stores.reduce((s, x) => s + x.metric_12v12, 0) / count,
      metric_6v6: stores.reduce((s, x) => s + x.metric_6v6, 0) / count,
      metric_3v3: stores.reduce((s, x) => s + x.metric_3v3, 0) / count,
      metric_2v2: stores.reduce((s, x) => s + x.metric_2v2, 0) / count,
      metric_peak_distance:
        stores.reduce((s, x) => s + x.metric_peak_distance, 0) / count,
      returns_pct_last6:
        stores.reduce((s, x) => s + x.returns_pct_last6, 0) / count,
      main: {
        qty: mainQty,
        sales: mainSales,
        gross: mainGross,
        returns: mainReturns,
        returnsPct: mainGross > 0 ? (mainReturns / mainGross) * 100 : 0,
      },
      comp: isCompare
        ? {
            qty: compQty,
            sales: compSales,
            gross: compGross,
            returns: compReturns,
            returnsPct: compGross > 0 ? (compReturns / compGross) * 100 : 0,
          }
        : null,
    };
  }, [stores, monthSelection, isCompare]);

  if (!totals) return null;

  return (
    <tr className="bg-blue-50 border-b-2 border-blue-200 font-bold sticky top-0">
      <td className="px-2 py-3"></td>
      <td className="px-4 py-3 text-right text-blue-700">
        Σ סה״כ {totals.count}
      </td>

      {viewMode === "metrics" ? (
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
      ) : isCompare && totals.comp ? (
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
      ) : (
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
      )}
      <td className="px-2 py-3"></td>
    </tr>
  );
});

// ============================================
// MAIN TABLE COMPONENT
// ============================================

function StoresTableComponent({
  stores,
  viewMode,
  monthSelection,
  isCompare,
}: StoresTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const handleSelectStore = useCallback((id: number, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(
    (selected: boolean) => {
      if (selected) {
        setSelectedIds(new Set(stores.map((s) => s.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [stores],
  );

  const allSelected = stores.length > 0 && selectedIds.size === stores.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < stores.length;

  // Get column headers based on view mode
  const getHeaders = () => {
    if (viewMode === "metrics") {
      return (
        <>
          <th className="px-3 py-3 text-center font-medium">סטטוס</th>
          <th className="px-3 py-3 text-center font-medium">12v12</th>
          <th className="px-3 py-3 text-center font-medium">3v3</th>
          <th className="px-3 py-3 text-center font-medium">6v6</th>
          <th className="px-3 py-3 text-center font-medium">2v2</th>
          <th className="px-3 py-3 text-center font-medium">קצר</th>
          <th className="px-3 py-3 text-center font-medium">שיא</th>
          <th className="px-3 py-3 text-center font-medium">חזרות</th>
        </>
      );
    }

    if (isCompare) {
      return (
        <>
          <th className="px-3 py-3 text-center font-medium text-primary-700">
            ברוטו
          </th>
          <th className="px-3 py-3 text-center font-medium text-orange-600">
            ברוטו
          </th>
          <th className="px-3 py-3 text-center font-medium">Δ%</th>
          <th className="px-3 py-3 text-center font-medium text-primary-700">
            נטו
          </th>
          <th className="px-3 py-3 text-center font-medium text-orange-600">
            נטו
          </th>
          <th className="px-3 py-3 text-center font-medium">Δ%</th>
          <th className="px-3 py-3 text-center font-medium text-primary-700">
            מחזור
          </th>
          <th className="px-3 py-3 text-center font-medium text-orange-600">
            מחזור
          </th>
          <th className="px-3 py-3 text-center font-medium">Δ%</th>
        </>
      );
    }

    return (
      <>
        <th className="px-3 py-3 text-center font-medium">ברוטו</th>
        <th className="px-3 py-3 text-center font-medium">נטו</th>
        <th className="px-3 py-3 text-center font-medium">חזרות</th>
        <th className="px-3 py-3 text-center font-medium">%חזרות</th>
        <th className="px-3 py-3 text-center font-medium">מחזור</th>
        <th className="px-3 py-3 text-center font-medium">2024</th>
        <th className="px-3 py-3 text-center font-medium">2025</th>
        <th className="px-3 py-3 text-center font-medium">מכירות 25</th>
      </>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
              </th>
              <th className="px-4 py-3 text-right font-medium">חנות</th>
              {getHeaders()}
              <th className="px-2 py-3 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {/* Summary Row */}
            <SummaryRow
              stores={stores}
              viewMode={viewMode}
              monthSelection={monthSelection}
              isCompare={isCompare}
            />

            {/* Data Rows */}
            {stores.map((store) => (
              <StoreRow
                key={store.id}
                store={store}
                viewMode={viewMode}
                monthSelection={monthSelection}
                isCompare={isCompare}
                isSelected={selectedIds.has(store.id)}
                onSelect={handleSelectStore}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {stores.length === 0 && (
        <div className="p-12 text-center text-gray-500">
          <div className="text-4xl mb-2">🔍</div>
          <p>לא נמצאו חנויות התואמות לחיפוש</p>
        </div>
      )}

      {/* Selection Info */}
      {selectedIds.size > 0 && (
        <div className="border-t bg-primary-50 px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-primary-700">
            נבחרו {selectedIds.size} חנויות
          </span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-primary-600 hover:text-primary-800"
          >
            בטל בחירה
          </button>
        </div>
      )}
    </div>
  );
}

export const StoresTable = memo(StoresTableComponent);
export default StoresTable;
