"use client";

import { useState, useMemo } from "react";
import { Search, Check, Plus, X } from "lucide-react";
import { useStoresAndProducts } from "@/context/StoresAndProductsContext";
import { getNetworks } from "@/lib/networkLoader";

interface NetworkStoresPickerProps {
  selectedStoreIds: number[];
  onToggleStore: (storeId: number) => void;
  onSetStoreIds: (ids: number[]) => void;
  excludeNetworkId?: string;
}

export function NetworkStoresPicker({
  selectedStoreIds,
  onToggleStore,
  onSetStoreIds,
  excludeNetworkId,
}: NetworkStoresPickerProps) {
  const [search, setSearch] = useState("");

  const { stores: dbStores } = useStoresAndProducts();
  const allStoresFromSupabase = useMemo(
    () =>
      dbStores.map((s) => ({
        id: s.external_id,
        name: s.name,
        city: s.city || "",
      })),
    [dbStores],
  );

  const { selectedStores, availableStores } = useMemo(() => {
    const allStores = allStoresFromSupabase;
    const networks = getNetworks();
    const selectedSet = new Set(selectedStoreIds);

    const assignedToOtherNetworks = new Set<number>();
    networks.forEach((n) => {
      if (n.id !== excludeNetworkId) {
        n.storeIds.forEach((id) => assignedToOtherNetworks.add(id));
      }
    });

    const selected: typeof allStores = [];
    const available: typeof allStores = [];

    allStores.forEach((store) => {
      if (selectedSet.has(store.id)) {
        selected.push(store);
      } else if (!assignedToOtherNetworks.has(store.id)) {
        available.push(store);
      }
    });

    return { selectedStores: selected, availableStores: available };
  }, [allStoresFromSupabase, excludeNetworkId, selectedStoreIds]);

  const filteredAvailable = useMemo(() => {
    if (!search) return availableStores;
    const term = search.toLowerCase();
    return availableStores.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.city.toLowerCase().includes(term),
    );
  }, [availableStores, search]);

  const handleSelectAll = () => {
    const allIds = [...selectedStoreIds, ...availableStores.map((s) => s.id)];
    onSetStoreIds(allIds);
  };

  const handleClearAll = () => {
    onSetStoreIds([]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">
          חנויות ברשת ({selectedStoreIds.length} נבחרו)
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-xs text-primary-600 hover:text-primary-700"
          >
            בחר הכל
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs text-red-600 hover:text-red-700"
          >
            נקה הכל
          </button>
        </div>
      </div>

      {/* Selected Stores */}
      {selectedStores.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-gray-500 mb-1">
            נבחרות ({selectedStores.length})
          </div>
          <div className="border border-green-200 bg-green-50 rounded-xl max-h-32 overflow-y-auto">
            {selectedStores.map((store) => (
              <div
                key={store.id}
                className="flex items-center justify-between p-2 border-b border-green-100 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-900">{store.name}</span>
                  <span className="text-xs text-gray-500">{store.city}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleStore(store.id)}
                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-2">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש חנות להוספה..."
          className="w-full pr-10 pl-4 py-2 bg-gray-50 rounded-xl text-sm"
        />
      </div>

      {/* Available Stores */}
      <div className="text-xs text-gray-500 mb-1">
        זמינות להוספה ({filteredAvailable.length})
      </div>
      <div className="border border-gray-200 rounded-xl max-h-40 overflow-y-auto">
        {filteredAvailable.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            {search ? "לא נמצאו חנויות" : "אין חנויות זמינות"}
          </div>
        ) : (
          filteredAvailable.map((store) => (
            <button
              key={store.id}
              type="button"
              onClick={() => onToggleStore(store.id)}
              className="w-full flex items-center justify-between p-2 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-right"
            >
              <div>
                <span className="text-sm text-gray-900">{store.name}</span>
                <span className="text-xs text-gray-500 mr-2">{store.city}</span>
              </div>
              <Plus className="w-4 h-4 text-primary-500" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
