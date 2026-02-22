"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { clsx } from "clsx";

// ============================================
// TYPES
// ============================================

export type SortDirection = "asc" | "desc" | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface ColumnDef<T> {
  key: string;
  header: string | React.ReactNode;
  sortable?: boolean;
  sortKey?: string; // key to use for sorting if different from key
  className?: string;
  headerClassName?: string;
  render: (item: T, index: number) => React.ReactNode;
  getValue?: (item: T) => number | string; // for sorting
}

export interface TableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  getRowKey: (item: T) => string | number;
  defaultSort?: SortConfig;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  showPagination?: boolean;
  summaryRow?: React.ReactNode;
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T, index: number) => string;
  emptyMessage?: string;
  stickyHeader?: boolean;
  headerClassName?: string;
}

// ============================================
// SORT ICON COMPONENT
// ============================================

function SortIcon({ direction }: { direction: SortDirection }) {
  if (direction === "asc") {
    return <ChevronUp className="w-4 h-4" />;
  }
  if (direction === "desc") {
    return <ChevronDown className="w-4 h-4" />;
  }
  return <ChevronsUpDown className="w-4 h-4 opacity-40" />;
}

// ============================================
// PAGINATION COMPONENT
// ============================================

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          מציג {startItem}-{endItem} מתוך {totalItems}
        </span>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">שורות:</label>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size === Infinity ? "הכל" : size}
              </option>
            ))}
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
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
          >
            ←
          </button>

          {/* Page numbers */}
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
            onClick={() => onPageChange(currentPage + 1)}
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

// ============================================
// MAIN TABLE COMPONENT
// ============================================

export function SortableTable<T>({
  data,
  columns,
  getRowKey,
  defaultSort,
  pageSizeOptions = [25, 50, 100, Infinity],
  defaultPageSize = 50,
  showPagination = true,
  summaryRow,
  onRowClick,
  rowClassName,
  emptyMessage = "לא נמצאו נתונים",
  stickyHeader = false,
  headerClassName = "bg-primary-500 text-white",
}: TableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(
    defaultSort || { key: "", direction: null },
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Handle sort
  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => {
      if (prev.key !== key) {
        return { key, direction: "desc" };
      }
      if (prev.direction === "desc") {
        return { key, direction: "asc" };
      }
      if (prev.direction === "asc") {
        return { key: "", direction: null };
      }
      return { key, direction: "desc" };
    });
    setCurrentPage(1);
  }, []);

  // Sorted data
  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return data;
    }

    const column = columns.find(
      (c) => c.key === sortConfig.key || c.sortKey === sortConfig.key,
    );
    if (!column?.getValue) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aVal = column.getValue!(a);
      const bVal = column.getValue!(b);

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      const cmp = aStr.localeCompare(bStr, "he");
      return sortConfig.direction === "asc" ? cmp : -cmp;
    });
  }, [data, sortConfig, columns]);

  // Paginated data
  const paginatedData = useMemo(() => {
    if (!showPagination || pageSize === Infinity) {
      return sortedData;
    }
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, showPagination]);

  const totalPages = Math.ceil(
    sortedData.length / (pageSize === Infinity ? sortedData.length : pageSize),
  );

  // Handle page size change
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-500">
        <div className="text-4xl mb-2">🔍</div>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead
            className={clsx(
              headerClassName,
              stickyHeader && "sticky top-0 z-10",
            )}
          >
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={clsx(
                    "px-3 py-3",
                    column.headerClassName,
                    column.sortable &&
                      "cursor-pointer select-none hover:bg-black/10 transition-colors",
                  )}
                  onClick={() =>
                    column.sortable && handleSort(column.sortKey || column.key)
                  }
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{column.header}</span>
                    {column.sortable && (
                      <SortIcon
                        direction={
                          sortConfig.key === (column.sortKey || column.key)
                            ? sortConfig.direction
                            : null
                        }
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summaryRow}
            {paginatedData.map((item, index) => (
              <tr
                key={getRowKey(item)}
                className={clsx(
                  "border-b border-gray-100 hover:bg-gray-50 transition-colors",
                  onRowClick && "cursor-pointer",
                  rowClassName?.(item, index),
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={clsx("px-3 py-3", column.className)}
                  >
                    {column.render(item, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={sortedData.length}
          pageSizeOptions={pageSizeOptions}
          onPageChange={setCurrentPage}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  );
}

// ============================================
// HOOK FOR EXTERNAL CONTROL
// ============================================

export function useTableSort<T>(defaultSort?: SortConfig) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(
    defaultSort || { key: "", direction: null },
  );

  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => {
      if (prev.key !== key) {
        return { key, direction: "desc" };
      }
      if (prev.direction === "desc") {
        return { key, direction: "asc" };
      }
      return { key: "", direction: null };
    });
  }, []);

  const sortData = useCallback(
    (data: T[], getValue: (item: T, key: string) => number | string) => {
      if (!sortConfig.key || !sortConfig.direction) {
        return data;
      }

      return [...data].sort((a, b) => {
        const aVal = getValue(a, sortConfig.key);
        const bVal = getValue(b, sortConfig.key);

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        }

        const cmp = String(aVal).localeCompare(String(bVal), "he");
        return sortConfig.direction === "asc" ? cmp : -cmp;
      });
    },
    [sortConfig],
  );

  return { sortConfig, handleSort, sortData };
}

export default SortableTable;
