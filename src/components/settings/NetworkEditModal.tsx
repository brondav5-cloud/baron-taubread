"use client";

import { useState, useEffect } from "react";
import { X, Building2, Save } from "lucide-react";
import { NetworkStoresPicker } from "./NetworkStoresPicker";
import type { NetworkWithInfo } from "@/types/network";

interface NetworkEditModalProps {
  network: NetworkWithInfo | null;
  onSave: (name: string, storeIds: number[]) => void;
  onClose: () => void;
}

export function NetworkEditModal({
  network,
  onSave,
  onClose,
}: NetworkEditModalProps) {
  const [name, setName] = useState("");
  const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([]);
  const [error, setError] = useState("");

  const isCreateMode = network === null;

  useEffect(() => {
    if (network) {
      setName(network.name);
      setSelectedStoreIds(network.storeIds);
    } else {
      setName("");
      setSelectedStoreIds([]);
    }
  }, [network]);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("יש להזין שם רשת");
      return;
    }
    onSave(trimmedName, selectedStoreIds);
  };

  const handleToggleStore = (storeId: number) => {
    setSelectedStoreIds((prev) =>
      prev.includes(storeId)
        ? prev.filter((id) => id !== storeId)
        : [...prev, storeId],
    );
  };

  const handleSetStoreIds = (ids: number[]) => {
    setSelectedStoreIds(ids);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary-500" />
            {isCreateMode ? "רשת חדשה" : `עריכת רשת: ${network?.name}`}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Network Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              שם הרשת
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="לדוגמה: שופרסל"
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>

          {/* Store Picker */}
          <NetworkStoresPicker
            selectedStoreIds={selectedStoreIds}
            onToggleStore={handleToggleStore}
            onSetStoreIds={handleSetStoreIds}
            excludeNetworkId={network?.id}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50">
          <div className="text-sm text-gray-500">
            {selectedStoreIds.length} חנויות נבחרו
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50"
            >
              ביטול
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600"
            >
              <Save className="w-4 h-4" />
              {isCreateMode ? "צור רשת" : "שמור"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
