"use client";

import { Search, X } from "lucide-react";
import { clsx } from "clsx";
import type {
  UseStoresPageSupabaseReturn,
  StoresFilters,
} from "@/hooks/useStoresPageSupabase";

// ============================================
// SEARCH BAR
// ============================================

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function StoresSearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        placeholder="חיפוש לפי שם חנות או עיר..."
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

interface FiltersPanelProps {
  show: boolean;
  filters: StoresFilters;
  filterOptions: UseStoresPageSupabaseReturn["filterOptions"];
  onUpdateFilter: <K extends keyof StoresFilters>(
    key: K,
    value: StoresFilters[K],
  ) => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
}

export function StoresFiltersPanel({
  show,
  filters,
  filterOptions,
  onUpdateFilter,
  onClearFilters,
  activeFiltersCount,
}: FiltersPanelProps) {
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        {/* Cities */}
        <FilterSelect
          label="עיר"
          options={filterOptions.cities}
          selected={filters.cities}
          onChange={(value) => onUpdateFilter("cities", value)}
        />

        {/* Networks */}
        <FilterSelect
          label="רשת"
          options={filterOptions.networks}
          selected={filters.networks}
          onChange={(value) => onUpdateFilter("networks", value)}
        />

        {/* Agents */}
        <FilterSelect
          label="סוכן"
          options={filterOptions.agents}
          selected={filters.agents}
          onChange={(value) => onUpdateFilter("agents", value)}
        />

        {/* Drivers */}
        <FilterSelect
          label="נהג"
          options={filterOptions.drivers}
          selected={filters.drivers}
          onChange={(value) => onUpdateFilter("drivers", value)}
        />

        {/* Driver Groups */}
        <FilterSelect
          label="קבוצת נהגים"
          options={filterOptions.driverGroups}
          selected={filters.driver_groups}
          onChange={(value) => onUpdateFilter("driver_groups", value)}
        />

        {/* Status Long */}
        <FilterSelect
          label="מגמה שנתית"
          options={filterOptions.statusLong}
          selected={filters.status_long}
          onChange={(value) => onUpdateFilter("status_long", value)}
        />

        {/* Status Short */}
        <FilterSelect
          label="מגמה קצרה"
          options={filterOptions.statusShort}
          selected={filters.status_short}
          onChange={(value) => onUpdateFilter("status_short", value)}
        />
      </div>
    </div>
  );
}

// ============================================
// FILTER SELECT
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
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-600">{label}</label>
      <div className="relative">
        <select
          multiple={false}
          value=""
          onChange={(e) => e.target.value && handleToggle(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
        >
          <option value="">בחר {label}...</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {selected.includes(option) ? "✓ " : ""}
              {option}
            </option>
          ))}
        </select>
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
            >
              {item}
              <button
                onClick={() => handleToggle(item)}
                className="hover:text-blue-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// PAGINATION
// ============================================

interface PaginationProps {
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
}: PaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm border">
      {/* Items info */}
      <div className="text-sm text-gray-600">
        מציג {startItem}-{endItem} מתוך {totalItems}
      </div>

      {/* Page size */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">שורות בעמוד:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="px-2 py-1 border rounded-lg text-sm"
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* Page navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
        >
          ראשון
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
        >
          הקודם
        </button>

        <span className="px-3 py-1 text-sm">
          עמוד {currentPage} מתוך {totalPages}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
        >
          הבא
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
        >
          אחרון
        </button>
      </div>
    </div>
  );
}

// ============================================
// TOTALS BAR
// ============================================

interface TotalsBarProps {
  totals: UseStoresPageSupabaseReturn["totals"];
  viewMode: "metrics" | "data";
  metricsPeriodLabels?: UseStoresPageSupabaseReturn["metricsPeriodLabels"];
}

export function StoresTotalsBar({
  totals,
  viewMode,
  metricsPeriodLabels,
}: TotalsBarProps) {
  if (!totals) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 shadow-sm border">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <TotalCard label="חנויות" value={totals.count.toString()} />

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
            <TotalCard
              label="אספקות"
              value={(totals.deliveries ?? 0).toLocaleString()}
            />
            <TotalCard label="החזרות" value={totals.returns.toLocaleString()} />
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
