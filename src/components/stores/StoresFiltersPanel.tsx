"use client";

import { X } from "lucide-react";
import { MultiSelect } from "@/components/ui";
import type { StatusLong, StatusShort } from "@/types/data";
import type { StoresFilters } from "@/hooks/useStoresPage";

interface StoresFiltersPanelProps {
  show: boolean;
  filters: StoresFilters;
  cities: string[];
  networks: string[];
  agents: string[];
  drivers: string[];
  statusLongOptions: StatusLong[];
  statusShortOptions: StatusShort[];
  activeFiltersCount: number;
  onUpdateFilter: <K extends keyof StoresFilters>(
    key: K,
    value: StoresFilters[K],
  ) => void;
  onClearFilters: () => void;
}

export function StoresFiltersPanel({
  show,
  filters,
  cities,
  networks,
  agents,
  drivers,
  statusLongOptions,
  statusShortOptions,
  activeFiltersCount,
  onUpdateFilter,
  onClearFilters,
}: StoresFiltersPanelProps) {
  if (!show) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MultiSelect
          label="עיר"
          options={cities}
          selected={filters.cities || []}
          onChange={(v) => onUpdateFilter("cities", v.length ? v : undefined)}
          placeholder="הכל"
        />
        <MultiSelect
          label="רשת"
          options={networks}
          selected={filters.networks || []}
          onChange={(v) => onUpdateFilter("networks", v.length ? v : undefined)}
          placeholder="הכל"
        />
        <MultiSelect
          label="סוכן"
          options={agents}
          selected={filters.agents || []}
          onChange={(v) => onUpdateFilter("agents", v.length ? v : undefined)}
          placeholder="הכל"
        />
        <MultiSelect
          label="קו חלוקה"
          options={drivers}
          selected={filters.drivers || []}
          onChange={(v) => onUpdateFilter("drivers", v.length ? v : undefined)}
          placeholder="הכל"
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MultiSelect
          label="סטטוס ארוך"
          options={statusLongOptions}
          selected={filters.status_long || []}
          onChange={(v) =>
            onUpdateFilter(
              "status_long",
              v.length ? (v as StatusLong[]) : undefined,
            )
          }
          placeholder="הכל"
        />
        <MultiSelect
          label="סטטוס קצר"
          options={statusShortOptions}
          selected={filters.status_short || []}
          onChange={(v) =>
            onUpdateFilter(
              "status_short",
              v.length ? (v as StatusShort[]) : undefined,
            )
          }
          placeholder="הכל"
        />
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            מינימום פריטים
          </label>
          <input
            type="number"
            value={filters.minQty || ""}
            onChange={(e) =>
              onUpdateFilter(
                "minQty",
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
            placeholder="0"
            className="w-full px-3 py-2 bg-gray-50 rounded-xl text-sm"
          />
        </div>
      </div>
      {activeFiltersCount > 0 && (
        <button
          onClick={onClearFilters}
          className="text-sm text-red-600 flex items-center gap-1"
        >
          <X className="w-4 h-4" />
          נקה הכל
        </button>
      )}
    </div>
  );
}
