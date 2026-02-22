"use client";

import { X, Copy } from "lucide-react";
import { DAYS } from "@/hooks/work-plan";

interface DuplicateItemModalProps {
  itemName: string;
  currentDay: number;
  onConfirm: (targetDay: number) => void;
  onCancel: () => void;
}

export function DuplicateItemModal({
  itemName,
  currentDay,
  onConfirm,
  onCancel,
}: DuplicateItemModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl">
        <div className="p-4 border-b flex items-center justify-between bg-purple-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
              <Copy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-purple-800">שכפל ליום אחר</h3>
              <p className="text-sm text-purple-600 truncate max-w-[200px]">
                {itemName}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-purple-600" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">בחר יום להעתקה:</p>
          <div className="grid grid-cols-3 gap-2">
            {DAYS.map((day, index) => (
              <button
                key={index}
                onClick={() => onConfirm(index)}
                disabled={index === currentDay}
                className={`py-3 px-2 rounded-xl text-sm font-medium transition-all ${
                  index === currentDay
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-purple-50 text-purple-700 hover:bg-purple-100 hover:scale-105"
                }`}
              >
                {day}
                {index === currentDay && (
                  <span className="block text-xs text-gray-400">(נוכחי)</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
