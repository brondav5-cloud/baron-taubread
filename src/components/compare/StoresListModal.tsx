"use client";

import { X, TrendingUp, TrendingDown } from "lucide-react";
import { CHART_COLORS } from "@/hooks/useComparisonSupabase";
import type { ComparisonStore } from "@/hooks/useComparisonSupabase";

interface StoresListModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores: ComparisonStore[];
  onRemoveStore: (storeId: string | number) => void;
  onClearAll: () => void;
}

export function StoresListModal({
  isOpen,
  onClose,
  stores,
  onRemoveStore,
  onClearAll,
}: StoresListModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            רשימת חנויות ({stores.length})
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stores List */}
        <div className="flex-1 overflow-y-auto p-2">
          {stores.map((store, index) => (
            <div
              key={store.id}
              className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                  }}
                />
                <div>
                  <div className="font-medium text-gray-900">{store.name}</div>
                  <div className="text-xs text-gray-500">{store.city}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MetricBadge value={store.metric_12v12} />
                <button
                  onClick={() => onRemoveStore(store.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClearAll}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium"
          >
            נקה הכל
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}

function MetricBadge({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium ${
        isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {isPositive ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      {isPositive ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}
