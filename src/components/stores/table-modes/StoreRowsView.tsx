"use client";

import React from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { formatNumber } from "@/lib/calculations";
import { calcMonthlyTotals, type MonthSelection } from "@/components/ui";
import type { StoreWithStatus } from "@/types/data";

interface StoreRowsViewProps {
  stores: StoreWithStatus[];
  monthSelection: MonthSelection;
  calcChange: (a: number, b: number) => number;
}

export function StoreRowsView({
  stores,
  monthSelection,
  calcChange,
}: StoreRowsViewProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-primary-500 text-white">
            <tr>
              <th className="px-4 py-3 text-right">חנות</th>
              <th className="px-3 py-3 text-center">תקופה</th>
              <th className="px-3 py-3 text-center">ברוטו</th>
              <th className="px-3 py-3 text-center">נטו</th>
              <th className="px-3 py-3 text-center">חזרות</th>
              <th className="px-3 py-3 text-center">חזרות %</th>
              <th className="px-3 py-3 text-center">מחזור</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((store) => {
              const main = calcMonthlyTotals(store, monthSelection.months);
              const comp = calcMonthlyTotals(
                store,
                monthSelection.compareMonths,
              );
              return (
                <React.Fragment key={store.id}>
                  {/* Main Period Row */}
                  <tr className="bg-primary-50 border-b border-primary-100">
                    <td className="px-4 py-2" rowSpan={3}>
                      <Link
                        href={`/dashboard/stores/${store.id}`}
                        className="hover:text-primary-600"
                      >
                        <div className="font-medium text-gray-900">
                          {store.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {store.city}
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="px-2 py-0.5 bg-primary-500 text-white text-xs rounded">
                        ראשי
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center font-medium text-primary-700">
                      {formatNumber(main.gross)}
                    </td>
                    <td className="px-3 py-2 text-center font-medium text-primary-700">
                      {formatNumber(main.qty)}
                    </td>
                    <td className="px-3 py-2 text-center text-red-600">
                      {formatNumber(main.returns)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {main.returnsPct.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-center font-medium">
                      ₪{formatNumber(Math.round(main.sales))}
                    </td>
                  </tr>
                  {/* Compare Period Row */}
                  <tr className="bg-orange-50 border-b border-orange-100">
                    <td className="px-3 py-2 text-center">
                      <span className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded">
                        השוואה
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center font-medium text-orange-700">
                      {formatNumber(comp.gross)}
                    </td>
                    <td className="px-3 py-2 text-center font-medium text-orange-700">
                      {formatNumber(comp.qty)}
                    </td>
                    <td className="px-3 py-2 text-center text-red-600">
                      {formatNumber(comp.returns)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {comp.returnsPct.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-center font-medium">
                      ₪{formatNumber(Math.round(comp.sales))}
                    </td>
                  </tr>
                  {/* Change Row */}
                  <tr className="bg-gray-50 border-b-2 border-gray-300">
                    <td className="px-3 py-2 text-center">
                      <span className="px-2 py-0.5 bg-gray-500 text-white text-xs rounded">
                        שינוי
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
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
                    <td className="px-3 py-2 text-center">
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
                    <td className="px-3 py-2 text-center">
                      <span
                        className={clsx(
                          "font-bold",
                          calcChange(main.returns, comp.returns) <= 0
                            ? "text-green-600"
                            : "text-red-600",
                        )}
                      >
                        {calcChange(main.returns, comp.returns).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={clsx(
                          "font-bold",
                          main.returnsPct - comp.returnsPct <= 0
                            ? "text-green-600"
                            : "text-red-600",
                        )}
                      >
                        {(main.returnsPct - comp.returnsPct).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
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
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
