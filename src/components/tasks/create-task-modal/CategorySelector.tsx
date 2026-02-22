"use client";

import { Plus } from "lucide-react";
import { clsx } from "clsx";
import type { TaskCategory } from "@/types/task";

interface CategorySelectorProps {
  categories: TaskCategory[];
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  onAddCategory: () => void;
}

export function CategorySelector({
  categories,
  selectedCategoryId,
  onCategoryChange,
  onAddCategory,
}: CategorySelectorProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium text-gray-700">
          קטגוריה *
        </label>
        <button
          type="button"
          onClick={onAddCategory}
          className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
        >
          <Plus className="w-3 h-3" />
          הוסף קטגוריה
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onCategoryChange(category.id)}
            className={clsx(
              "flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all",
              selectedCategoryId === category.id
                ? "border-primary-500 bg-primary-50"
                : "border-gray-200 hover:border-gray-300",
            )}
          >
            <span className="text-xl">{category.icon}</span>
            <span className="text-xs font-medium text-gray-700 text-center">
              {category.name}
            </span>
          </button>
        ))}
      </div>
      {categories.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          אין קטגוריות פעילות.
          <button
            type="button"
            onClick={onAddCategory}
            className="text-primary-600 hover:underline mr-1"
          >
            הוסף קטגוריה
          </button>
        </p>
      )}
    </div>
  );
}
