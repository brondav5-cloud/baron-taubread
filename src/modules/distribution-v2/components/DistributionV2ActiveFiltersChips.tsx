"use client";

import { X } from "lucide-react";
import type { DistributionV2Filters } from "../types";

interface DistributionV2ActiveFiltersChipsProps {
  filters: DistributionV2Filters;
  onRemoveDateFrom: () => void;
  onRemoveDateTo: () => void;
  onRemoveCity: (city: string) => void;
  onRemoveNetwork: (network: string) => void;
  onRemoveDriver: (driver: string) => void;
  onRemoveAgent: (agent: string) => void;
  onRemoveSearch: () => void;
  onClearAll: () => void;
}

export function DistributionV2ActiveFiltersChips({
  filters,
  onRemoveDateFrom,
  onRemoveDateTo,
  onRemoveCity,
  onRemoveNetwork,
  onRemoveDriver,
  onRemoveAgent,
  onRemoveSearch,
  onClearAll,
}: DistributionV2ActiveFiltersChipsProps) {
  const hasDateFrom = filters.dateFrom.trim() !== "";
  const hasDateTo = filters.dateTo.trim() !== "";
  const hasSearch = filters.search.trim() !== "";
  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  if (hasDateFrom) chips.push({ key: "dateFrom", label: `מתאריך: ${filters.dateFrom}`, onRemove: onRemoveDateFrom });
  if (hasDateTo) chips.push({ key: "dateTo", label: `עד תאריך: ${filters.dateTo}`, onRemove: onRemoveDateTo });
  filters.cities.forEach((c) => chips.push({ key: `city-${c}`, label: `עיר: ${c}`, onRemove: () => onRemoveCity(c) }));
  filters.networks.forEach((n) => chips.push({ key: `net-${n}`, label: `רשת: ${n}`, onRemove: () => onRemoveNetwork(n) }));
  filters.drivers.forEach((d) => chips.push({ key: `driver-${d}`, label: `נהג: ${d}`, onRemove: () => onRemoveDriver(d) }));
  filters.agents.forEach((a) => chips.push({ key: `agent-${a}`, label: `סוכן: ${a}`, onRemove: () => onRemoveAgent(a) }));
  if (hasSearch) chips.push({ key: "search", label: `חיפוש: "${filters.search}"`, onRemove: onRemoveSearch });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-1">
      <span className="text-xs font-semibold text-slate-400">פילטרים</span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 bg-white border border-slate-200 text-slate-700 text-xs rounded-lg font-medium shadow-sm"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.onRemove}
            className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800"
            title="הסר"
            aria-label="הסר פילטר"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-semibold text-slate-500 hover:text-red-600 mr-1"
      >
        נקה הכל
      </button>
    </div>
  );
}
