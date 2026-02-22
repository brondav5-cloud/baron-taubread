"use client";

import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import type { WorkflowChecklistItem } from "@/types/task";

interface StepChecklistProps {
  items: WorkflowChecklistItem[];
  canEdit: boolean;
  onAdd: (text: string) => void;
  onToggle: (itemId: string) => void;
  onRemove: (itemId: string) => void;
}

export function StepChecklist({
  items,
  canEdit,
  onAdd,
  onToggle,
  onRemove,
}: StepChecklistProps) {
  const [newItem, setNewItem] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (newItem.trim()) {
      onAdd(newItem.trim());
      setNewItem("");
      setIsAdding(false);
    }
  };

  const completedCount = items.filter((i) => i.completed).length;
  const progress =
    items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="mt-3 border-t pt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">
          צ׳קליסט ({completedCount}/{items.length})
        </span>
        {items.length > 0 && (
          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Items */}
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <button
              onClick={() => onToggle(item.id)}
              disabled={!canEdit}
              className={clsx(
                "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                item.completed
                  ? "bg-green-500 border-green-500 text-white"
                  : "border-gray-300 hover:border-green-400",
                !canEdit && "cursor-default",
              )}
            >
              {item.completed && <Check className="w-3 h-3" />}
            </button>
            <span
              className={clsx(
                "flex-1 text-sm",
                item.completed && "line-through text-gray-400",
              )}
            >
              {item.text}
            </span>
            {canEdit && (
              <button
                onClick={() => onRemove(item.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Item */}
      {canEdit && (
        <div className="mt-2">
          {isAdding ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="פריט חדש..."
                className="flex-1 px-2 py-1 text-sm border rounded"
                autoFocus
              />
              <button
                onClick={handleAdd}
                disabled={!newItem.trim()}
                className="px-2 py-1 text-xs bg-primary-600 text-white rounded disabled:opacity-50"
              >
                הוסף
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewItem("");
                }}
                className="px-2 py-1 text-xs text-gray-500"
              >
                ביטול
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
            >
              <Plus className="w-3 h-3" />
              הוסף פריט
            </button>
          )}
        </div>
      )}
    </div>
  );
}
