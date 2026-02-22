"use client";

import {
  Filter,
  BarChart3,
  Table2,
  FileSpreadsheet,
  GitCompare,
} from "lucide-react";
import { clsx } from "clsx";
import { MonthSelector, type MonthSelection } from "@/components/ui";
import { exportStoresToExcel } from "@/lib/excelExport";
import type { ViewMode } from "@/hooks/useStoresPage";
import type { StoreWithStatus } from "@/types/data";

interface StoresHeaderProps {
  storesCount: number;
  selectedCount: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  monthSelection: MonthSelection;
  onMonthSelectionChange: (selection: MonthSelection) => void;
  onToggleFilters: () => void;
  activeFiltersCount: number;
  onCompareClick: () => void;
  stores: StoreWithStatus[];
}

export function StoresHeader({
  storesCount,
  selectedCount,
  viewMode,
  onViewModeChange,
  monthSelection,
  onMonthSelectionChange,
  onToggleFilters,
  activeFiltersCount,
  onCompareClick,
  stores,
}: StoresHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <h1 className="text-2xl font-bold text-gray-900">
        חנויות ({storesCount})
      </h1>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Compare Button */}
        {selectedCount > 1 && (
          <button
            onClick={onCompareClick}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600 transition-colors animate-pulse"
          >
            <GitCompare className="w-4 h-4" />
            השוואת חנויות ({selectedCount})
          </button>
        )}

        {/* View Mode Toggle */}
        <div className="flex items-center bg-white rounded-xl p-1 shadow-sm">
          <button
            onClick={() => onViewModeChange("metrics")}
            className={clsx(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium",
              viewMode === "metrics"
                ? "bg-primary-500 text-white"
                : "text-gray-600",
            )}
          >
            <BarChart3 className="w-4 h-4" />
            מדדים
          </button>
          <button
            onClick={() => onViewModeChange("data")}
            className={clsx(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium",
              viewMode === "data"
                ? "bg-primary-500 text-white"
                : "text-gray-600",
            )}
          >
            <Table2 className="w-4 h-4" />
            נתונים
          </button>
        </div>

        {/* Month Selector */}
        {viewMode === "data" && (
          <MonthSelector
            value={monthSelection}
            onChange={onMonthSelectionChange}
          />
        )}

        {/* Filter Button */}
        <button
          onClick={onToggleFilters}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium"
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
          onClick={() => exportStoresToExcel(stores)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Excel
        </button>
      </div>
    </div>
  );
}
