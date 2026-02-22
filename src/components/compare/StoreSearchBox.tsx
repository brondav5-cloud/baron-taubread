"use client";

import { clsx } from "clsx";
import { formatPercent, getMetricColor } from "@/lib/calculations";
import type { ComparisonStore } from "@/hooks/useComparisonSupabase";

interface StoreSearchBoxProps {
  storeSearch: string;
  onSearchChange: (value: string) => void;
  searchResults: ComparisonStore[];
  onSelectStore: (store: ComparisonStore) => void;
  cities: string[];
  selectedCity: string;
  onCityChange: (city: string) => void;
}

export function StoreSearchBox({
  storeSearch,
  onSearchChange,
  searchResults,
  onSelectStore,
  cities,
  selectedCity,
  onCityChange,
}: StoreSearchBoxProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-1 max-w-md">
        <input
          type="text"
          value={storeSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="חפש חנות לפי שם או עיר..."
          className="w-full px-4 py-2 pr-10 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          🔍
        </span>

        {/* Search Results Dropdown */}
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

      <span className="text-sm text-gray-500">או בחר מעיר:</span>

      <select
        value={selectedCity}
        onChange={(e) => onCityChange(e.target.value)}
        className="px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 min-w-[200px]"
      >
        <option value="">בחר עיר...</option>
        {cities.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>
    </div>
  );
}
