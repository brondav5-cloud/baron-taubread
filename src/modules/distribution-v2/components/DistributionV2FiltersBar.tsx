"use client";

import { X, Calendar } from "lucide-react";
import type { DistributionV2Filters, DistributionV2FilterOptions } from "../types";

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getPresetRange(preset: "month" | "quarter" | "year"): { from: string; to: string } {
  const now = new Date();
  const today = toDateStr(now);
  if (preset === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toDateStr(from), to: today };
  }
  if (preset === "quarter") {
    const q = Math.floor(now.getMonth() / 3) + 1;
    const from = new Date(now.getFullYear(), (q - 1) * 3, 1);
    const to = new Date(now.getFullYear(), q * 3, 0);
    return { from: toDateStr(from), to: toDateStr(to) };
  }
  const from = new Date(now.getFullYear(), 0, 1);
  return { from: toDateStr(from), to: today };
}

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
    <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-soft border border-slate-200/90 space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h3 className="text-sm font-bold text-slate-800 tracking-tight">סינון נתונים</h3>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-sm font-semibold text-slate-500 hover:text-red-600 flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            נקה ({activeCount})
          </button>
        )}
      </div>
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          תאריך מהיר
        </span>
        <div className="flex flex-wrap gap-2">
          {(["month", "quarter", "year"] as const).map((preset) => {
            const labels = { month: "החודש", quarter: "הרבעון", year: "השנה" };
            const { from, to } = getPresetRange(preset);
            return (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  onUpdate("dateFrom", from);
                  onUpdate("dateTo", to);
                }}
                className="px-3.5 py-2 rounded-xl text-sm font-semibold border border-slate-200 bg-slate-50 text-slate-700 hover:bg-white hover:border-slate-300 transition-colors"
              >
                {labels[preset]}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-500">מתאריך</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onUpdate("dateFrom", e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 bg-slate-50/30 focus:ring-2 focus:ring-primary-500/15 focus:border-primary-400"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-500">עד תאריך</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onUpdate("dateTo", e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 bg-slate-50/30 focus:ring-2 focus:ring-primary-500/15 focus:border-primary-400"
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
        <label className="block text-xs font-semibold text-slate-500">חיפוש</label>
        <input
          type="text"
          placeholder="חנות, מוצר, עיר, רשת…"
          value={filters.search}
          onChange={(e) => onUpdate("search", e.target.value)}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 bg-white focus:ring-2 focus:ring-primary-500/15 focus:border-primary-400"
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
      <label className="block text-xs font-semibold text-slate-500">{label}</label>
      <select
        value=""
        onChange={(e) => e.target.value && toggle(e.target.value)}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50/30 text-slate-800"
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
              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 border border-slate-200 text-slate-700 text-xs rounded-lg font-medium"
            >
              {s}
              <button type="button" onClick={() => toggle(s)} className="hover:text-slate-900 p-0.5 rounded hover:bg-slate-200/80">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
