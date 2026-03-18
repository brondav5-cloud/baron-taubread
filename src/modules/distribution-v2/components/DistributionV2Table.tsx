"use client";

import type { DistributionV2Row } from "../types";

interface DistributionV2TableProps {
  rows: DistributionV2Row[];
}

export function DistributionV2Table({ rows }: DistributionV2TableProps) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-12 text-center text-gray-500">
        אין נתונים להצגה. התאם סינון או טווח תאריכים.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <Th>חודש</Th>
              <Th>מזהה לקוח</Th>
              <Th>לקוח</Th>
              <Th>רשת</Th>
              <Th>עיר</Th>
              <Th>מזהה מוצר</Th>
              <Th>מוצר</Th>
              <Th>קטגוריה</Th>
              <Th>כמות</Th>
              <Th>חזרות</Th>
              <Th>מכירות</Th>
              <Th>נהג</Th>
              <Th>סוכן</Th>
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

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-3 font-medium text-gray-700 whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={["px-3 py-2 text-gray-800", className].filter(Boolean).join(" ")}>
      {children}
    </td>
  );
}
