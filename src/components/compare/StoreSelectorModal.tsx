"use client";

import { clsx } from "clsx";
import { StatusBadgeLong } from "@/components/ui";
import { formatPercent, getMetricColor } from "@/lib/calculations";
import type { ComparisonStore } from "@/hooks/useComparisonSupabase";

interface StoreSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores: ComparisonStore[];
  selectedStores: ComparisonStore[];
  onSelectStore: (store: ComparisonStore) => void;
}

export function StoreSelectorModal({
  isOpen,
  onClose,
  stores,
  selectedStores,
  onSelectStore,
}: StoreSelectorModalProps) {
  if (!isOpen) return null;

  const availableStores = stores.filter(
    (s) => !selectedStores.find((ss) => ss.id === s.id),
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-lg">בחר חנות להשוואה</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto max-h-96 p-4 space-y-2">
          {availableStores.map((store) => (
            <button
              key={store.id}
              onClick={() => onSelectStore(store)}
              className="w-full p-3 bg-gray-50 rounded-xl flex items-center justify-between hover:bg-gray-100 transition-colors text-right"
            >
              <div>
                <p className="font-medium text-gray-900">{store.name}</p>
                <p className="text-xs text-gray-500">
                  {store.network || "עצמאי"}
                </p>
              </div>
              <div className="text-left">
                <p
                  className={clsx(
                    "font-bold",
                    getMetricColor(store.metric_12v12),
                  )}
                >
                  {formatPercent(store.metric_12v12)}
                </p>
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
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
