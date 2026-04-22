"use client";

import { Loader2 } from "lucide-react";
import type { ClassifiedTransactionRow } from "@/modules/finance/categories/types";
import { classificationSourceLabel } from "@/modules/finance/categories/utils";

interface Props {
  rows: ClassifiedTransactionRow[] | undefined;
  isLoading: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

function fmtAmount(value: number): string {
  return `₪${Math.abs(value).toLocaleString("he-IL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function CategoryInsightsPanel({ rows, isLoading, isOpen, onToggle }: Props) {
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={onToggle}
        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
      >
        {isOpen ? "הסתר תנועות בקטגוריה" : "הצג תנועות בקטגוריה ולפי מה סווג"}
      </button>
      {isOpen && (
        <div className="mt-2 border border-indigo-100 bg-indigo-50/30 rounded-xl p-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-indigo-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              טוען תנועות...
            </div>
          ) : !rows || rows.length === 0 ? (
            <p className="text-xs text-gray-500">אין תנועות להצגה בקטגוריה זו.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {rows.map((row) => (
                <div key={`${row.kind}:${row.id}`} className="bg-white border border-indigo-100 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 text-[11px] text-gray-500">
                    <span>{row.date}</span>
                    <span>·</span>
                    <span>{row.kind === "split" ? "פיצול" : "תנועה"}</span>
                  </div>
                  <p className="text-sm text-gray-800 mt-1">{row.description}</p>
                  {row.supplier_name && <p className="text-xs text-blue-600 mt-1">ספק: {row.supplier_name}</p>}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-purple-700 bg-purple-50 border border-purple-100 rounded px-2 py-0.5">
                      {classificationSourceLabel(row.matched_by)}
                    </span>
                    <span className="text-xs font-medium text-gray-700">{fmtAmount(row.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
