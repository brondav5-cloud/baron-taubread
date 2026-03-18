"use client";

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
        <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-50/30 p-0.5">
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 hover:bg-white hover:shadow-sm"
          >
            ראשון
          </button>
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 hover:bg-white hover:shadow-sm"
          >
            הקודם
          </button>
          <span className="px-3 py-1.5 text-xs font-bold text-slate-800 tabular-nums min-w-[5.5rem] text-center">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 hover:bg-white hover:shadow-sm"
          >
            הבא
          </button>
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 hover:bg-white hover:shadow-sm"
          >
            אחרון
          </button>
        </div>
      </div>
    </div>
  );
}
