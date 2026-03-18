"use client";

interface DistributionV2PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function DistributionV2Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: DistributionV2PaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border">
      <div className="text-sm text-gray-600">
        מציג {startItem}-{endItem} מתוך {totalItems}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">שורות בעמוד:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 border border-gray-200 rounded-lg text-sm"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
            className="px-3 py-1 text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            ראשון
          </button>
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-1 text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            הקודם
          </button>
          <span className="px-3 py-1 text-sm">
            עמוד {currentPage} מתוך {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            הבא
          </button>
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            אחרון
          </button>
        </div>
      </div>
    </div>
  );
}
