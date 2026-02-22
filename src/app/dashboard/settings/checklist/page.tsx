"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Plus,
  Trash2,
  GripVertical,
  Check,
  X,
  RotateCcw,
  Eye,
  EyeOff,
} from "lucide-react";
import { clsx } from "clsx";

import { useChecklistSettings } from "@/hooks/useVisitSettings";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  PageHeader,
} from "@/components/ui";

export default function ChecklistSettingsPage() {
  const {
    checklist,
    isLoaded,
    addItem,
    updateItem,
    removeItem,
    toggleEnabled,
    reorderItems,
    resetToDefaults,
  } = useChecklistSettings();

  const [newItemLabel, setNewItemLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleAddItem = () => {
    if (newItemLabel.trim()) {
      addItem(newItemLabel.trim());
      setNewItemLabel("");
    }
  };

  const handleStartEdit = (id: string, label: string) => {
    setEditingId(id);
    setEditingLabel(label);
  };

  const handleSaveEdit = () => {
    if (editingId && editingLabel.trim()) {
      updateItem(editingId, { label: editingLabel.trim() });
    }
    setEditingId(null);
    setEditingLabel("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingLabel("");
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      reorderItems(draggedIndex, index);
      setDraggedIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const enabledCount = checklist.filter((item) => item.enabled).length;

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-2 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span className="text-sm">חזרה להגדרות</span>
        </Link>
        <PageHeader
          title="הגדרות צ'קליסט ביקור"
          subtitle={`${enabledCount} פריטים פעילים מתוך ${checklist.length}`}
          icon={<ClipboardList className="w-6 h-6 text-purple-500" />}
          actions={
            <button
              onClick={resetToDefaults}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl text-sm font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              איפוס לברירת מחדל
            </button>
          }
        />
      </div>

      {/* Add New Item */}
      <Card>
        <CardHeader>
          <CardTitle icon={<Plus className="w-5 h-5 text-green-500" />}>
            הוסף פריט חדש
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <input
              type="text"
              value={newItemLabel}
              onChange={(e) => setNewItemLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
              placeholder="לדוגמה: בדיקת מחירי מתחרים..."
              className="flex-1 px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              onClick={handleAddItem}
              disabled={!newItemLabel.trim()}
              className={clsx(
                "px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2",
                newItemLabel.trim()
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed",
              )}
            >
              <Plus className="w-4 h-4" />
              הוסף
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Checklist Items */}
      <Card>
        <CardHeader>
          <CardTitle>פריטי הצ&apos;קליסט</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            גרור כדי לשנות סדר • לחץ על העין להפעלה/כיבוי • לחץ על הטקסט לעריכה
          </p>

          <div className="space-y-2">
            {checklist
              .sort((a, b) => a.order - b.order)
              .map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={clsx(
                    "p-3 rounded-xl border transition-all",
                    item.enabled
                      ? "bg-white border-gray-200"
                      : "bg-gray-50 border-gray-100 opacity-60",
                    draggedIndex === index &&
                      "ring-2 ring-primary-500 shadow-lg",
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Drag Handle */}
                    <GripVertical className="w-5 h-5 text-gray-400 cursor-move flex-shrink-0" />

                    {/* Toggle Enabled */}
                    <button
                      onClick={() => toggleEnabled(item.id)}
                      className={clsx(
                        "p-1.5 rounded-lg transition-colors",
                        item.enabled
                          ? "bg-green-100 text-green-600 hover:bg-green-200"
                          : "bg-gray-200 text-gray-400 hover:bg-gray-300",
                      )}
                    >
                      {item.enabled ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>

                    {/* Label */}
                    {editingId === item.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingLabel}
                          onChange={(e) => setEditingLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit();
                            if (e.key === "Escape") handleCancelEdit();
                          }}
                          autoFocus
                          className="flex-1 px-3 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartEdit(item.id, item.label)}
                        className="flex-1 text-right text-gray-900 hover:text-primary-600 transition-colors"
                      >
                        {item.label}
                      </button>
                    )}

                    {/* Delete */}
                    {editingId !== item.id && (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {checklist.length === 0 && (
            <div className="text-center py-8">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">אין פריטים בצ&apos;קליסט</p>
              <p className="text-sm text-gray-400">הוסף פריטים חדשים למעלה</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle icon={<Eye className="w-5 h-5 text-blue-500" />}>
            תצוגה מקדימה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            כך יראו הפריטים בטופס הביקור:
          </p>
          <div className="space-y-2 max-w-md">
            {checklist
              .filter((item) => item.enabled)
              .sort((a, b) => a.order - b.order)
              .map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100"
                >
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </label>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
