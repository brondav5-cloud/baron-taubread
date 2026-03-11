"use client";

import { Search, X } from "lucide-react";
import { clsx } from "clsx";
import type {
  UseProductsPageSupabaseReturn,
  ProductsFilters,
} from "@/hooks/useProductsPageSupabase";

// ============================================
// SEARCH BAR
// ============================================

export function ProductsSearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        placeholder="חיפוש לפי שם מוצר או קטגוריה..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pr-10 pl-4 py-3 bg-white border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

// ============================================
// FILTERS PANEL
// ============================================

interface FilterSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (value: string[]) => void;
}

function FilterSelect({
  label,
  options,
  selected,
  onChange,
}: FilterSelectProps) {
  const handleToggle = (option: string) => {
    if (selected.includes(option))
      onChange(selected.filter((s) => s !== option));
    else onChange([...selected, option]);
  };
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => handleToggle(opt)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-sm transition-colors",
              selected.includes(opt)
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ProductsFiltersPanel({
  show,
  filters,
  filterOptions,
  onUpdateFilter,
  onClearFilters,
  activeFiltersCount,
}: {
  show: boolean;
  filters: ProductsFilters;
  filterOptions: UseProductsPageSupabaseReturn["filterOptions"];
  onUpdateFilter: <K extends keyof ProductsFilters>(
    key: K,
    value: ProductsFilters[K],
  ) => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
}) {
  if (!show) return null;
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-700">סינון</h3>
        {activeFiltersCount > 0 && (
          <button
            onClick={onClearFilters}
            className="text-sm text-red-500 hover:text-red-600"
          >
            נקה הכל ({activeFiltersCount})
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <FilterSelect
          label="קטגוריה"
          options={filterOptions.categories}
          selected={filters.categories}
          onChange={(v) => onUpdateFilter("categories", v)}
        />
        <FilterSelect
          label="קבוצת נהגים"
          options={filterOptions.driverGroups}
          selected={filters.driver_groups}
          onChange={(v) => onUpdateFilter("driver_groups", v)}
        />
        <FilterSelect
          label="מגמה שנתית"
          options={filterOptions.statusLong}
          selected={filters.status_long}
          onChange={(v) => onUpdateFilter("status_long", v)}
        />
        <FilterSelect
          label="מגמה קצרה"
          options={filterOptions.statusShort}
          selected={filters.status_short}
          onChange={(v) => onUpdateFilter("status_short", v)}
        />
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            מינימום כמות (שנה שוטפת)
          </label>
          <input
            type="number"
            value={filters.minQty ?? ""}
            onChange={(e) =>
              onUpdateFilter(
                "minQty",
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
            placeholder="0"
            className="w-full px-3 py-2 border rounded-xl text-sm"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// TOTALS BAR
// ============================================

export function ProductsTotalsBar({
  totals,
  viewMode,
  metricsPeriodLabels,
}: {
  totals: UseProductsPageSupabaseReturn["totals"];
  viewMode: "metrics" | "data";
  metricsPeriodLabels: UseProductsPageSupabaseReturn["metricsPeriodLabels"];
}) {
  if (!totals) return null;
  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 shadow-sm border">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <TotalCard label="מוצרים" value={totals.count.toString()} />
        {viewMode === "metrics" ? (
          <>
            <TotalCard
              label={
                metricsPeriodLabels?.yearly
                  ? `ממוצע ${metricsPeriodLabels.yearly}`
                  : "ממוצע 12v12"
              }
              value={`${totals.metric_12v12 >= 0 ? "+" : ""}${totals.metric_12v12.toFixed(1)}%`}
              color={totals.metric_12v12 >= 0 ? "green" : "red"}
            />
            <TotalCard
              label={
                metricsPeriodLabels?.halfYear
                  ? `ממוצע ${metricsPeriodLabels.halfYear}`
                  : "ממוצע 6v6"
              }
              value={`${totals.metric_6v6 >= 0 ? "+" : ""}${totals.metric_6v6.toFixed(1)}%`}
              color={totals.metric_6v6 >= 0 ? "green" : "red"}
            />
            <TotalCard
              label={
                metricsPeriodLabels?.quarter
                  ? `ממוצע ${metricsPeriodLabels.quarter}`
                  : "ממוצע 3v3"
              }
              value={`${totals.metric_3v3 >= 0 ? "+" : ""}${totals.metric_3v3.toFixed(1)}%`}
              color={totals.metric_3v3 >= 0 ? "green" : "red"}
            />
            <TotalCard
              label={
                metricsPeriodLabels?.twoMonths
                  ? `ממוצע ${metricsPeriodLabels.twoMonths}`
                  : "ממוצע 2v2"
              }
              value={`${totals.metric_2v2 >= 0 ? "+" : ""}${totals.metric_2v2.toFixed(1)}%`}
              color={totals.metric_2v2 >= 0 ? "green" : "red"}
            />
            <TotalCard
              label="% החזרות"
              value={`${totals.returns_pct.toFixed(1)}%`}
              color={totals.returns_pct > 20 ? "red" : "green"}
            />
          </>
        ) : (
          <>
            <TotalCard label="כמות" value={totals.qty.toLocaleString()} />
            <TotalCard
              label="מכירות"
              value={`₪${totals.sales.toLocaleString()}`}
            />
          </>
        )}
      </div>
    </div>
  );
}

function TotalCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: "green" | "red";
}) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p
        className={clsx(
          "text-lg font-bold",
          color === "green" && "text-green-600",
          color === "red" && "text-red-600",
          !color && "text-gray-900",
        )}
      >
        {value}
      </p>
    </div>
  );
}

// ============================================
// PAGINATION
// ============================================

export function ProductsPagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">מספר שורות:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="border rounded-lg px-2 py-1 text-sm"
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={200}>200</option>
        </select>
      </div>
      <div className="text-sm text-gray-600">
        מציג {start}-{end} מתוך {totalItems}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm rounded-lg disabled:opacity-50 hover:bg-gray-100"
        >
          ראשון
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm rounded-lg disabled:opacity-50 hover:bg-gray-100"
        >
          הקודם
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 text-sm rounded-lg disabled:opacity-50 hover:bg-gray-100"
        >
          הבא
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 text-sm rounded-lg disabled:opacity-50 hover:bg-gray-100"
        >
          אחרון
        </button>
      </div>
    </div>
  );
}
