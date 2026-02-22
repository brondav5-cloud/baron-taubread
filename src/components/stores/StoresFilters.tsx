"use client";

import { memo } from "react";
import { Search, Filter, X } from "lucide-react";
import { clsx } from "clsx";
import { MultiSelect } from "@/components/ui";
import {
  STATUS_DISPLAY_LONG,
  STATUS_DISPLAY_SHORT,
  type StatusLong,
  type StatusShort,
} from "@/types/data";

// ============================================
// TYPES
// ============================================

export interface StoreFilters {
  cities?: string[];
  networks?: string[];
  agents?: string[];
  drivers?: string[];
  status_long?: StatusLong[];
  status_short?: StatusShort[];
  minQty?: number;
}

interface StoresFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  filters: StoreFilters;
  onFiltersChange: (filters: StoreFilters) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  // Filter options
  cities: string[];
  networks: string[];
  agents: string[];
  drivers: string[];
  // Stats
  activeFiltersCount: number;
  filteredCount: number;
  totalCount: number;
}

// ============================================
// COMPONENT
// ============================================

function StoresFiltersComponent({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  showFilters,
  onToggleFilters,
  cities,
  networks,
  agents,
  drivers,
  activeFiltersCount,
  filteredCount,
  totalCount,
}: StoresFiltersProps) {
  const statusLongOptions = Object.keys(STATUS_DISPLAY_LONG) as StatusLong[];
  const statusShortOptions = Object.keys(STATUS_DISPLAY_SHORT) as StatusShort[];

  const handleClearAll = () => {
    onSearchChange("");
    onFiltersChange({});
  };

  const updateFilter = <K extends keyof StoreFilters>(
    key: K,
    value: StoreFilters[K],
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="space-y-4">
      {/* Search Bar & Filter Toggle */}
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="חיפוש לפי שם חנות או עיר..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none transition-colors"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Toggle Button */}
        <button
          onClick={onToggleFilters}
          className={clsx(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-medium transition-all",
            showFilters
              ? "bg-primary-50 border-primary-300 text-primary-700"
              : "bg-white border-gray-200 text-gray-700 hover:border-gray-300",
          )}
        >
          <Filter className="w-4 h-4" />
          <span>סינון</span>
          {activeFiltersCount > 0 && (
            <span className="px-2 py-0.5 bg-primary-500 text-white text-xs rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* Clear All Button */}
        {(activeFiltersCount > 0 || search) && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            נקה הכל
          </button>
        )}

        {/* Results Count */}
        <div className="text-sm text-gray-500">
          {filteredCount !== totalCount ? (
            <span>
              מציג <strong className="text-primary-600">{filteredCount}</strong>{" "}
              מתוך {totalCount}
            </span>
          ) : (
            <span>
              <strong>{totalCount}</strong> חנויות
            </span>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm animate-slide-down">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* City Filter */}
            <MultiSelect
              label="עיר"
              options={cities}
              selected={filters.cities || []}
              onChange={(v) => updateFilter("cities", v)}
              placeholder="בחר ערים"
            />

            {/* Network Filter */}
            <MultiSelect
              label="רשת"
              options={networks}
              selected={filters.networks || []}
              onChange={(v) => updateFilter("networks", v)}
              placeholder="בחר רשתות"
            />

            {/* Agent Filter */}
            <MultiSelect
              label="סוכן"
              options={agents}
              selected={filters.agents || []}
              onChange={(v) => updateFilter("agents", v)}
              placeholder="בחר סוכנים"
            />

            {/* Driver Filter */}
            <MultiSelect
              label="נהג"
              options={drivers}
              selected={filters.drivers || []}
              onChange={(v) => updateFilter("drivers", v)}
              placeholder="בחר נהגים"
            />

            {/* Status Long Filter */}
            <MultiSelect
              label="סטטוס ארוך"
              options={statusLongOptions}
              selected={filters.status_long || []}
              onChange={(v) => updateFilter("status_long", v as StatusLong[])}
              placeholder="בחר סטטוס"
              renderOption={(opt) => STATUS_DISPLAY_LONG[opt as StatusLong]}
            />

            {/* Status Short Filter */}
            <MultiSelect
              label="סטטוס קצר"
              options={statusShortOptions}
              selected={filters.status_short || []}
              onChange={(v) => updateFilter("status_short", v as StatusShort[])}
              placeholder="בחר סטטוס"
              renderOption={(opt) => STATUS_DISPLAY_SHORT[opt as StatusShort]}
            />
          </div>

          {/* Min Quantity Filter */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-600">
                מינימום כמות 2025:
              </label>
              <input
                type="number"
                value={filters.minQty || ""}
                onChange={(e) =>
                  updateFilter(
                    "minQty",
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                placeholder="0"
                min={0}
                className="w-32 px-3 py-1.5 rounded-lg border border-gray-200 focus:border-primary-500 focus:outline-none text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const StoresFilters = memo(StoresFiltersComponent);
export default StoresFilters;
