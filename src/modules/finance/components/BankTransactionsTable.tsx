"use client";

import { memo } from "react";
import type { BankTransaction, SourceBank } from "../types";

const BANK_LABELS: Record<SourceBank, { label: string; color: string }> = {
  leumi: { label: "לאומי", color: "bg-blue-100 text-blue-700" },
  hapoalim: { label: "הפועלים", color: "bg-orange-100 text-orange-700" },
  mizrahi: { label: "מזרחי", color: "bg-yellow-100 text-yellow-700" },
};

function fmt(n: number): string {
  return n.toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

interface Props {
  transactions: BankTransaction[];
  isLoading: boolean;
  onRowClick?: (tx: BankTransaction) => void;
}

export const BankTransactionsTable = memo(function BankTransactionsTable({
  transactions,
  isLoading,
  onRowClick,
}: Props) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div key={i} className={`flex gap-4 px-4 py-3 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
            {[80, 160, 120, 90, 90, 100].map((w, j) => (
              <div key={j} className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: w }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-center py-16 text-gray-400">
        <p className="font-medium">אין תנועות להצגה</p>
        <p className="text-sm mt-1">העלה קובץ תנועות בנק כדי להתחיל</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right" dir="rtl">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-semibold uppercase tracking-wide">
              <th className="px-4 py-3 whitespace-nowrap">תאריך</th>
              <th className="px-4 py-3">תיאור</th>
              <th className="px-4 py-3 hidden md:table-cell">אסמכתא</th>
              <th className="px-4 py-3 text-left whitespace-nowrap">חובה ₪</th>
              <th className="px-4 py-3 text-left whitespace-nowrap">זכות ₪</th>
              <th className="px-4 py-3 text-left whitespace-nowrap hidden lg:table-cell">יתרה ₪</th>
              <th className="px-4 py-3 hidden md:table-cell">בנק</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {transactions.map((tx) => {
              const isDebit = tx.debit > 0;
              const isCredit = tx.credit > 0;
              const bankInfo = BANK_LABELS[tx.source_bank];

              return (
                <tr
                  key={tx.id}
                  onClick={() => onRowClick?.(tx)}
                  className={`transition-colors ${onRowClick ? "cursor-pointer" : ""} ${
                    isDebit ? "bg-red-50/30 hover:bg-red-50" : isCredit ? "bg-green-50/30 hover:bg-green-50" : "bg-white hover:bg-gray-50"
                  }`}
                >
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap font-mono text-xs">
                    {formatDate(tx.date)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 truncate max-w-[200px]">{tx.description}</p>
                    {tx.details && (
                      <p className="text-xs text-gray-400 truncate max-w-[200px]">{tx.details}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-400 text-xs font-mono">
                    {tx.reference}
                  </td>
                  <td className="px-4 py-3 text-left">
                    {isDebit && (
                      <span className="text-red-600 font-semibold font-mono">{fmt(tx.debit)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-left">
                    {isCredit && (
                      <span className="text-green-600 font-semibold font-mono">{fmt(tx.credit)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-left hidden lg:table-cell">
                    {tx.balance != null && (
                      <span className={`font-mono text-xs ${tx.balance < 0 ? "text-red-500" : "text-gray-500"}`}>
                        {fmt(tx.balance)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {bankInfo && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bankInfo.color}`}>
                        {bankInfo.label}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});
