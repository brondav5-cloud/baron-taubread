"use client";

import { BarChart3, Table2 } from "lucide-react";
import { clsx } from "clsx";
import { MonthSelector } from "@/components/ui";
import { CityComparisonHeader } from "./CityComparisonHeader";
import { CityComparisonTable } from "./CityComparisonTable";
import { CityComparisonPagination } from "./CityComparisonPagination";
import { useCityComparison } from "./useCityComparison";
import type { CityComparisonProps } from "./types";

export function CityComparison({ currentStore }: CityComparisonProps) {
  const {
    viewMode,
    monthSelection,
    isExpanded,
    sortKey,
    sortDirection,
    pageSize,
    currentPage,
    setViewMode,
    setMonthSelection,
    setIsExpanded,
    setPageSize,
    setCurrentPage,
    handleSort,
    cityStores,
    sortedCityStores,
    paginatedCityStores,
    totalPages,
    rankings,
    cityTotals,
    statusCounts,
  } = useCityComparison(currentStore);

  if (cityStores.length <= 1) return null;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 space-y-6">
      <CityComparisonHeader
        cityName={currentStore.city}
        rankings={rankings}
        statusCounts={statusCounts}
      />

      {/* Expandable Table Section */}
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 bg-white rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium text-gray-700">
            {isExpanded ? "הסתר טבלת השוואה" : "הצג טבלת השוואה מלאה"}
          </span>
          <span className="text-gray-400">{isExpanded ? "▲" : "▼"}</span>
        </button>

        {isExpanded && (
          <div className="mt-4 space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-sm">
                <button
                  onClick={() => setViewMode("metrics")}
                  className={clsx(
                    "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    viewMode === "metrics"
                      ? "bg-blue-500 text-white"
                      : "text-gray-600 hover:bg-gray-100",
                  )}
                >
                  <BarChart3 className="w-4 h-4" />
                  מדדים
                </button>
                <button
                  onClick={() => setViewMode("data")}
                  className={clsx(
                    "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    viewMode === "data"
                      ? "bg-blue-500 text-white"
                      : "text-gray-600 hover:bg-gray-100",
                  )}
                >
                  <Table2 className="w-4 h-4" />
                  נתונים
                </button>
              </div>

              {viewMode === "data" && (
                <MonthSelector
                  value={monthSelection}
                  onChange={setMonthSelection}
                />
              )}
            </div>

            {/* Table */}
            <CityComparisonTable
              stores={paginatedCityStores}
              currentStoreId={currentStore.id}
              viewMode={viewMode}
              monthSelection={monthSelection}
              sortKey={sortKey}
              sortDirection={sortDirection}
              pageSize={pageSize}
              currentPage={currentPage}
              cityTotals={cityTotals}
              onSort={handleSort}
            />

            {/* Pagination */}
            <CityComparisonPagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={sortedCityStores.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default CityComparison;

// Re-export types
export * from "./types";
