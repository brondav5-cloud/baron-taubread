"use client";

import Link from "next/link";
import { Plus, X } from "lucide-react";
import { clsx } from "clsx";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  StatusBadgeLong,
} from "@/components/ui";
import { formatPercent, getMetricColor } from "@/lib/calculations";
import type { ComparisonStore } from "@/hooks/useComparisonSupabase";

interface CityStoresListProps {
  cityName: string;
  stores: ComparisonStore[];
  selectedStores: ComparisonStore[];
  onAddStore: (store: ComparisonStore) => void;
  onRemoveStore: (storeId: string | number) => void;
  onAddAll: () => void;
  onClearAll: () => void;
}

export function CityStoresList({
  cityName,
  stores,
  selectedStores,
  onAddStore,
  onRemoveStore,
  onAddAll,
  onClearAll,
}: CityStoresListProps) {
  const hasUnselectedStores = stores.some(
    (s) => !selectedStores.find((ss) => ss.id === s.id),
  );
  const isSelected = (storeId: string | number) =>
    selectedStores.some((s) => s.id === storeId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>כל החנויות ב{cityName}</CardTitle>
          <div className="flex items-center gap-2">
            {stores.length > 0 && hasUnselectedStores && (
              <button
                onClick={onAddAll}
                className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
              >
                בחר הכל
              </button>
            )}
            {selectedStores.length > 0 && (
              <button
                onClick={onClearAll}
                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
              >
                נקה בחירה
              </button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {stores.map((store, index) => (
            <div
              key={store.id}
              className={clsx(
                "flex items-center justify-between p-3 rounded-xl transition-colors",
                isSelected(store.id)
                  ? "bg-primary-50 border border-primary-200"
                  : "bg-gray-50 hover:bg-gray-100",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={clsx(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    index < 3
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600",
                  )}
                >
                  {index + 1}
                </span>
                <div>
                  <Link
                    href={`/dashboard/stores/${String(store.id)}`}
                    className="font-medium text-gray-900 hover:text-primary-600"
                  >
                    {store.name}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {store.network || "עצמאי"} | {store.agent}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p
                    className={clsx(
                      "font-bold",
                      getMetricColor(store.metric_12v12),
                    )}
                  >
                    {formatPercent(store.metric_12v12)}
                  </p>
                  <p className="text-xs text-gray-500">12v12</p>
                </div>
                <StatusBadgeLong
                  status={
                    store.status_long as
                      | "עליה_חדה"
                      | "צמיחה"
                      | "יציב"
                      | "ירידה"
                      | "התרסקות"
                  }
                  size="sm"
                />
                {!isSelected(store.id) ? (
                  <button
                    onClick={() => onAddStore(store)}
                    className="p-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => onRemoveStore(store.id)}
                    className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
