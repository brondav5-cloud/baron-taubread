"use client";

import { BarChart3, Table2, Filter, FileSpreadsheet } from "lucide-react";
import { clsx } from "clsx";
import { MonthSelector, type MonthSelection } from "@/components/ui";
import { exportProductsToExcel } from "@/lib/excelExport";
import type { ProductWithStatus } from "@/types/data";

interface ProductsHeaderProps {
  productsCount: number;
  viewMode: "metrics" | "data";
  onViewModeChange: (mode: "metrics" | "data") => void;
  monthSelection: MonthSelection;
  onMonthSelectionChange: (selection: MonthSelection) => void;
  onToggleFilters: () => void;
  activeFiltersCount: number;
  products: ProductWithStatus[];
  periodSubtitle?: string;
}

export function ProductsHeader({
  productsCount,
  viewMode,
  onViewModeChange,
  monthSelection,
  onMonthSelectionChange,
  onToggleFilters,
  activeFiltersCount,
  products,
  periodSubtitle,
}: ProductsHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          מוצרים ({productsCount})
        </h1>
        {periodSubtitle && (
          <p className="text-gray-500 text-sm mt-0.5">{periodSubtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {/* View Mode Toggle */}
        <div className="flex items-center bg-white rounded-xl p-1 shadow-sm">
          <button
            onClick={() => onViewModeChange("metrics")}
            className={clsx(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
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
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
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
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors"
        >
          <Filter className="w-4 h-4" />
          סינון
          {activeFiltersCount > 0 && (
            <span className="w-5 h-5 bg-white text-green-600 text-xs rounded-full flex items-center justify-center font-bold">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* Export Button */}
        <button
          onClick={() => exportProductsToExcel(products)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Excel
        </button>
      </div>
    </div>
  );
}
