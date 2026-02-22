"use client";

import { useState } from "react";
import { Edit2, Trash2, GripVertical, Plus, Eye, EyeOff } from "lucide-react";
import { clsx } from "clsx";
import { useUsers } from "@/context/UsersContext";
import type { TaskCategory } from "@/types/task";
import { CategoryEditModal } from "./CategoryEditModal";

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-100", text: "text-blue-700" },
  green: { bg: "bg-green-100", text: "text-green-700" },
  yellow: { bg: "bg-yellow-100", text: "text-yellow-700" },
  red: { bg: "bg-red-100", text: "text-red-700" },
  purple: { bg: "bg-purple-100", text: "text-purple-700" },
  orange: { bg: "bg-orange-100", text: "text-orange-700" },
  gray: { bg: "bg-gray-100", text: "text-gray-700" },
  pink: { bg: "bg-pink-100", text: "text-pink-700" },
};

const DEFAULT_COLOR = { bg: "bg-gray-100", text: "text-gray-700" };

function getColorStyle(color: string) {
  return COLOR_MAP[color] ?? DEFAULT_COLOR;
}

export function CategoryList() {
  const { categories, deleteCategory, updateCategory } = useUsers();
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(
    null,
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  const handleToggleActive = (category: TaskCategory) => {
    updateCategory(category.id, { isActive: !category.isActive });
  };

  const handleDelete = (id: string) => {
    deleteCategory(id);
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {categories.length} קטגוריות |{" "}
            {categories.filter((c) => c.isActive).length} פעילות
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          קטגוריה חדשה
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {sortedCategories.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>אין קטגוריות</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-2 text-primary-600 hover:underline"
            >
              הוסף קטגוריה ראשונה
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sortedCategories.map((category) => {
              return (
                <div
                  key={category.id}
                  className={clsx(
                    "flex items-center gap-4 p-4 transition-colors",
                    !category.isActive && "bg-gray-50 opacity-60",
                  )}
                >
                  {/* Drag Handle */}
                  <div className="cursor-grab text-gray-300 hover:text-gray-500">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  {/* Icon & Name */}
                  <div className="flex-1 flex items-center gap-3">
                    <span
                      className={clsx(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-xl",
                        getColorStyle(category.color).bg,
                      )}
                    >
                      {category.icon}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">
                        {category.name}
                      </p>
                      {category.defaultAssigneeName && (
                        <p className="text-xs text-gray-500">
                          ברירת מחדל: {category.defaultAssigneeName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Badge Preview */}
                  <span
                    className={clsx(
                      "hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium",
                      getColorStyle(category.color).bg,
                      getColorStyle(category.color).text,
                    )}
                  >
                    {category.icon} {category.name}
                  </span>

                  {/* Status */}
                  <button
                    onClick={() => handleToggleActive(category)}
                    className={clsx(
                      "p-2 rounded-lg transition-colors",
                      category.isActive
                        ? "text-green-600 hover:bg-green-50"
                        : "text-gray-400 hover:bg-gray-100",
                    )}
                    title={
                      category.isActive
                        ? "פעיל - לחץ להשבית"
                        : "מושבת - לחץ להפעיל"
                    }
                  >
                    {category.isActive ? (
                      <Eye className="w-5 h-5" />
                    ) : (
                      <EyeOff className="w-5 h-5" />
                    )}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => setEditingCategory(category)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="עריכה"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>

                  {/* Delete */}
                  {deleteConfirm === category.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        מחק
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        בטל
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(category.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="מחיקה"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <CategoryEditModal
        isOpen={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        category={editingCategory}
      />

      {/* Add Modal */}
      <CategoryEditModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        category={null}
      />
    </div>
  );
}
