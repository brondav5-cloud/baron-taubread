"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useFaults } from "@/context/FaultsContext";
import { toast } from "@/providers/ToastProvider";
import { useUsers } from "@/context/UsersContext";
import type { DbFaultType } from "@/lib/supabase/faults.queries";
import { IconPicker } from "@/components/settings/task-categories";

interface FaultTypeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  faultType?: DbFaultType | null;
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

export function FaultTypeEditModal({
  isOpen,
  onClose,
  faultType,
}: FaultTypeEditModalProps) {
  const { faultTypes, addFaultType, updateFaultType } = useFaults();
  const { allUsers } = useUsers();

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("⚠️");
  const [color, setColor] = useState("blue");
  const [defaultAssigneeId, setDefaultAssigneeId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const isEditMode = !!faultType;

  useEffect(() => {
    if (faultType) {
      setName(faultType.name);
      setIcon(faultType.icon || "⚠️");
      setColor(faultType.color || "gray");
      setDefaultAssigneeId(faultType.default_assignee_id || "");
      setIsActive(faultType.is_active);
    } else {
      setName("");
      setIcon("⚠️");
      setColor("blue");
      setDefaultAssigneeId("");
      setIsActive(true);
    }
  }, [faultType, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    const assignee = allUsers.find((u) => u.id === defaultAssigneeId);

    if (isEditMode && faultType) {
      const ok = await updateFaultType(faultType.id, {
        name: name.trim(),
        icon,
        color,
        default_assignee_id: defaultAssigneeId || null,
        default_assignee_name: assignee?.name || null,
        is_active: isActive,
      });
      if (ok) onClose();
      else toast.error("שגיאה בשמירת הסוג");
    } else {
      const maxOrder = faultTypes.reduce((m, t) => Math.max(m, t.order), 0);
      const ok = await addFaultType({
        name: name.trim(),
        icon,
        color,
        order: maxOrder + 1,
        default_assignee_id: defaultAssigneeId || null,
        default_assignee_name: assignee?.name || null,
        is_active: isActive,
      });
      if (ok) onClose();
      else toast.error("שגיאה בשמירת הסוג – ייתכן שצריך להתחבר");
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {isEditMode ? "עריכת סוג תקלה" : "סוג תקלה חדש"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                אייקון
              </label>
              <IconPicker value={icon} onChange={setIcon} />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                שם סוג התקלה *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="לדוגמה: תקלה טכנית, ניקיון..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                autoFocus
              />
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 mb-2">תצוגה מקדימה:</p>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${COLOR_OPTIONS.find((c) => c.value === color)?.bg ?? "bg-gray-100"} ${COLOR_OPTIONS.find((c) => c.value === color)?.text ?? "text-gray-700"}`}
            >
              <span>{icon}</span>
              <span>{name || "שם הסוג"}</span>
            </span>
          </div>
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
                  className={`w-8 h-8 rounded-full ${opt.bg} border-2 transition-all ${color === opt.value ? "border-gray-800 scale-110" : "border-transparent"}`}
                  title={opt.label}
                />
              ))}
            </div>
          </div>
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
              ייבחר אוטומטית בעת דיווח תקלה מסוג זה
            </p>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900">סוג פעיל</p>
              <p className="text-xs text-gray-500">
                סוג לא פעיל לא יופיע ביצירת תקלה
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative w-12 h-6 rounded-full transition-colors ${isActive ? "bg-primary-500" : "bg-gray-300"}`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isActive ? "right-1" : "right-7"}`}
              />
            </button>
          </div>
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
              disabled={!name.trim() || saving}
              className="flex-1 py-2.5 px-4 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "שומר..." : isEditMode ? "שמור שינויים" : "הוסף סוג"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
