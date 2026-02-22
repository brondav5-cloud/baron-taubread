"use client";

import { useState, useMemo } from "react";
import { X, Search, Plus, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import { useStoresAndProducts } from "@/context/StoresAndProductsContext";
import { formatPercent, getMetricColor } from "@/lib/calculations";
import {
  type TreatmentReason,
  TREATMENT_REASON_CONFIG,
} from "@/context/TreatmentContext";

interface AddToTreatmentModalProps {
  existingStoreIds: number[];
  onAdd: (storeId: number, reason: TreatmentReason, notes: string) => void;
  onClose: () => void;
}

export function AddToTreatmentModal({
  existingStoreIds,
  onAdd,
  onClose,
}: AddToTreatmentModalProps) {
  const [search, setSearch] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [reason, setReason] = useState<TreatmentReason>("manual");
  const [notes, setNotes] = useState("");

  const { stores: dbStores } = useStoresAndProducts();
  const allStores = useMemo(
    () =>
      dbStores.map((s) => {
        const m = s.metrics || {};
        return {
          id: s.external_id,
          name: s.name,
          city: s.city || "",
          agent: s.agent || "",
          metric_12v12: m.metric_12v12 ?? 0,
        };
      }),
    [dbStores],
  );

  const availableStores = useMemo(() => {
    const existingSet = new Set(existingStoreIds);
    let filtered = allStores.filter((s) => !existingSet.has(s.id));

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(searchLower) ||
          s.city.toLowerCase().includes(searchLower) ||
          s.agent.toLowerCase().includes(searchLower),
      );
    }

    return filtered.slice(0, 20);
  }, [allStores, existingStoreIds, search]);

  const selectedStore = selectedStoreId
    ? allStores.find((s) => s.id === selectedStoreId)
    : null;

  const handleSubmit = () => {
    if (selectedStoreId) {
      onAdd(selectedStoreId, reason, notes);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-lg">הוסף חנות לטיפול</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חפש חנות לפי שם, עיר או סוכן..."
              className="w-full pr-10 pl-4 py-3 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          </div>

          {/* Store Selection */}
          {!selectedStore ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableStores.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                  {search ? "לא נמצאו חנויות" : "כל החנויות כבר ברשימת הטיפול"}
                </p>
              ) : (
                availableStores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => setSelectedStoreId(store.id)}
                    className="w-full p-3 bg-gray-50 rounded-xl flex items-center justify-between hover:bg-gray-100 transition-colors text-right"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{store.name}</p>
                      <p className="text-xs text-gray-500">
                        {store.city} | {store.agent}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <p
                          className={clsx(
                            "font-bold text-sm",
                            getMetricColor(store.metric_12v12),
                          )}
                        >
                          {formatPercent(store.metric_12v12)}
                        </p>
                        <p className="text-xs text-gray-500">12v12</p>
                      </div>
                      <Plus className="w-5 h-5 text-gray-400" />
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              {/* Selected Store */}
              <div className="p-4 bg-primary-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-primary-900">
                      {selectedStore.name}
                    </p>
                    <p className="text-sm text-primary-700">
                      {selectedStore.city} | {selectedStore.agent}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedStoreId(null)}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    שנה
                  </button>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  סיבת ההוספה
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(TREATMENT_REASON_CONFIG).map(
                    ([key, config]) => (
                      <button
                        key={key}
                        onClick={() => setReason(key as TreatmentReason)}
                        className={clsx(
                          "px-3 py-2 rounded-lg text-sm font-medium transition-colors border",
                          reason === key
                            ? `${config.bgColor} ${config.color} border-current`
                            : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100",
                        )}
                      >
                        {config.label}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  הערות (אופציונלי)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="הוסף הערות לגבי החנות..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedStoreId}
            className={clsx(
              "px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2",
              selectedStoreId
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-gray-200 text-gray-500 cursor-not-allowed",
            )}
          >
            <Plus className="w-4 h-4" />
            הוסף לטיפול
          </button>
        </div>
      </div>
    </div>
  );
}
