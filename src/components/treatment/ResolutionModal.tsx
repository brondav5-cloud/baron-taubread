"use client";

import { useState } from "react";
import { X, CheckCircle } from "lucide-react";

interface ResolutionModalProps {
  storeName: string;
  onConfirm: (resolutionNotes: string) => void;
  onCancel: () => void;
}

export function ResolutionModal({
  storeName,
  onConfirm,
  onCancel,
}: ResolutionModalProps) {
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (notes.trim()) {
      onConfirm(notes.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between bg-green-50">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-bold text-lg text-green-800">סיום טיפול</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-green-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-green-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <p className="text-gray-600 mb-2">
              סיום טיפול עבור:{" "}
              <span className="font-bold text-gray-900">{storeName}</span>
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              מה בוצע? תאר את הטיפול שנעשה:
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="לדוגמה: נפגשתי עם בעל החנות, סיכמנו על הזמנה שבועית קבועה..."
              className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
              rows={4}
              autoFocus
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={!notes.trim()}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              אשר סיום טיפול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
