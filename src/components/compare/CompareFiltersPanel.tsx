"use client";

import { Filter, X, Users } from "lucide-react";
import { clsx } from "clsx";
import { Card, CardContent, CardHeader } from "@/components/ui";
import { MultiSelect } from "@/components/ui";
import type { CompareFilters } from "@/hooks/useComparisonSupabase";

interface CompareFiltersPanelProps {
  show: boolean;
  filters: CompareFilters;
  filterOptions: {
    cities: string[];
    networks: string[];
    agents: string[];
    drivers: string[];
    driverGroups: string[];
    statusLong: string[];
    statusShort: string[];
  };
  activeFiltersCount: number;
  filteredStoresCount: number;
  onUpdateFilter: <K extends keyof CompareFilters>(
    key: K,
    value: CompareFilters[K],
  ) => void;
  onClearFilters: () => void;
  onToggle: () => void;
  onAddAllFiltered?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  עליה_חדה: "🚀 עליה חדה",
  צמיחה: "📈 צמיחה",
  יציב: "➡️ יציב",
  ירידה: "📉 ירידה",
  התרסקות: "⚠️ התרסקות",
  אזעקה: "🚨 אזעקה",
};

export function CompareFiltersPanel({
  show,
  filters,
  filterOptions,
  activeFiltersCount,
  filteredStoresCount,
  onUpdateFilter,
  onClearFilters,
  onToggle,
  onAddAllFiltered,
}: CompareFiltersPanelProps) {
  const hasFilteredStores = filteredStoresCount > 0;
  const showAddAllButton =
    onAddAllFiltered && hasFilteredStores && activeFiltersCount > 0;

  return (
    <Card className="border-2 border-primary-100">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <Filter className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">
                בחר חנויות להשוואה לפי
              </h3>
              <p className="text-sm text-gray-500">
                בחר עיר, רשת, סוכן, נהג או קבוצת נהגים – תופיע רשימת החנויות
                התואמות לבחירה
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <button
                onClick={onClearFilters}
                className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1 px-3 py-1.5 hover:bg-red-50 rounded-lg"
              >
                <X className="w-4 h-4" />
                נקה בחירה
              </button>
            )}
            {showAddAllButton && (
              <button
                onClick={onAddAllFiltered}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
              >
                <Users className="w-4 h-4" />
                הוסף את כל {filteredStoresCount} החנויות המסוננות
              </button>
            )}
            <button
              onClick={onToggle}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                show
                  ? "bg-gray-200 text-gray-600"
                  : "bg-primary-100 text-primary-700 hover:bg-primary-200",
              )}
            >
              {show ? "הסתר" : "הצג אפשרויות בחירה"}
            </button>
          </div>
        </div>
      </CardHeader>
      {show && (
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            <MultiSelect
              label="עיר"
              options={filterOptions.cities}
              selected={filters.cities}
              onChange={(v) => onUpdateFilter("cities", v)}
              placeholder="הכל"
            />
            <MultiSelect
              label="רשת"
              options={filterOptions.networks}
              selected={filters.networks}
              onChange={(v) => onUpdateFilter("networks", v)}
              placeholder="הכל"
            />
            <MultiSelect
              label="סוכן"
              options={filterOptions.agents}
              selected={filters.agents}
              onChange={(v) => onUpdateFilter("agents", v)}
              placeholder="הכל"
            />
            <MultiSelect
              label="נהג"
              options={filterOptions.drivers}
              selected={filters.drivers}
              onChange={(v) => onUpdateFilter("drivers", v)}
              placeholder="הכל"
            />
            <MultiSelect
              label="קבוצת נהגים"
              options={filterOptions.driverGroups}
              selected={filters.driver_groups}
              onChange={(v) => onUpdateFilter("driver_groups", v)}
              placeholder="הכל"
            />
            <MultiSelect
              label="מגמה שנתית"
              options={filterOptions.statusLong}
              selected={filters.status_long}
              onChange={(v) => onUpdateFilter("status_long", v)}
              placeholder="הכל"
              renderOption={(opt) => STATUS_LABELS[opt] || opt}
            />
            <MultiSelect
              label="מגמה קצרה"
              options={filterOptions.statusShort}
              selected={filters.status_short}
              onChange={(v) => onUpdateFilter("status_short", v)}
              placeholder="הכל"
              renderOption={(opt) => STATUS_LABELS[opt] || opt}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
