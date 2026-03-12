"use client";

import {
  Filter,
  BarChart3,
  Table2,
  FileSpreadsheet,
  GitCompare,
  RefreshCw,
  EyeOff,
} from "lucide-react";
import { clsx } from "clsx";
import { SmartPeriodSelector } from "@/components/common";
import { exportStoresToExcel } from "@/lib/excelExport";
import type { UseStoresPageSupabaseReturn } from "@/hooks/useStoresPageSupabase";
import type { StoreWithStatus } from "@/types/data";

interface StoresHeaderSupabaseProps {
  hook: UseStoresPageSupabaseReturn;
}

export function StoresHeaderSupabase({ hook }: StoresHeaderSupabaseProps) {
  const {
    periodLabel,
    filteredCount,
    totalCount,
    selectedStoreIds,
    viewMode,
    setViewMode,
    periodSelector,
    toggleFilters,
    activeFiltersCount,
    goToComparePage,
    isLoading,
    refetch,
    excludedCount,
  } = hook;

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      {/* Title */}
      <div className="flex flex-col gap-0">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            חנויות
            <span className="text-lg font-normal text-gray-500 mr-2">
              (
              {filteredCount === totalCount
                ? totalCount
                : `${filteredCount} מתוך ${totalCount}`}
              )
            </span>
          </h1>
          {/* Refresh */}
          <button
            onClick={refetch}
            disabled={isLoading}
            className={clsx(
              "p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors",
              isLoading && "animate-spin",
            )}
            title="רענון נתונים"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          {/* Excluded badge */}
          {excludedCount > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
              <EyeOff className="w-3 h-3" />
              {excludedCount} מוחרגות
            </span>
          )}
        </div>
        {periodLabel && (
          <p className="text-gray-500 text-sm mt-0.5">{periodLabel}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Compare Button */}
        {selectedStoreIds.size > 1 && (
          <button
            onClick={goToComparePage}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600 transition-colors animate-pulse"
          >
            <GitCompare className="w-4 h-4" />
            השוואת חנויות ({selectedStoreIds.size})
          </button>
        )}

        {/* View Mode Toggle */}
        <div className="flex items-center bg-white rounded-xl p-1 shadow-sm border">
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

        {/* Period Selector - only in data mode */}
        {viewMode === "data" && (
          <SmartPeriodSelector
            selector={periodSelector}
            showCompare={true}
            showDisplayMode={true}
          />
        )}

        {/* Filter Button */}
        <button
          onClick={toggleFilters}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors"
        >
          <Filter className="w-4 h-4" />
          סינון
          {activeFiltersCount > 0 && (
            <span className="w-5 h-5 bg-white text-green-600 text-xs rounded-full flex items-center justify-center font-bold">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* Excel Export */}
        <button
          onClick={() => void exportStoresToExcel(hook.stores as unknown as StoreWithStatus[])}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Excel
        </button>
      </div>
    </div>
  );
}
