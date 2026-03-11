"use client";

import { X } from "lucide-react";
import { MultiSelect } from "@/components/ui";
import type { StatusLong, StatusShort } from "@/types/data";

export interface ProductsFilters {
  categories?: string[];
  status_long?: StatusLong[];
  status_short?: StatusShort[];
  minQty?: number;
}

interface ProductsFiltersPanelProps {
  show: boolean;
  filters: ProductsFilters;
  categories: string[];
  statusLongOptions: StatusLong[];
  statusShortOptions: StatusShort[];
  activeFiltersCount: number;
  onFiltersChange: (filters: ProductsFilters) => void;
  onClearFilters: () => void;
  currentYear?: number;
}

export function ProductsFiltersPanel({
  show,
  filters,
  categories,
  statusLongOptions,
  statusShortOptions,
  activeFiltersCount,
  onFiltersChange,
  onClearFilters,
  currentYear,
}: ProductsFiltersPanelProps) {
  if (!show) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Category Filter */}
        <MultiSelect
          label="קטגוריה"
          options={categories}
          selected={filters.categories || []}
          onChange={(v) =>
            onFiltersChange({
              ...filters,
              categories: v.length ? v : undefined,
            })
          }
          placeholder="הכל"
        />

        {/* Status Long Filter */}
        <MultiSelect
          label="סטטוס ארוך"
          options={statusLongOptions}
          selected={filters.status_long || []}
          onChange={(v) =>
            onFiltersChange({
              ...filters,
              status_long: v.length ? (v as StatusLong[]) : undefined,
            })
          }
          placeholder="הכל"
        />

        {/* Status Short Filter */}
        <MultiSelect
          label="סטטוס קצר"
          options={statusShortOptions}
          selected={filters.status_short || []}
          onChange={(v) =>
            onFiltersChange({
              ...filters,
              status_short: v.length ? (v as StatusShort[]) : undefined,
            })
          }
          placeholder="הכל"
        />

        {/* Min Quantity Filter */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            מינימום כמות
            {currentYear && (
              <span className="text-gray-400 mr-1">(שנה {currentYear})</span>
            )}
          </label>
          <input
            type="number"
            value={filters.minQty || ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                minQty: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            placeholder="0"
            className="w-full px-3 py-2 bg-gray-50 rounded-xl text-sm border-0 focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Clear Filters Button */}
      {activeFiltersCount > 0 && (
        <button
          onClick={onClearFilters}
          className="text-sm text-red-600 flex items-center gap-1 hover:text-red-700 transition-colors"
        >
          <X className="w-4 h-4" />
          נקה הכל
        </button>
      )}
    </div>
  );
}
