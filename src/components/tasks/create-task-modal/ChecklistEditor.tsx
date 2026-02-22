"use client";

import { Plus, Trash2 } from "lucide-react";

interface ChecklistEditorProps {
  items: string[];
  newItem: string;
  onNewItemChange: (value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
}

export function ChecklistEditor({
  items,
  newItem,
  onNewItemChange,
  onAddItem,
  onRemoveItem,
}: ChecklistEditorProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onAddItem();
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        צ&apos;קליסט (אופציונלי)
      </label>

      {/* Existing Items */}
      {items.length > 0 && (
        <div className="space-y-2 mb-2">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
            >
              <span className="text-gray-400">☐</span>
              <span className="flex-1 text-sm">{item}</span>
              <button
                type="button"
                onClick={() => onRemoveItem(index)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <Trash2 className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Item */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => onNewItemChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="הוסף פריט..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <button
          type="button"
          onClick={onAddItem}
          disabled={!newItem.trim()}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-lg"
        >
          <Plus className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
