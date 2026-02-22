"use client";

import { clsx } from "clsx";
import { formatPercent, getMetricColor } from "@/lib/calculations";
import type { ComparisonStore } from "@/hooks/useComparisonSupabase";

const CRITERIA_LABELS: Record<string, string> = {
  city: "עיר",
  agent: "סוכן",
  network: "רשת",
  driver: "נהג",
  driver_group: "קבוצת נהגים",
};

export type CriteriaType =
  | "city"
  | "agent"
  | "network"
  | "driver"
  | "driver_group";

interface CriteriaStoreSelectorProps {
  storeSearch: string;
  onSearchChange: (value: string) => void;
  searchResults: ComparisonStore[];
  onSelectStore: (store: ComparisonStore) => void;
  selectedCriteriaType: CriteriaType;
  onCriteriaTypeChange: (type: CriteriaType) => void;
  selectedCriteriaValue: string;
  onCriteriaValueChange: (value: string) => void;
  criteriaValueOptions: string[];
}

export function CriteriaStoreSelector({
  storeSearch,
  onSearchChange,
  searchResults,
  onSelectStore,
  selectedCriteriaType,
  onCriteriaTypeChange,
  selectedCriteriaValue,
  onCriteriaValueChange,
  criteriaValueOptions,
}: CriteriaStoreSelectorProps) {
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as CriteriaType;
    onCriteriaTypeChange(value);
    onCriteriaValueChange("");
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <input
          type="text"
          value={storeSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="חפש חנויות לפי שם או עיר"
          className="w-full px-4 py-2 pr-10 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          🔍
        </span>

        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto">
            {searchResults.map((store) => (
              <button
                key={store.id}
                onClick={() => {
                  onSelectStore(store);
                  onSearchChange("");
                }}
                className="w-full px-4 py-2 text-right hover:bg-gray-50 flex items-center justify-between border-b last:border-b-0"
              >
                <div>
                  <div className="font-medium">{store.name}</div>
                  <div className="text-xs text-gray-500">
                    {store.city} | {store.agent}
                  </div>
                </div>
                <div
                  className={clsx(
                    "font-bold",
                    getMetricColor(store.metric_12v12),
                  )}
                >
                  {formatPercent(store.metric_12v12)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="text-sm text-gray-500 whitespace-nowrap">
        או בחר לפי:
      </span>

      <select
        value={selectedCriteriaType}
        onChange={handleTypeChange}
        className="px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 min-w-[140px]"
      >
        <option value="city">עיר</option>
        <option value="agent">סוכן</option>
        <option value="network">רשת</option>
        <option value="driver">נהג</option>
        <option value="driver_group">קבוצת נהגים</option>
      </select>

      <select
        value={selectedCriteriaValue}
        onChange={(e) => onCriteriaValueChange(e.target.value)}
        className="px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 min-w-[200px]"
      >
        <option value="">
          בחר {CRITERIA_LABELS[selectedCriteriaType] || selectedCriteriaType}...
        </option>
        {criteriaValueOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
