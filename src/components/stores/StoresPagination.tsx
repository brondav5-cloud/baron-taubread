"use client";

import { clsx } from "clsx";

interface StoresPaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function StoresPagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: StoresPaginationProps) {
  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          מציג {startItem}-{endItem} מתוך {totalItems}
        </span>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">שורות בעמוד:</label>
          <select
            value={pageSize === Infinity ? "all" : pageSize}
            onChange={(e) => {
              const val =
                e.target.value === "all" ? Infinity : Number(e.target.value);
              onPageSizeChange(val);
            }}
            className="px-2 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value="all">הכל</option>
          </select>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="px-2 py-1 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
          >
            ראשון
          </button>
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
          >
            ←
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={clsx(
                  "px-3 py-1 rounded-lg text-sm",
                  currentPage === pageNum
                    ? "bg-primary-500 text-white"
                    : "hover:bg-gray-200",
                )}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
          >
            →
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
          >
            אחרון
          </button>
        </div>
      )}
    </div>
  );
}
