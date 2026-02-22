"use client";

import { X, Search } from "lucide-react";
import { MultiSelect } from "@/components/ui";
import {
  STATUS_DISPLAY_LONG,
  STATUS_DISPLAY_SHORT,
  type StatusLong,
  type StatusShort,
} from "@/types/data";
import type { ProfitFilters } from "@/hooks/useProfitabilityPage";

interface Props {
  show: boolean;
  filters: ProfitFilters;
  cities: string[];
  networks: string[];
  agents: string[];
  drivers: string[];
  activeFiltersCount: number;
  onUpdateFilter: <K extends keyof ProfitFilters>(
    key: K,
    value: ProfitFilters[K],
  ) => void;
  onClearFilters: () => void;
}

const statusLongOptions = Object.keys(STATUS_DISPLAY_LONG) as StatusLong[];
const statusShortOptions = Object.keys(STATUS_DISPLAY_SHORT) as StatusShort[];

export function ProfitabilityFilters({
  show,
  filters,
  cities,
  networks,
  agents,
  drivers,
  activeFiltersCount,
  onUpdateFilter,
  onClearFilters,
}: Props) {
  if (!show) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={filters.search || ""}
          onChange={(e) =>
            onUpdateFilter("search", e.target.value || undefined)
          }
          placeholder="חיפוש חנות, עיר, נהג..."
          className="w-full pr-11 pl-4 py-3 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Filter Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
          label="נהג"
          options={drivers}
          selected={filters.drivers || []}
          onChange={(v) => onUpdateFilter("drivers", v.length ? v : undefined)}
          placeholder="הכל"
        />
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
          renderOption={(opt) => STATUS_DISPLAY_LONG[opt as StatusLong]}
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
          renderOption={(opt) => STATUS_DISPLAY_SHORT[opt as StatusShort]}
        />
      </div>

      {/* Clear Button */}
      {activeFiltersCount > 0 && (
        <div className="flex justify-end">
          <button
            onClick={onClearFilters}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            נקה סינונים ({activeFiltersCount})
          </button>
        </div>
      )}
    </div>
  );
}
