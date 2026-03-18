"use client";

import { X } from "lucide-react";
import type { DistributionV2Filters, DistributionV2FilterOptions } from "../types";

interface DistributionV2FiltersBarProps {
  open: boolean;
  filters: DistributionV2Filters;
  options: DistributionV2FilterOptions;
  onUpdate: (key: keyof DistributionV2Filters, value: string | string[]) => void;
  onClear: () => void;
  activeCount: number;
}

export function DistributionV2FiltersBar({
  open,
  filters,
  options,
  onUpdate,
  onClear,
  activeCount,
}: DistributionV2FiltersBarProps) {
  if (!open) return null;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-700">סינון</h3>
        {activeCount > 0 && (
          <button
            onClick={onClear}
            className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            נקה הכל ({activeCount})
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">מתאריך</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onUpdate("dateFrom", e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">עד תאריך</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onUpdate("dateTo", e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <FilterSelect
          label="עיר"
          options={options.cities}
          selected={filters.cities}
          onChange={(v) => onUpdate("cities", v)}
        />
        <FilterSelect
          label="רשת"
          options={options.networks}
          selected={filters.networks}
          onChange={(v) => onUpdate("networks", v)}
        />
        <FilterSelect
          label="נהג"
          options={options.drivers}
          selected={filters.drivers}
          onChange={(v) => onUpdate("drivers", v)}
        />
        <FilterSelect
          label="סוכן"
          options={options.agents}
          selected={filters.agents}
          onChange={(v) => onUpdate("agents", v)}
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-600">חיפוש</label>
        <input
          type="text"
          placeholder="חפש בכל הטבלה..."
          value={filters.search}
          onChange={(e) => onUpdate("search", e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-600">{label}</label>
      <select
        value=""
        onChange={(e) => e.target.value && toggle(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
      >
        <option value="">בחר {label}...</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {selected.includes(o) ? "✓ " : ""}{o}
          </option>
        ))}
      </select>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full"
            >
              {s}
              <button type="button" onClick={() => toggle(s)} className="hover:text-primary-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
