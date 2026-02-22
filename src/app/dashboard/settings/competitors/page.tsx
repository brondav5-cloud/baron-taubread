"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Users,
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

import { useCompetitorsSettings } from "@/hooks/useVisitSettings";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  PageHeader,
} from "@/components/ui";

export default function CompetitorsSettingsPage() {
  const {
    competitors,
    isLoaded,
    addCompetitor,
    updateCompetitor,
    removeCompetitor,
    toggleEnabled,
    reorderItems,
    resetToDefaults,
  } = useCompetitorsSettings();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleAdd = () => {
    if (newName.trim()) {
      addCompetitor(newName.trim());
      setNewName("");
    }
  };

  const handleStartEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const handleSaveEdit = () => {
    if (editingId && editingName.trim()) {
      updateCompetitor(editingId, { name: editingName.trim() });
    }
    setEditingId(null);
    setEditingName("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
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

  const enabledCount = competitors.filter((item) => item.enabled).length;

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
          title="הגדרות מתחרים"
          subtitle={`${enabledCount} מתחרים פעילים מתוך ${competitors.length}`}
          icon={<Users className="w-6 h-6 text-orange-500" />}
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

      {/* Info */}
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>מה זה?</strong> רשימת המתחרים תופיע בטופס הביקור כדי לתעד אילו
          מתחרים נמצאים בחנות. המידע יישמר בהיסטוריית הביקורים ויוצג בטאב
          המתחרים בדף החנות.
        </p>
      </div>

      {/* Add New Competitor */}
      <Card>
        <CardHeader>
          <CardTitle icon={<Plus className="w-5 h-5 text-green-500" />}>
            הוסף מתחרה חדש
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="שם המתחרה..."
              className="flex-1 px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className={clsx(
                "px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2",
                newName.trim()
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

      {/* Competitors List */}
      <Card>
        <CardHeader>
          <CardTitle>רשימת המתחרים</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            גרור כדי לשנות סדר • לחץ על העין להפעלה/כיבוי • לחץ על השם לעריכה
          </p>

          <div className="space-y-2">
            {competitors
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

                    {/* Name */}
                    {editingId === item.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
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
                        onClick={() => handleStartEdit(item.id, item.name)}
                        className="flex-1 text-right text-gray-900 hover:text-primary-600 transition-colors font-medium"
                      >
                        {item.name}
                      </button>
                    )}

                    {/* Delete */}
                    {editingId !== item.id && (
                      <button
                        onClick={() => removeCompetitor(item.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {competitors.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">אין מתחרים ברשימה</p>
              <p className="text-sm text-gray-400">הוסף מתחרים חדשים למעלה</p>
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
            כך יוצגו המתחרים בטופס הביקור:
          </p>
          <div className="flex flex-wrap gap-2 max-w-md">
            {competitors
              .filter((item) => item.enabled)
              .sort((a, b) => a.order - b.order)
              .map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 border"
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">{item.name}</span>
                </label>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
