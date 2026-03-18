"use client";

import type { DistributionV2Row, DistributionV2ColumnKey, ColumnFiltersState } from "../types";
import { DISTRIBUTION_V2_COLUMNS } from "../types";

const COLUMN_LABELS: Record<DistributionV2ColumnKey, string> = {
  month: "חודש",
  customerId: "מזהה לקוח",
  customer: "לקוח",
  network: "רשת",
  city: "עיר",
  productId: "מזהה מוצר",
  product: "מוצר",
  productCategory: "קטגוריה",
  quantity: "כמות",
  returns: "חזרות",
  sales: "מכירות",
  driver: "נהג",
  agent: "סוכן",
};

interface DistributionV2TableProps {
  rows: DistributionV2Row[];
  columnFilters: ColumnFiltersState;
  onColumnFilter: (column: DistributionV2ColumnKey, value: string) => void;
  onClearColumnFilters: () => void;
  hasActiveColumnFilters: boolean;
}

export function DistributionV2Table({
  rows,
  columnFilters,
  onColumnFilter,
  onClearColumnFilters,
  hasActiveColumnFilters,
}: DistributionV2TableProps) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-12 text-center text-gray-500">
        אין נתונים להצגה. התאם סינון או טווח תאריכים.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {hasActiveColumnFilters && (
        <div className="px-3 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
          <span className="text-xs text-amber-800">פילטר עמודות פעיל</span>
          <button
            type="button"
            onClick={onClearColumnFilters}
            className="text-xs text-amber-700 hover:text-amber-900 underline"
          >
            איפוס פילטר עמודות
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {DISTRIBUTION_V2_COLUMNS.map((col) => (
                <th key={col} className="px-3 py-3 font-medium text-gray-700 whitespace-nowrap">
                  {COLUMN_LABELS[col]}
                </th>
              ))}
            </tr>
            <tr className="bg-gray-100/80 border-b border-gray-200">
              {DISTRIBUTION_V2_COLUMNS.map((col) => (
                <th key={col} className="p-1">
                  <input
                    type="text"
                    value={columnFilters[col] ?? ""}
                    onChange={(e) => onColumnFilter(col, e.target.value)}
                    placeholder={`סנן ${COLUMN_LABELS[col]}...`}
                    className="w-full min-w-[4rem] max-w-[10rem] px-2 py-1.5 border border-gray-200 rounded text-sm placeholder:text-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50/50">
                <Td>{row.month ?? "—"}</Td>
                <Td>{row.customerId ?? "—"}</Td>
                <Td>{row.customer ?? "—"}</Td>
                <Td>{row.network ?? "—"}</Td>
                <Td>{row.city ?? "—"}</Td>
                <Td>{row.productId ?? "—"}</Td>
                <Td>{row.product ?? "—"}</Td>
                <Td>{row.productCategory ?? "—"}</Td>
                <Td className="font-medium">{row.quantity.toLocaleString("he-IL")}</Td>
                <Td>{row.returns.toLocaleString("he-IL")}</Td>
                <Td>{row.sales != null ? `₪${row.sales.toFixed(2)}` : "—"}</Td>
                <Td>{row.driver ?? "—"}</Td>
                <Td>{row.agent ?? "—"}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={["px-3 py-2 text-gray-800", className].filter(Boolean).join(" ")}>
      {children}
    </td>
  );
}
