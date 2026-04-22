"use client";

import { Loader2, Search } from "lucide-react";
import type { ClassifiedTransactionRow } from "@/modules/finance/categories/types";
import { classificationSourceLabel } from "@/modules/finance/categories/utils";

interface Props {
  query: string;
  onQueryChange: (value: string) => void;
  isLoading: boolean;
  results: ClassifiedTransactionRow[];
}

function fmtAmount(value: number): string {
  return `₪${Math.abs(value).toLocaleString("he-IL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function ClassificationSearchPanel({ query, onQueryChange, isLoading, results }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-800">חיפוש לאן תנועה מסווגת</h3>
        <p className="text-xs text-gray-500 mt-1">חפש שם ספק או תיאור ותראה לאיזו קטגוריה זה נכנס ולפי איזה כלל.</p>
      </div>
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="לדוגמה: מאפיית יוסף ברון / העברה אל..."
          className="w-full border border-gray-200 rounded-xl px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          מחפש...
        </div>
      ) : query.trim().length < 2 ? (
        <p className="text-xs text-gray-400">הקלד לפחות 2 תווים כדי להתחיל חיפוש.</p>
      ) : results.length === 0 ? (
        <p className="text-xs text-gray-400">לא נמצאו תוצאות.</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {results.map((row) => (
            <div key={`${row.kind}:${row.id}`} className="border border-gray-100 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{row.date}</span>
                <span>·</span>
                <span>{row.kind === "split" ? "פיצול" : "תנועה"}</span>
                <span>·</span>
                <span className="font-medium text-gray-700">{row.category_name}</span>
              </div>
              <p className="text-sm text-gray-800 mt-1">{row.description}</p>
              {row.supplier_name && <p className="text-xs text-blue-600 mt-1">ספק: {row.supplier_name}</p>}
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-purple-700 bg-purple-50 border border-purple-100 rounded px-2 py-0.5">
                  {classificationSourceLabel(row.matched_by)}
                </span>
                <span className="text-xs font-medium text-gray-700">{fmtAmount(row.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
