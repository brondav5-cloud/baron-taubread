"use client";

import { useEffect, useState } from "react";

interface DistributionV2PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  /** e.g. "קבוצות" — shown in "X בעמוד" and range text */
  pageUnitLabel?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function DistributionV2Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  pageUnitLabel = "שורות",
  onPageChange,
  onPageSizeChange,
}: DistributionV2PaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const [inputVal, setInputVal] = useState(String(currentPage));

  useEffect(() => {
    setInputVal(String(currentPage));
  }, [currentPage]);

  const goToPage = () => {
    const p = parseInt(inputVal, 10);
    if (!Number.isNaN(p) && p >= 1 && p <= totalPages) {
      onPageChange(p);
    } else {
      setInputVal(String(currentPage));
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-2xl px-5 py-4 shadow-soft border border-slate-200/90">
      <div className="text-sm font-medium text-slate-600 tabular-nums">
        מציג <span className="text-slate-900 font-semibold">{pageUnitLabel}</span> {startItem}–{endItem}{" "}
        מתוך {totalItems.toLocaleString("he-IL")}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 font-medium">{pageUnitLabel} בעמוד</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 bg-slate-50/50 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>
        <div className="flex flex-wrap justify-center items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-50/30 p-0.5">
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
            aria-label="עמוד ראשון"
            className="hidden sm:inline-flex px-2.5 py-2 text-xs font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 hover:bg-white hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          >
            ראשון
          </button>
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="עמוד קודם"
            className="px-2.5 py-2 text-xs font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 hover:bg-white hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          >
            הקודם
          </button>
          <span className="px-2 py-2 flex items-center gap-1.5 text-xs font-bold text-slate-800 tabular-nums min-w-[7rem] justify-center" aria-live="polite">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onBlur={goToPage}
              onKeyDown={(e) => { if (e.key === "Enter") goToPage(); }}
              aria-label="מספר עמוד"
              className="w-11 text-center border border-slate-200 rounded-lg px-1 py-0.5 text-xs font-bold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 bg-white"
            />
            <span className="text-slate-400 font-normal">/ {totalPages}</span>
          </span>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="עמוד הבא"
            className="px-2.5 py-2 text-xs font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 hover:bg-white hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          >
            הבא
          </button>
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            aria-label="עמוד אחרון"
            className="hidden sm:inline-flex px-2.5 py-2 text-xs font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 hover:bg-white hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          >
            אחרון
          </button>
        </div>
      </div>
    </div>
  );
}
