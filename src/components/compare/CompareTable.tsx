"use client";

import { BarChart3, Table2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { clsx } from "clsx";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  MonthSelector,
  StatusBadgeLong,
  calcMonthlyTotals,
  type MonthSelection,
} from "@/components/ui";
import {
  formatPercent,
  formatNumber,
  getMetricColor,
} from "@/lib/calculations";
import { CHART_COLORS } from "@/hooks/useComparisonSupabase";
import { ChangeIndicator } from "./ChangeIndicator";
import type { ComparisonStore } from "@/hooks/useComparisonSupabase";

interface CompareTableProps {
  stores: ComparisonStore[];
  viewMode: "metrics" | "data";
  onViewModeChange: (mode: "metrics" | "data") => void;
  monthSelection: MonthSelection;
  onMonthSelectionChange: (selection: MonthSelection) => void;
  getPeriodLabel: (months: string[]) => string;
  metricsPeriodLabels?: {
    yearly: string;
    halfYear: string;
    quarter: string;
    twoMonths: string;
  } | null;
}

export function CompareTable({
  stores,
  viewMode,
  onViewModeChange,
  monthSelection,
  onMonthSelectionChange,
  getPeriodLabel,
  metricsPeriodLabels,
}: CompareTableProps) {
  if (stores.length < 2) return null;

  // Calculate totals for summary row
  const calcTotals = (monthList: string[]) => {
    let totalGross = 0,
      totalQty = 0,
      totalReturns = 0,
      totalSales = 0;
    stores.forEach((store) => {
      const data = calcMonthlyTotals(store, monthList);
      totalGross += data.gross;
      totalQty += data.qty;
      totalReturns += data.returns;
      totalSales += data.sales;
    });
    const returnsPct = totalGross > 0 ? (totalReturns / totalGross) * 100 : 0;
    return { totalGross, totalQty, totalReturns, totalSales, returnsPct };
  };

  const { months, compareMonths, isCompareMode, compareDisplayMode } =
    monthSelection;

  // ============================================
  // RENDER METRICS TABLE - STORES AS ROWS
  // ============================================
  const renderMetricsTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-right font-semibold text-gray-700 min-w-[180px]">
              חנות
            </th>
            <th className="px-3 py-3 text-center font-semibold text-gray-700">
              <div>{metricsPeriodLabels?.yearly || "12v12"}</div>
            </th>
            <th className="px-3 py-3 text-center font-semibold text-gray-700">
              <div>{metricsPeriodLabels?.halfYear || "6v6"}</div>
            </th>
            <th className="px-3 py-3 text-center font-semibold text-gray-700">
              <div>{metricsPeriodLabels?.quarter || "3v3"}</div>
            </th>
            <th className="px-3 py-3 text-center font-semibold text-gray-700">
              <div>{metricsPeriodLabels?.twoMonths || "2v2"}</div>
            </th>
            <th className="px-3 py-3 text-center font-semibold text-gray-700">
              מהשיא
            </th>
            <th className="px-3 py-3 text-center font-semibold text-gray-700">
              החזרות
            </th>
            <th className="px-3 py-3 text-center font-semibold text-gray-700">
              סטטוס
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {stores.map((store, index) => (
            <tr key={store.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor:
                        CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  />
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {store.name}
                    </div>
                    <div className="text-xs text-gray-500">{store.city}</div>
                  </div>
                </div>
              </td>
              <td
                className={clsx(
                  "px-3 py-3 text-center font-bold",
                  getMetricColor(store.metric_12v12),
                )}
              >
                {formatPercent(store.metric_12v12)}
              </td>
              <td
                className={clsx(
                  "px-3 py-3 text-center font-bold",
                  getMetricColor(store.metric_6v6),
                )}
              >
                {formatPercent(store.metric_6v6)}
              </td>
              <td
                className={clsx(
                  "px-3 py-3 text-center font-bold",
                  getMetricColor(store.metric_3v3),
                )}
              >
                {formatPercent(store.metric_3v3)}
              </td>
              <td
                className={clsx(
                  "px-3 py-3 text-center font-bold",
                  getMetricColor(store.metric_2v2),
                )}
              >
                {formatPercent(store.metric_2v2)}
              </td>
              <td
                className={clsx(
                  "px-3 py-3 text-center font-bold",
                  getMetricColor(store.metric_peak_distance),
                )}
              >
                {formatPercent(store.metric_peak_distance)}
              </td>
              <td
                className={clsx(
                  "px-3 py-3 text-center font-bold",
                  store.returns_pct_last6 > 15
                    ? "text-red-600"
                    : "text-gray-700",
                )}
              >
                {store.returns_pct_last6.toFixed(1)}%
              </td>
              <td className="px-3 py-3 text-center">
                <StatusBadgeLong
                  status={
                    store.status_long as
                      | "עליה_חדה"
                      | "צמיחה"
                      | "יציב"
                      | "ירידה"
                      | "התרסקות"
                  }
                  size="sm"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ============================================
  // RENDER DATA TABLE - ROWS MODE
  // תקופה עכשווית (months) = שמאל, תקופה קודמת (compareMonths) = ימין
  // בשורות: עכשו למעלה, קודם למטה
  // ============================================
  const renderRowsTable = () => {
    const main = calcTotals(months);
    const compare =
      isCompareMode && compareMonths.length > 0
        ? calcTotals(compareMonths)
        : null;
    const currentLabel = getPeriodLabel(months);
    const previousLabel =
      compareMonths.length > 0 ? getPeriodLabel(compareMonths) : "";

    return (
      <div className="space-y-2">
        {/* Period labels - ציון התקופות */}
        <div className="flex gap-6 text-sm text-gray-600 px-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary-500" />
            <strong>תקופה עכשווית:</strong> {currentLabel}
          </span>
          {previousLabel && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <strong>תקופה קודמת:</strong> {previousLabel}
            </span>
          )}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">
                חנות
              </th>
              {compare ? (
                <>
                  {/* תקופה קודמת - ימין (ליד חנות) */}
                  <th
                    colSpan={5}
                    className="px-2 py-2 text-center text-xs font-medium text-orange-700 bg-orange-50/50"
                  >
                    {previousLabel}
                  </th>
                  {/* תקופה עכשווית - שמאל */}
                  <th
                    colSpan={5}
                    className="px-2 py-2 text-center text-xs font-medium text-primary-700 bg-primary-50/50"
                  >
                    {currentLabel}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-green-700">
                    שינוי
                  </th>
                </>
              ) : (
                <>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">
                    ברוטו
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">
                    נטו
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">
                    חזרות
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">
                    חזרות %
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">
                    מחזור
                  </th>
                </>
              )}
            </tr>
            {compare && (
              <tr className="bg-gray-100 text-xs">
                <th></th>
                <th className="px-2 py-1 text-center text-orange-600">ברוטו</th>
                <th className="px-2 py-1 text-center text-orange-600">נטו</th>
                <th className="px-2 py-1 text-center text-orange-600">חזרות</th>
                <th className="px-2 py-1 text-center text-orange-600">
                  חזרות %
                </th>
                <th className="px-2 py-1 text-center text-orange-600">מחזור</th>
                <th className="px-2 py-1 text-center text-primary-600">
                  ברוטו
                </th>
                <th className="px-2 py-1 text-center text-primary-600">נטו</th>
                <th className="px-2 py-1 text-center text-primary-600">
                  חזרות
                </th>
                <th className="px-2 py-1 text-center text-primary-600">
                  חזרות %
                </th>
                <th className="px-2 py-1 text-center text-primary-600">
                  מחזור
                </th>
                <th></th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y">
            {/* Summary Row */}
            <tr className="bg-blue-50 font-bold">
              <td className="px-4 py-3 text-right text-blue-700">
                סה״כ {stores.length} חנויות
              </td>
              {compare ? (
                <>
                  <td className="px-2 py-3 text-center text-orange-700 bg-orange-50/30">
                    {formatNumber(compare.totalGross)}
                  </td>
                  <td className="px-2 py-3 text-center text-orange-700 bg-orange-50/30">
                    {formatNumber(compare.totalQty)}
                  </td>
                  <td className="px-2 py-3 text-center text-orange-700 bg-orange-50/30">
                    {formatNumber(compare.totalReturns)}
                  </td>
                  <td className="px-2 py-3 text-center text-orange-700 bg-orange-50/30">
                    {compare.returnsPct.toFixed(1)}%
                  </td>
                  <td className="px-2 py-3 text-center text-orange-700 bg-orange-50/30">
                    ₪{formatNumber(Math.round(compare.totalSales))}
                  </td>
                  <td className="px-2 py-3 text-center text-primary-700 bg-primary-50/30">
                    {formatNumber(main.totalGross)}
                  </td>
                  <td className="px-2 py-3 text-center text-primary-700 bg-primary-50/30">
                    {formatNumber(main.totalQty)}
                  </td>
                  <td className="px-2 py-3 text-center text-primary-700 bg-primary-50/30 text-red-600">
                    {formatNumber(main.totalReturns)}
                  </td>
                  <td className="px-2 py-3 text-center text-primary-700 bg-primary-50/30">
                    {main.returnsPct.toFixed(1)}%
                  </td>
                  <td className="px-2 py-3 text-center text-primary-700 bg-primary-50/30">
                    ₪{formatNumber(Math.round(main.totalSales))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ChangeIndicator
                      current={main.totalGross}
                      compare={compare.totalGross}
                    />
                  </td>
                </>
              ) : (
                <>
                  <td className="px-4 py-3 text-center">
                    {formatNumber(main.totalGross)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {formatNumber(main.totalQty)}
                  </td>
                  <td className="px-4 py-3 text-center text-red-600">
                    {formatNumber(main.totalReturns)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {main.returnsPct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    ₪{formatNumber(Math.round(main.totalSales))}
                  </td>
                </>
              )}
            </tr>
            {stores.map((store, index) => {
              const data = calcMonthlyTotals(store, months);
              const compareData = compare
                ? calcMonthlyTotals(store, compareMonths)
                : null;

              return (
                <tr key={store.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            CHART_COLORS[index % CHART_COLORS.length],
                        }}
                      />
                      <div>
                        <div className="font-medium">{store.name}</div>
                        <div className="text-xs text-gray-500">
                          {store.city}
                        </div>
                      </div>
                    </div>
                  </td>
                  {compareData ? (
                    <>
                      {/* תקופה קודמת - ימין (ליד חנות) | תקופה עכשווית - שמאל (ליד שינוי) */}
                      <td className="px-2 py-3 text-center text-sm bg-orange-50/20">
                        {formatNumber(compareData.gross)}
                      </td>
                      <td className="px-2 py-3 text-center text-sm bg-orange-50/20">
                        {formatNumber(compareData.qty)}
                      </td>
                      <td className="px-2 py-3 text-center text-sm text-red-600 bg-orange-50/20">
                        {formatNumber(compareData.returns)}
                      </td>
                      <td className="px-2 py-3 text-center text-sm bg-orange-50/20">
                        {compareData.returnsPct.toFixed(1)}%
                      </td>
                      <td className="px-2 py-3 text-center text-sm bg-orange-50/20">
                        ₪{formatNumber(Math.round(compareData.sales))}
                      </td>
                      {/* תקופה עכשווית - שמאל */}
                      <td className="px-2 py-3 text-center font-medium bg-primary-50/20">
                        {formatNumber(data.gross)}
                      </td>
                      <td className="px-2 py-3 text-center font-medium bg-primary-50/20">
                        {formatNumber(data.qty)}
                      </td>
                      <td className="px-2 py-3 text-center font-medium text-red-600 bg-primary-50/20">
                        {formatNumber(data.returns)}
                      </td>
                      <td className="px-2 py-3 text-center bg-primary-50/20">
                        <span
                          className={
                            data.returnsPct > 15 ? "text-red-600 font-bold" : ""
                          }
                        >
                          {data.returnsPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center font-medium bg-primary-50/20">
                        ₪{formatNumber(Math.round(data.sales))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ChangeIndicator
                          current={data.gross}
                          compare={compareData.gross}
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-center font-medium">
                        {formatNumber(data.gross)}
                      </td>
                      <td className="px-4 py-3 text-center font-medium">
                        {formatNumber(data.qty)}
                      </td>
                      <td className="px-4 py-3 text-center text-red-600">
                        {formatNumber(data.returns)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={
                            data.returnsPct > 15 ? "text-red-600 font-bold" : ""
                          }
                        >
                          {data.returnsPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium">
                        ₪{formatNumber(Math.round(data.sales))}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // ============================================
  // RENDER DATA TABLE - TABLES MODE
  // ============================================
  const renderTablesMode = () => {
    const renderSingleTable = (
      monthList: string[],
      label: string,
      bgColor: string,
    ) => (
      <div className="flex-1">
        <h4 className={`text-sm font-bold ${bgColor} px-3 py-2 rounded-t-lg`}>
          {label}
        </h4>
        <table className="w-full text-sm border">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-right text-xs">חנות</th>
              <th className="px-3 py-2 text-center text-xs">ברוטו</th>
              <th className="px-3 py-2 text-center text-xs">נטו</th>
              <th className="px-3 py-2 text-center text-xs">מחזור</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {stores.map((store, index) => {
              const data = calcMonthlyTotals(store, monthList);
              return (
                <tr key={store.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm">
                    <div className="flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor:
                            CHART_COLORS[index % CHART_COLORS.length],
                        }}
                      />
                      {store.name}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center text-sm">
                    {formatNumber(data.gross)}
                  </td>
                  <td className="px-3 py-2 text-center text-sm">
                    {formatNumber(data.qty)}
                  </td>
                  <td className="px-3 py-2 text-center text-sm">
                    ₪{formatNumber(Math.round(data.sales))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );

    return (
      <div className="flex gap-4">
        {/* תקופה קודמת ימין | תקופה עכשווית שמאל */}
        {renderSingleTable(
          compareMonths,
          `תקופה קודמת: ${getPeriodLabel(compareMonths)}`,
          "text-orange-700 bg-orange-50",
        )}
        {renderSingleTable(
          months,
          `תקופה עכשווית: ${getPeriodLabel(months)}`,
          "text-primary-700 bg-primary-50",
        )}
      </div>
    );
  };

  // ============================================
  // RENDER DATA TABLE - COLUMNS MODE
  // ============================================
  const renderColumnsMode = () => (
    <div className="space-y-2">
      <div className="flex gap-6 text-sm text-gray-600 px-4">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary-500" />
          <strong>תקופה עכשווית:</strong> {getPeriodLabel(months)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <strong>תקופה קודמת:</strong> {getPeriodLabel(compareMonths)}
        </span>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-right font-semibold text-gray-700">
              חנות
            </th>
            <th
              className="px-4 py-3 text-center font-semibold text-orange-700 bg-orange-50"
              colSpan={2}
            >
              {getPeriodLabel(compareMonths)}
            </th>
            <th
              className="px-4 py-3 text-center font-semibold text-primary-700 bg-primary-50"
              colSpan={2}
            >
              {getPeriodLabel(months)}
            </th>
            <th className="px-4 py-3 text-center font-semibold text-green-700">
              שינוי
            </th>
          </tr>
          <tr className="bg-gray-100 text-xs">
            <th></th>
            <th className="px-2 py-1 text-center text-orange-600">ברוטו</th>
            <th className="px-2 py-1 text-center text-orange-600">מחזור</th>
            <th className="px-2 py-1 text-center text-primary-600">ברוטו</th>
            <th className="px-2 py-1 text-center text-primary-600">מחזור</th>
            <th></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {stores.map((store, index) => {
            const data = calcMonthlyTotals(store, months);
            const compareData = calcMonthlyTotals(store, compareMonths);
            return (
              <tr key={store.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor:
                          CHART_COLORS[index % CHART_COLORS.length],
                      }}
                    />
                    <div>
                      <div className="font-medium">{store.name}</div>
                      <div className="text-xs text-gray-500">{store.city}</div>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-3 text-center font-medium bg-orange-50/30">
                  {formatNumber(compareData.gross)}
                </td>
                <td className="px-2 py-3 text-center bg-orange-50/30">
                  ₪{formatNumber(Math.round(compareData.sales))}
                </td>
                <td className="px-2 py-3 text-center font-medium bg-primary-50/30">
                  {formatNumber(data.gross)}
                </td>
                <td className="px-2 py-3 text-center bg-primary-50/30">
                  ₪{formatNumber(Math.round(data.sales))}
                </td>
                <td className="px-2 py-3 text-center">
                  <ChangeIndicator
                    current={data.gross}
                    compare={compareData.gross}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // ============================================
  // RENDER SUMMARY MODE
  // 3 stat cards + sorted table + 3 summary footer rows
  // ============================================
  const renderSummaryMode = () => {
    if (!isCompareMode || compareMonths.length === 0) return renderRowsTable();

    const currentLabel = getPeriodLabel(months);
    const previousLabel = getPeriodLabel(compareMonths);

    // Per-store data with change %
    const storeData = stores.map((store, index) => {
      const curr = calcMonthlyTotals(store, months);
      const prev = calcMonthlyTotals(store, compareMonths);
      const changePct =
        prev.gross > 0 ? ((curr.gross - prev.gross) / prev.gross) * 100 : 0;
      return { store, curr, prev, changePct, index };
    });

    const upStores = storeData.filter((s) => s.changePct >= 1);
    const downStores = storeData.filter((s) => s.changePct < -1);
    const neutralStores = storeData.filter(
      (s) => s.changePct >= -1 && s.changePct < 1,
    );

    // Sort: up first (desc), then neutral, then down (asc)
    const sorted = [
      ...upStores.sort((a, b) => b.changePct - a.changePct),
      ...neutralStores,
      ...downStores.sort((a, b) => a.changePct - b.changePct),
    ];

    const sumGroup = (group: typeof storeData) => ({
      prevGross: group.reduce((s, r) => s + r.prev.gross, 0),
      currGross: group.reduce((s, r) => s + r.curr.gross, 0),
      prevSales: group.reduce((s, r) => s + r.prev.sales, 0),
      currSales: group.reduce((s, r) => s + r.curr.sales, 0),
      prevQty: group.reduce((s, r) => s + r.prev.qty, 0),
      currQty: group.reduce((s, r) => s + r.curr.qty, 0),
    });

    const allSum = sumGroup(storeData);
    const upSum = sumGroup(upStores);
    const downSum = sumGroup(downStores);
    const allChangePct =
      allSum.prevGross > 0
        ? ((allSum.currGross - allSum.prevGross) / allSum.prevGross) * 100
        : 0;
    const upChangePct =
      upSum.prevGross > 0
        ? ((upSum.currGross - upSum.prevGross) / upSum.prevGross) * 100
        : 0;
    const downChangePct =
      downSum.prevGross > 0
        ? ((downSum.currGross - downSum.prevGross) / downSum.prevGross) * 100
        : 0;

    const StatCard = ({
      label,
      count,
      changePct,
      prevGross,
      currGross,
      colorClass,
      icon,
    }: {
      label: string;
      count: number;
      changePct: number;
      prevGross: number;
      currGross: number;
      colorClass: string;
      icon: React.ReactNode;
    }) => (
      <div className={`flex-1 rounded-xl p-4 border-2 ${colorClass}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold">{label}</span>
          <span className="text-lg font-bold">{count} חנויות</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div>
            <div className="text-xs text-gray-500">{previousLabel}</div>
            <div className="font-medium">{formatNumber(prevGross)}</div>
          </div>
          <div className="flex items-center gap-1 font-bold text-base">
            {icon}
            {changePct > 0 ? "+" : ""}
            {changePct.toFixed(1)}%
          </div>
          <div>
            <div className="text-xs text-gray-500">{currentLabel}</div>
            <div className="font-medium">{formatNumber(currGross)}</div>
          </div>
        </div>
      </div>
    );

    const SummaryFooterRow = ({
      label,
      sums,
      rowClass,
      changePct,
    }: {
      label: string;
      sums: ReturnType<typeof sumGroup>;
      rowClass: string;
      changePct: number;
    }) => (
      <tr className={`font-bold border-t-2 ${rowClass}`}>
        <td className="px-4 py-3 text-right">{label}</td>
        <td className="px-3 py-3 text-center bg-orange-50/40">
          {formatNumber(sums.prevGross)}
        </td>
        <td className="px-3 py-3 text-center bg-orange-50/40">
          {formatNumber(sums.prevQty)}
        </td>
        <td className="px-3 py-3 text-center bg-orange-50/40">
          ₪{formatNumber(Math.round(sums.prevSales))}
        </td>
        <td className="px-3 py-3 text-center bg-primary-50/40">
          {formatNumber(sums.currGross)}
        </td>
        <td className="px-3 py-3 text-center bg-primary-50/40">
          {formatNumber(sums.currQty)}
        </td>
        <td className="px-3 py-3 text-center bg-primary-50/40">
          ₪{formatNumber(Math.round(sums.currSales))}
        </td>
        <td className="px-3 py-3 text-center">
          <span
            className={clsx(
              "inline-flex items-center gap-0.5 font-bold text-sm",
              changePct > 1
                ? "text-green-700"
                : changePct < -1
                  ? "text-red-700"
                  : "text-gray-500",
            )}
          >
            {changePct > 1 ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : changePct < -1 ? (
              <TrendingDown className="w-3.5 h-3.5" />
            ) : (
              <Minus className="w-3.5 h-3.5" />
            )}
            {changePct > 0 ? "+" : ""}
            {changePct.toFixed(1)}%
          </span>
        </td>
      </tr>
    );

    return (
      <div className="space-y-4">
        {/* Stat cards */}
        <div className="flex gap-3 flex-wrap">
          <StatCard
            label="כל החנויות"
            count={stores.length}
            changePct={allChangePct}
            prevGross={allSum.prevGross}
            currGross={allSum.currGross}
            colorClass="border-gray-200 bg-gray-50 text-gray-800"
            icon={
              allChangePct >= 1 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : allChangePct <= -1 ? (
                <TrendingDown className="w-4 h-4 text-red-600" />
              ) : (
                <Minus className="w-4 h-4 text-gray-400" />
              )
            }
          />
          <StatCard
            label="↑ חנויות בעלייה"
            count={upStores.length}
            changePct={upChangePct}
            prevGross={upSum.prevGross}
            currGross={upSum.currGross}
            colorClass="border-green-200 bg-green-50 text-green-900"
            icon={<TrendingUp className="w-4 h-4 text-green-600" />}
          />
          <StatCard
            label="↓ חנויות בירידה"
            count={downStores.length}
            changePct={downChangePct}
            prevGross={downSum.prevGross}
            currGross={downSum.currGross}
            colorClass="border-red-200 bg-red-50 text-red-900"
            icon={<TrendingDown className="w-4 h-4 text-red-600" />}
          />
        </div>

        {/* Main table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-right font-semibold text-gray-700 min-w-[180px]">
                  חנות
                </th>
                <th
                  colSpan={3}
                  className="px-2 py-2 text-center text-xs font-semibold text-orange-700 bg-orange-50"
                >
                  {previousLabel}
                </th>
                <th
                  colSpan={3}
                  className="px-2 py-2 text-center text-xs font-semibold text-primary-700 bg-primary-50"
                >
                  {currentLabel}
                </th>
                <th className="px-3 py-3 text-center font-semibold text-gray-700">
                  שינוי %
                </th>
              </tr>
              <tr className="bg-gray-100 text-xs">
                <th />
                <th className="px-2 py-1 text-center text-orange-600">ברוטו</th>
                <th className="px-2 py-1 text-center text-orange-600">נטו</th>
                <th className="px-2 py-1 text-center text-orange-600">מחזור</th>
                <th className="px-2 py-1 text-center text-primary-600">ברוטו</th>
                <th className="px-2 py-1 text-center text-primary-600">נטו</th>
                <th className="px-2 py-1 text-center text-primary-600">מחזור</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map(({ store, curr, prev, changePct, index }) => {
                const isUp = changePct >= 1;
                const isDown = changePct < -1;
                return (
                  <tr
                    key={store.id}
                    className={clsx(
                      "hover:brightness-95 transition-all",
                      isUp ? "bg-green-50/40" : isDown ? "bg-red-50/40" : "",
                    )}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor:
                              CHART_COLORS[index % CHART_COLORS.length],
                          }}
                        />
                        <div>
                          <div className="font-medium text-gray-900">
                            {store.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {store.city}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center text-sm bg-orange-50/20">
                      {formatNumber(prev.gross)}
                    </td>
                    <td className="px-3 py-2.5 text-center text-sm bg-orange-50/20">
                      {formatNumber(prev.qty)}
                    </td>
                    <td className="px-3 py-2.5 text-center text-sm bg-orange-50/20">
                      ₪{formatNumber(Math.round(prev.sales))}
                    </td>
                    <td className="px-3 py-2.5 text-center font-medium bg-primary-50/20">
                      {formatNumber(curr.gross)}
                    </td>
                    <td className="px-3 py-2.5 text-center font-medium bg-primary-50/20">
                      {formatNumber(curr.qty)}
                    </td>
                    <td className="px-3 py-2.5 text-center font-medium bg-primary-50/20">
                      ₪{formatNumber(Math.round(curr.sales))}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={clsx(
                          "inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full",
                          isUp
                            ? "bg-green-100 text-green-700"
                            : isDown
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-500",
                        )}
                      >
                        {isUp ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : isDown ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : (
                          <Minus className="w-3 h-3" />
                        )}
                        {changePct > 0 ? "+" : ""}
                        {changePct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <SummaryFooterRow
                label={`סה״כ כל ${stores.length} החנויות`}
                sums={allSum}
                rowClass="bg-gray-100 text-gray-800 border-gray-300"
                changePct={allChangePct}
              />
              {upStores.length > 0 && (
                <SummaryFooterRow
                  label={`↑ ${upStores.length} חנויות בעלייה`}
                  sums={upSum}
                  rowClass="bg-green-50 text-green-800 border-green-200"
                  changePct={upChangePct}
                />
              )}
              {downStores.length > 0 && (
                <SummaryFooterRow
                  label={`↓ ${downStores.length} חנויות בירידה`}
                  sums={downSum}
                  rowClass="bg-red-50 text-red-800 border-red-200"
                  changePct={downChangePct}
                />
              )}
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER DATA TABLE
  // ============================================
  const renderDataTable = () => {
    if (
      !isCompareMode ||
      compareMonths.length === 0 ||
      compareDisplayMode === "rows"
    ) {
      return renderRowsTable();
    }
    if (compareDisplayMode === "tables") {
      return renderTablesMode();
    }
    if (compareDisplayMode === "summary") {
      const summaryRenderer = renderSummaryMode;
      return summaryRenderer();
    }
    return renderColumnsMode();
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>השוואת מדדים</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => onViewModeChange("metrics")}
                className={clsx(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  viewMode === "metrics"
                    ? "bg-primary-500 text-white"
                    : "text-gray-600",
                )}
              >
                <BarChart3 className="w-4 h-4" />
                מדדים
              </button>
              <button
                onClick={() => onViewModeChange("data")}
                className={clsx(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  viewMode === "data"
                    ? "bg-primary-500 text-white"
                    : "text-gray-600",
                )}
              >
                <Table2 className="w-4 h-4" />
                נתונים
              </button>
            </div>
            {viewMode === "data" && (
              <MonthSelector
                value={monthSelection}
                onChange={onMonthSelectionChange}
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {viewMode === "metrics" ? renderMetricsTable() : renderDataTable()}
      </CardContent>
    </Card>
  );
}
