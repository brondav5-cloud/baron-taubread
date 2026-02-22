"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Filter,
  RotateCcw,
  Info,
  Save,
  CheckCircle,
} from "lucide-react";

import { useCosts, COST_LABELS } from "@/hooks/useCosts";
import { COST_KEYS } from "@/types/costs";
import { CostsTableRow } from "./CostsTableRow";

// ============================================
// COSTS TABLE COMPONENT
// ============================================

export function CostsTable() {
  const {
    costs,
    categories,
    stats,
    filters,
    handleFilterChange,
    clearFilters,
    updateCost,
    resetAll,
    dragFill,
    startDragFill,
    updateDragFill,
    endDragFill,
    cancelDragFill,
  } = useCosts();

  const [hasChanges, setHasChanges] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  // Track changes
  useEffect(() => {
    setHasChanges(true);
    setShowSaved(false);
  }, [costs]);

  // Handle save
  const handleSave = () => {
    // Data is already saved to localStorage by useCosts hook
    // This just shows confirmation
    setHasChanges(false);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };

  // Handle mouse up globally for drag fill
  useEffect(() => {
    const handleMouseUp = () => {
      if (dragFill.isActive) {
        endDragFill();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dragFill.isActive) {
        cancelDragFill();
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dragFill.isActive, endDragFill, cancelDragFill]);

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-4 p-4 bg-white rounded-xl border border-gray-200">
        <div className="flex items-center gap-3">
          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!hasChanges || stats.productsWithCosts === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              hasChanges && stats.productsWithCosts > 0
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Save className="w-4 h-4" />
            <span>שמור שינויים</span>
          </button>

          {/* Saved indicator */}
          {showSaved && (
            <span className="flex items-center gap-1.5 text-green-600 text-sm">
              <CheckCircle className="w-4 h-4" />
              נשמר בהצלחה
            </span>
          )}
        </div>

        {/* Reset All */}
        {stats.hasCosts && (
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>אפס הכל</span>
          </button>
        )}
      </div>

      {/* Stats & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">
            <span className="font-semibold text-gray-900">
              {stats.totalProducts}
            </span>{" "}
            מוצרים
          </span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-600">
            <span className="font-semibold text-green-600">
              {stats.productsWithCosts}
            </span>{" "}
            עם עלויות
          </span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              placeholder="חיפוש מוצר..."
              className="w-48 pr-10 pl-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange("category", e.target.value)}
              className="w-40 pr-10 pl-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="">כל הקטגוריות</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {(filters.search || filters.category) && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              נקה
            </button>
          )}
        </div>
      </div>

      {/* Drag Fill Hint */}
      {!dragFill.isActive && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>
            טיפ: לחץ על תא עם ערך וגרור למטה כדי להעתיק את הערך לשורות נוספות
          </span>
        </div>
      )}

      {/* Drag Fill Active */}
      {dragFill.isActive && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 text-sm rounded-lg">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>
            גורר ערך {dragFill.value} ל-{dragFill.selectedRows.length} שורות |
            שחרר לאישור | ESC לביטול
          </span>
        </div>
      )}

      {/* Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-right font-semibold text-gray-700 w-20">
                  מזהה
                </th>
                <th className="px-3 py-3 text-right font-semibold text-gray-700 w-32">
                  קטגוריה
                </th>
                <th className="px-3 py-3 text-right font-semibold text-gray-700 min-w-[180px]">
                  שם מוצר
                </th>
                {COST_KEYS.map((key) => (
                  <th
                    key={key}
                    className="px-2 py-3 text-center font-semibold text-gray-700 w-20 border-l border-gray-100"
                  >
                    {COST_LABELS[key]}
                  </th>
                ))}
                <th className="px-3 py-3 text-center font-semibold text-gray-700 w-24 bg-gray-100">
                  סה״כ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {costs.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    {filters.search || filters.category
                      ? "לא נמצאו מוצרים התואמים לחיפוש"
                      : "אין מוצרים להצגה"}
                  </td>
                </tr>
              ) : (
                costs.map((row, index) => (
                  <CostsTableRow
                    key={row.productId}
                    row={row}
                    rowIndex={index}
                    isSelected={dragFill.selectedRows.includes(index)}
                    onCostChange={updateCost}
                    onDragStart={startDragFill}
                    onDragEnter={updateDragFill}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info about delivery costs */}
      <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 text-amber-700 text-sm rounded-lg border border-amber-200">
        <Info className="w-4 h-4 flex-shrink-0" />
        <span>
          עלות הובלה מוגדרת בנפרד לכל נהג/קבוצת נהגים בדף &quot;ניהול
          נהגים&quot;
        </span>
      </div>

      {/* Summary */}
      {costs.length > 0 && (
        <div className="text-sm text-gray-500 text-left">
          מציג {costs.length} מוצרים
        </div>
      )}
    </div>
  );
}
