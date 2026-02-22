"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import {
  type TreatmentReason,
  TREATMENT_REASON_CONFIG,
} from "@/context/TreatmentContext";

interface QuickAddToTreatmentModalProps {
  storeId: number;
  storeName: string;
  onAdd: (storeId: number, reason: TreatmentReason, notes: string) => void;
  onClose: () => void;
}

export function QuickAddToTreatmentModal({
  storeId,
  storeName,
  onAdd,
  onClose,
}: QuickAddToTreatmentModalProps) {
  const [reason, setReason] = useState<TreatmentReason>("manual");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    onAdd(storeId, reason, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-lg">הוסף לטיפול: {storeName}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              סיבת הטיפול
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as TreatmentReason)}
              className="w-full px-3 py-2 border rounded-xl text-sm"
            >
              {(
                Object.entries(TREATMENT_REASON_CONFIG) as [
                  TreatmentReason,
                  { label: string },
                ][]
              ).map(([val, cfg]) => (
                <option key={val} value={val}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              הערות
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערות (אופציונלי)"
              className="w-full px-3 py-2 border rounded-xl text-sm min-h-[80px]"
              rows={3}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600"
          >
            הוסף לטיפול
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-xl text-gray-600 hover:bg-gray-50"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
