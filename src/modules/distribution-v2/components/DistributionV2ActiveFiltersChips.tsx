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
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-gray-500">פילטרים פעילים:</span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-100 text-primary-800 text-xs rounded-full font-medium"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.onRemove}
            className="p-0.5 rounded hover:bg-primary-200"
            title="הסר"
            aria-label="הסר פילטר"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs text-red-600 hover:text-red-800 underline"
      >
        נקה הכל
      </button>
    </div>
  );
}
