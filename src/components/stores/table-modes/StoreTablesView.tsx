"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { clsx } from "clsx";
import { formatNumber } from "@/lib/calculations";
import { calcMonthlyTotals } from "@/components/ui";
import type { StoreWithStatus } from "@/types/data";

interface StoreTablesViewProps {
  stores: StoreWithStatus[];
  mainMonths: string[];
  compareMonths: string[];
  mainLabel: string;
  compareLabel: string;
}

function DataTable({
  stores,
  periodMonths,
  label,
  bgColor,
}: {
  stores: StoreWithStatus[];
  periodMonths: string[];
  label: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {label && (
        <div className={clsx("px-4 py-2 font-medium text-white", bgColor)}>
          {label}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-3 w-10">
                <input type="checkbox" className="rounded" />
              </th>
              <th className="px-4 py-3 text-right font-medium">חנות</th>
              <th className="px-3 py-3 text-center font-medium">ברוטו</th>
              <th className="px-3 py-3 text-center font-medium">נטו</th>
              <th className="px-3 py-3 text-center font-medium">חזרות</th>
              <th className="px-3 py-3 text-center font-medium">חזרות %</th>
              <th className="px-3 py-3 text-center font-medium">מחזור</th>
              <th className="px-2 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {stores.map((store) => {
              const d = calcMonthlyTotals(store, periodMonths);
              return (
                <tr
                  key={store.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-2 py-3 text-center">
                    <input type="checkbox" className="rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/stores/${store.id}`}
                      className="hover:text-primary-600"
                    >
                      <div className="font-medium text-gray-900">
                        {store.name}
                      </div>
                      <div className="text-xs text-gray-500">{store.city}</div>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-center font-medium">
                    {formatNumber(d.gross)}
                  </td>
                  <td className="px-3 py-3 text-center font-medium">
                    {formatNumber(d.qty)}
                  </td>
                  <td className="px-3 py-3 text-center text-red-600">
                    {formatNumber(d.returns)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={
                        d.returnsPct > 15 ? "text-red-600 font-bold" : ""
                      }
                    >
                      {d.returnsPct.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center font-medium">
                    ₪{formatNumber(Math.round(d.sales))}
                  </td>
                  <td className="px-2 py-3">
                    <Link href={`/dashboard/stores/${store.id}`}>
                      <ChevronLeft className="w-4 h-4 text-gray-400" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StoreTablesView({
  stores,
  mainMonths,
  compareMonths,
  mainLabel,
  compareLabel,
}: StoreTablesViewProps) {
  return (
    <div className="space-y-6">
      <DataTable
        stores={stores}
        periodMonths={mainMonths}
        label={`תקופה ראשית: ${mainLabel}`}
        bgColor="bg-primary-500"
      />
      <DataTable
        stores={stores}
        periodMonths={compareMonths}
        label={`תקופת השוואה: ${compareLabel}`}
        bgColor="bg-orange-500"
      />
    </div>
  );
}
