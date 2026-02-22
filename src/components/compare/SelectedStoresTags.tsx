"use client";

import { useState } from "react";
import { X, ChevronDown, AlertTriangle } from "lucide-react";
import { CHART_COLORS } from "@/hooks/useComparisonSupabase";
import { StoresListModal } from "./StoresListModal";
import type { ComparisonStore } from "@/hooks/useComparisonSupabase";

interface SelectedStoresTagsProps {
  stores: ComparisonStore[];
  onRemoveStore: (storeId: string | number) => void;
  onClearAll: () => void;
}

const THRESHOLD_COLLAPSED = 6;
const THRESHOLD_SUMMARY = 16;

export function SelectedStoresTags({
  stores,
  onRemoveStore,
  onClearAll,
}: SelectedStoresTagsProps) {
  const [showModal, setShowModal] = useState(false);

  if (stores.length === 0) return null;

  // Mode: full (1-5), collapsed (6-15), summary (16+)
  const mode =
    stores.length < THRESHOLD_COLLAPSED
      ? "full"
      : stores.length < THRESHOLD_SUMMARY
        ? "collapsed"
        : "summary";

  return (
    <>
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm font-medium text-gray-600">
          חנויות נבחרות:
        </span>

        {/* Mode: Full - show all tags */}
        {mode === "full" && (
          <>
            {stores.map((store, index) => (
              <StoreTag
                key={store.id}
                store={store}
                colorIndex={index}
                onRemove={() => onRemoveStore(store.id)}
              />
            ))}
          </>
        )}

        {/* Mode: Collapsed - show first 2 + button */}
        {mode === "collapsed" && (
          <>
            {stores.slice(0, 2).map((store, index) => (
              <StoreTag
                key={store.id}
                store={store}
                colorIndex={index}
                onRemove={() => onRemoveStore(store.id)}
              />
            ))}
            <ExpandButton
              count={stores.length}
              onClick={() => setShowModal(true)}
            />
          </>
        )}

        {/* Mode: Summary - very compact */}
        {mode === "summary" && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
              <AlertTriangle className="w-4 h-4" />
              {stores.length} חנויות - מצב סיכום
            </span>
            <ExpandButton
              count={stores.length}
              onClick={() => setShowModal(true)}
            />
          </div>
        )}

        <button
          onClick={onClearAll}
          className="text-sm text-red-500 hover:text-red-600 mr-2"
        >
          נקה הכל
        </button>
      </div>

      {/* Modal for full list */}
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

function StoreTag({
  store,
  colorIndex,
  onRemove,
}: {
  store: ComparisonStore;
  colorIndex: number;
  onRemove: () => void;
}) {
  const color = CHART_COLORS[colorIndex % CHART_COLORS.length];
  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      {store.name}
      <button
        onClick={onRemove}
        className="hover:bg-black/10 rounded-full p-0.5"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

function ExpandButton({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition-colors"
    >
      +{count - 2} נוספות
      <ChevronDown className="w-4 h-4" />
    </button>
  );
}
