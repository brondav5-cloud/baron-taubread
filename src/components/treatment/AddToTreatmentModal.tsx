"use client";

import { useState, useMemo } from "react";
import { X, Search, Plus, AlertTriangle, ChevronDown } from "lucide-react";
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
  const [search,          setSearch]          = useState("");
  const [filterCity,      setFilterCity]      = useState("");
  const [filterAgent,     setFilterAgent]     = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [reason,          setReason]          = useState<TreatmentReason>("manual");
  const [notes,           setNotes]           = useState("");

  const { stores: dbStores } = useStoresAndProducts();

  const allStores = useMemo(
    () =>
      dbStores.map((s) => {
        const m = s.metrics || {};
        return {
          id:           s.external_id,
          name:         s.name,
          city:         s.city   || "",
          agent:        s.agent  || "",
          metric_12v12: m.metric_12v12 ?? 0,
        };
      }),
    [dbStores],
  );

  // Unique cities and agents for filter dropdowns
  const cities = useMemo(
    () => Array.from(new Set(allStores.map((s) => s.city).filter(Boolean))).sort((a, b) => a.localeCompare(b, "he")),
    [allStores],
  );
  const agents = useMemo(
    () => Array.from(new Set(allStores.map((s) => s.agent).filter(Boolean))).sort((a, b) => a.localeCompare(b, "he")),
    [allStores],
  );

  const availableStores = useMemo(() => {
    const existingSet  = new Set(existingStoreIds);
    let filtered = allStores.filter((s) => !existingSet.has(s.id));

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q)  ||
          s.agent.toLowerCase().includes(q),
      );
    }
    if (filterCity)  filtered = filtered.filter((s) => s.city  === filterCity);
    if (filterAgent) filtered = filtered.filter((s) => s.agent === filterAgent);

    return filtered;
  }, [allStores, existingStoreIds, search, filterCity, filterAgent]);

  const selectedStore = selectedStoreId
    ? allStores.find((s) => s.id === selectedStoreId)
    : null;

  const activeFilters = [filterCity, filterAgent].filter(Boolean).length;

  const handleSubmit = () => {
    if (selectedStoreId) {
      onAdd(selectedStoreId, reason, notes);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[88vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-lg">הוסף חנות לטיפול</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {!selectedStore ? (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="חפש לפי שם חנות, עיר או סוכן..."
                  className="w-full pr-9 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
                  autoFocus
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filters row */}
              <div className="flex gap-2">
                {/* City filter */}
                <div className="relative flex-1">
                  <select
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                    className={clsx(
                      "w-full appearance-none pl-7 pr-3 py-2 rounded-xl text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-red-400",
                      filterCity
                        ? "bg-red-50 border-red-200 text-red-700 font-medium"
                        : "bg-gray-50 border-gray-200 text-gray-600",
                    )}
                  >
                    <option value="">כל הערים</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>

                {/* Agent filter */}
                <div className="relative flex-1">
                  <select
                    value={filterAgent}
                    onChange={(e) => setFilterAgent(e.target.value)}
                    className={clsx(
                      "w-full appearance-none pl-7 pr-3 py-2 rounded-xl text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-red-400",
                      filterAgent
                        ? "bg-red-50 border-red-200 text-red-700 font-medium"
                        : "bg-gray-50 border-gray-200 text-gray-600",
                    )}
                  >
                    <option value="">כל הסוכנים</option>
                    {agents.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>

                {/* Clear filters */}
                {activeFilters > 0 && (
                  <button
                    onClick={() => { setFilterCity(""); setFilterAgent(""); }}
                    className="px-3 py-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors whitespace-nowrap"
                  >
                    נקה ({activeFilters})
                  </button>
                )}
              </div>

              {/* Results count */}
              <p className="text-xs text-gray-400 px-1">
                {availableStores.length === 0
                  ? (search || activeFilters > 0 ? "לא נמצאו חנויות" : "כל החנויות כבר ברשימת הטיפול")
                  : `${availableStores.length} חנויות`}
              </p>

              {/* Store list */}
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {availableStores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => setSelectedStoreId(store.id)}
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl flex items-center justify-between hover:bg-red-50 hover:border-red-100 border border-transparent transition-colors text-right"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{store.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {[store.city, store.agent].filter(Boolean).join(" | ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 mr-2 flex-shrink-0">
                      <div className="text-left">
                        <p className={clsx("font-bold text-xs", getMetricColor(store.metric_12v12))}>
                          {formatPercent(store.metric_12v12)}
                        </p>
                        <p className="text-xs text-gray-400">12v12</p>
                      </div>
                      <Plus className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Selected Store */}
              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-red-900">{selectedStore.name}</p>
                    <p className="text-sm text-red-700">
                      {[selectedStore.city, selectedStore.agent].filter(Boolean).join(" | ")}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedStoreId(null)}
                    className="text-sm text-red-500 hover:text-red-700 underline"
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
                  {Object.entries(TREATMENT_REASON_CONFIG).map(([key, config]) => (
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
                  ))}
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
                  className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors text-sm"
          >
            ביטול
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedStoreId}
            className={clsx(
              "px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm",
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
