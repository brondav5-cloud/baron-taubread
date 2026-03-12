"use client";

import { useState } from "react";
import { X, List } from "lucide-react";
import { CHART_COLORS } from "@/hooks/useComparisonSupabase";
import { StoresListModal } from "./StoresListModal";
import type { ComparisonStore } from "@/hooks/useComparisonSupabase";

interface SelectedStoresTagsProps {
  stores: ComparisonStore[];
  onRemoveStore: (storeId: string | number) => void;
  onClearAll: () => void;
}

const MAX_VISIBLE = 5;

export function SelectedStoresTags({
  stores,
  onRemoveStore,
  onClearAll,
}: SelectedStoresTagsProps) {
  const [showModal, setShowModal] = useState(false);

  if (stores.length === 0) return null;

  const visible = stores.slice(0, MAX_VISIBLE);
  const hidden  = stores.length - MAX_VISIBLE;

  return (
    <>
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-medium text-gray-500 ml-1">
          {stores.length} חנויות:
        </span>

        {visible.map((store, index) => (
          <span
            key={store.id}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length]}18`,
              color: CHART_COLORS[index % CHART_COLORS.length],
              border: `1px solid ${CHART_COLORS[index % CHART_COLORS.length]}35`,
            }}
          >
            {store.name}
            <button
              onClick={() => onRemoveStore(store.id)}
              className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}

        {hidden > 0 && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full text-xs font-medium transition-colors"
          >
            <List className="w-3 h-3" />
            +{hidden} נוספות
          </button>
        )}

        <button
          onClick={onClearAll}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors mr-1"
        >
          נקה הכל
        </button>
      </div>

      <StoresListModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        stores={stores}
        onRemoveStore={onRemoveStore}
        onClearAll={onClearAll}
      />
    </>
  );
}
