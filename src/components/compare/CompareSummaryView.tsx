"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { clsx } from "clsx";
import { calcMonthlyTotals } from "@/components/ui";
import { formatNumber } from "@/lib/calculations";
import { CHART_COLORS } from "@/hooks/useComparisonSupabase";
import type { ComparisonStore } from "@/hooks/useComparisonSupabase";

interface CompareSummaryViewProps {
  stores: ComparisonStore[];
  months: string[];
  compareMonths: string[];
  getPeriodLabel: (months: string[]) => string;
}

export function CompareSummaryView({
  stores,
  months,
  compareMonths,
  getPeriodLabel,
}: CompareSummaryViewProps) {
  const currentLabel = getPeriodLabel(months);
  const previousLabel = getPeriodLabel(compareMonths);

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

  const calcChangePct = (curr: number, prev: number) =>
    prev > 0 ? ((curr - prev) / prev) * 100 : 0;

  const allChangePct = calcChangePct(allSum.currGross, allSum.prevGross);
  const upChangePct = calcChangePct(upSum.currGross, upSum.prevGross);
  const downChangePct = calcChangePct(downSum.currGross, downSum.prevGross);

  type SumGroupResult = ReturnType<typeof sumGroup>;

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
    sums: SumGroupResult;
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
}
