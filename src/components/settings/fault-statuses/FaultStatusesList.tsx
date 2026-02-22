"use client";

import { useState } from "react";
import { Edit2, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { clsx } from "clsx";
import { useFaults } from "@/context/FaultsContext";
import type { DbFaultStatus } from "@/lib/supabase/faults.queries";
import { FaultStatusEditModal } from "./FaultStatusEditModal";

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

export function FaultStatusesList() {
  const { faultStatuses, updateFaultStatusSetting, deleteFaultStatus } =
    useFaults();
  const [editingStatus, setEditingStatus] = useState<DbFaultStatus | null>(
    null,
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const sortedStatuses = [...faultStatuses].sort((a, b) => a.order - b.order);

  const handleToggleActive = (fs: DbFaultStatus) => {
    updateFaultStatusSetting(fs.id, { is_active: !fs.is_active });
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteFaultStatus(id);
    if (ok) setDeleteConfirm(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {faultStatuses.length} סטטוסים |{" "}
          {faultStatuses.filter((s) => s.is_active).length} פעילים
        </p>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          סטטוס חדש
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {sortedStatuses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>אין סטטוסי תקלות</p>
            <p className="text-xs mt-1">
              סטטוסי ברירת מחדל יווצרו אוטומטית בעת הדיווח הראשון
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sortedStatuses.map((fs) => (
              <div
                key={fs.id}
                className={clsx(
                  "flex items-center gap-4 p-4 transition-colors",
                  !fs.is_active && "bg-gray-50 opacity-60",
                )}
              >
                <div className="flex-1 flex items-center gap-3">
                  <span
                    className={clsx(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium",
                      getColorStyle(fs.color).bg,
                      getColorStyle(fs.color).text,
                    )}
                  >
                    {fs.name}
                  </span>
                  {fs.is_final && (
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                      סופי
                    </span>
                  )}
                </div>

                <span
                  className={clsx(
                    "hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium",
                    getColorStyle(fs.color).bg,
                    getColorStyle(fs.color).text,
                  )}
                >
                  {fs.name}
                </span>

                <button
                  onClick={() => handleToggleActive(fs)}
                  className={clsx(
                    "p-2 rounded-lg transition-colors",
                    fs.is_active
                      ? "text-green-600 hover:bg-green-50"
                      : "text-gray-400 hover:bg-gray-100",
                  )}
                  title={
                    fs.is_active ? "פעיל - לחץ להשבית" : "מושבת - לחץ להפעיל"
                  }
                >
                  {fs.is_active ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>

                <button
                  onClick={() => setEditingStatus(fs)}
                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  title="עריכה"
                >
                  <Edit2 className="w-5 h-5" />
                </button>

                {deleteConfirm === fs.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(fs.id)}
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
                    onClick={() => setDeleteConfirm(fs.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="מחיקה"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <FaultStatusEditModal
        isOpen={!!editingStatus}
        onClose={() => setEditingStatus(null)}
        faultStatus={editingStatus}
      />
      <FaultStatusEditModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        faultStatus={null}
      />
    </div>
  );
}
