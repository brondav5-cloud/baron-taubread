"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useUsers } from "@/context/UsersContext";
import type { TaskCategory } from "@/types/task";
import { IconPicker } from "./IconPicker";

interface CategoryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: TaskCategory | null; // null = הוספה חדשה
}

const COLOR_OPTIONS = [
  { value: "blue", label: "כחול", bg: "bg-blue-100", text: "text-blue-700" },
  { value: "green", label: "ירוק", bg: "bg-green-100", text: "text-green-700" },
  {
    value: "yellow",
    label: "צהוב",
    bg: "bg-yellow-100",
    text: "text-yellow-700",
  },
  { value: "red", label: "אדום", bg: "bg-red-100", text: "text-red-700" },
  {
    value: "purple",
    label: "סגול",
    bg: "bg-purple-100",
    text: "text-purple-700",
  },
  {
    value: "orange",
    label: "כתום",
    bg: "bg-orange-100",
    text: "text-orange-700",
  },
  { value: "gray", label: "אפור", bg: "bg-gray-100", text: "text-gray-700" },
  { value: "pink", label: "ורוד", bg: "bg-pink-100", text: "text-pink-700" },
];

export function CategoryEditModal({
  isOpen,
  onClose,
  category,
}: CategoryEditModalProps) {
  const { allUsers, addCategory, updateCategory } = useUsers();

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📋");
  const [color, setColor] = useState("blue");
  const [defaultAssigneeId, setDefaultAssigneeId] = useState("");
  const [isActive, setIsActive] = useState(true);

  const isEditMode = !!category;

  // טעינת נתונים בעריכה
  useEffect(() => {
    if (category) {
      setName(category.name);
      setIcon(category.icon);
      setColor(category.color);
      setDefaultAssigneeId(category.defaultAssigneeId || "");
      setIsActive(category.isActive);
    } else {
      // איפוס לערכי ברירת מחדל
      setName("");
      setIcon("📋");
      setColor("blue");
      setDefaultAssigneeId("");
      setIsActive(true);
    }
  }, [category, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const assignee = allUsers.find((u) => u.id === defaultAssigneeId);

    const categoryData = {
      name: name.trim(),
      icon,
      color,
      defaultAssigneeId: defaultAssigneeId || undefined,
      defaultAssigneeName: assignee?.name,
      isActive,
    };

    if (isEditMode && category) {
      updateCategory(category.id, categoryData);
    } else {
      addCategory(categoryData);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {isEditMode ? "עריכת קטגוריה" : "קטגוריה חדשה"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Icon & Name Row */}
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                אייקון
              </label>
              <IconPicker value={icon} onChange={setIcon} />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                שם הקטגוריה *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="לדוגמה: מלאי, תמחור..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                autoFocus
              />
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 mb-2">תצוגה מקדימה:</p>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${COLOR_OPTIONS.find((c) => c.value === color)?.bg} ${COLOR_OPTIONS.find((c) => c.value === color)?.text}`}
            >
              <span>{icon}</span>
              <span>{name || "שם הקטגוריה"}</span>
            </span>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              צבע
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setColor(opt.value)}
                  className={`w-8 h-8 rounded-full ${opt.bg} border-2 transition-all ${
                    color === opt.value
                      ? "border-gray-800 scale-110"
                      : "border-transparent"
                  }`}
                  title={opt.label}
                />
              ))}
            </div>
          </div>

          {/* Default Assignee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              אחראי ברירת מחדל
            </label>
            <select
              value={defaultAssigneeId}
              onChange={(e) => setDefaultAssigneeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">ללא</option>
              {allUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.avatar} {user.name} ({user.department})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              המשתמש שייבחר אוטומטית כשיוצרים משימה בקטגוריה זו
            </p>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900">קטגוריה פעילה</p>
              <p className="text-xs text-gray-500">
                קטגוריה לא פעילה לא תופיע ביצירת משימה
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isActive ? "bg-primary-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  isActive ? "right-1" : "right-7"
                }`}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-100"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 py-2.5 px-4 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEditMode ? "שמור שינויים" : "הוסף קטגוריה"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
