"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useFaults } from "@/context/FaultsContext";
import { useUsers } from "@/context/UsersContext";
import { FaultPhotosInput } from "./FaultPhotosInput";

interface CreateFaultModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateFaultModal({ isOpen, onClose }: CreateFaultModalProps) {
  const { faultTypes, createFault } = useFaults();
  const { allUsers } = useUsers();

  const [typeId, setTypeId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [notifySms, setNotifySms] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeTypes = faultTypes
    .filter((t) => t.is_active)
    .sort((a, b) => a.order - b.order);

  useEffect(() => {
    if (!isOpen) return;
    const firstType = faultTypes
      .filter((t) => t.is_active)
      .sort((a, b) => a.order - b.order)[0];
    setTypeId(firstType?.id ?? "");
    setTitle("");
    setDescription("");
    setPhotos([]);
    setNotifyEmail(false);
    setNotifySms(false);
    setAssignedTo(firstType?.default_assignee_id || allUsers[0]?.id || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when modal opens
  }, [isOpen]);

  useEffect(() => {
    if (!typeId) return;
    const ft = faultTypes.find((t) => t.id === typeId && t.is_active);
    if (ft?.default_assignee_id) setAssignedTo(ft.default_assignee_id);
  }, [typeId, faultTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeId.trim() || !title.trim()) return;
    const assignee = allUsers.find((u) => u.id === assignedTo);
    if (!assignee) return;

    setSaving(true);
    const fault = await createFault({
      typeId,
      title: title.trim(),
      description: description.trim(),
      assignedTo: assignee.id,
      assignedToName: assignee.name,
      photos,
      notifyEmail,
      notifySms,
    });
    setSaving(false);
    if (fault) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-gray-900">דיווח תקלה</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {activeTypes.length === 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              אין סוגי תקלות.{" "}
              <Link
                href="/dashboard/settings/fault-types"
                className="underline font-medium"
              >
                הוסף בהגדרות
              </Link>
              .
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              סוג התקלה *
            </label>
            <select
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">בחר סוג</option>
              {activeTypes.map((ft) => (
                <option key={ft.id} value={ft.id}>
                  {ft.icon} {ft.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              כותרת *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="תאר את התקלה בקצרה"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              תיאור
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="פרטים נוספים..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              מוקצה אל *
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">בחר אחראי</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.avatar} {u.name}
                </option>
              ))}
            </select>
          </div>
          <FaultPhotosInput
            photos={photos}
            maxPhotos={2}
            onPhotosChange={setPhotos}
          />

          {/* Notification Toggles */}
          {assignedTo && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-2">
              <p className="text-xs font-medium text-gray-500">שלח התראה למוקצה</p>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm">✉️</span>
                  <span className="text-sm text-gray-700">מייל</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifySms}
                    onChange={(e) => setNotifySms(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm">📱</span>
                  <span className="text-sm text-gray-700">SMS</span>
                </label>
              </div>
            </div>
          )}

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
              disabled={!typeId || !title.trim() || !assignedTo || saving}
              className="flex-1 py-2.5 px-4 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "שומר..." : "דווח תקלה"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
