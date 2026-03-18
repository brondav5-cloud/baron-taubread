"use client";

import { Filter, RefreshCw, FileSpreadsheet } from "lucide-react";
import { clsx } from "clsx";
import type { UseDistributionV2Return, GroupByMode } from "../types";

interface DistributionV2HeaderProps {
  hook: UseDistributionV2Return;
  onToggleFilters: () => void;
  filtersOpen: boolean;
  activeFiltersCount: number;
}

const GROUP_LABELS: Record<GroupByMode, string> = {
  products: "קבץ לפי מוצרים",
  customers: "קבץ לפי לקוחות",
  drivers: "קבץ לפי נהגים",
};

export function DistributionV2Header({
  hook,
  onToggleFilters,
  filtersOpen,
  activeFiltersCount,
}: DistributionV2HeaderProps) {
  const { totalRows, groupBy, setGroupBy, isLoading, refetch } = hook;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">
          נתוני חלוקה
          <span className="text-lg font-normal text-gray-500 mr-2">
            ({totalRows} שורות)
          </span>
        </h1>
        <div className="flex flex-wrap items-center gap-2">
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
          <button
            onClick={onToggleFilters}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
              filtersOpen
                ? "bg-primary-600 text-white"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
            )}
          >
            <Filter className="w-4 h-4" />
            סינון
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 bg-white/20 text-inherit rounded-full flex items-center justify-center text-xs font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(GROUP_LABELS) as GroupByMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setGroupBy(mode)}
            className={clsx(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              groupBy === mode
                ? "bg-primary-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
          >
            {GROUP_LABELS[mode]}
          </button>
        ))}
      </div>
    </div>
  );
}
