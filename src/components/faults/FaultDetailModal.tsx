"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import Image from "next/image";
import { useFaults } from "@/context/FaultsContext";
import { useUsers } from "@/context/UsersContext";

interface FaultDetailModalProps {
  faultId: string | null;
  onClose: () => void;
}

const COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  yellow: "bg-yellow-100 text-yellow-700",
  red: "bg-red-100 text-red-700",
  orange: "bg-orange-100 text-orange-700",
  gray: "bg-gray-100 text-gray-700",
  purple: "bg-purple-100 text-purple-700",
  pink: "bg-pink-100 text-pink-700",
};

export function FaultDetailModal({ faultId, onClose }: FaultDetailModalProps) {
  const { faults, faultStatuses, updateFaultStatus, markFaultViewed, addComment, canComment } =
    useFaults();
  const { currentUser } = useUsers();
  const [commentText, setCommentText] = useState("");
  const [saving, setSaving] = useState(false);

  // Always get the LIVE fault from context — realtime updates are reflected automatically
  const fault = faults.find((f) => f.id === faultId) ?? null;

  // Track which fault ID we already marked as viewed so we only fire once per open
  const viewedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!faultId || viewedRef.current === faultId) return;
    viewedRef.current = faultId;
    markFaultViewed(faultId);
  }, [faultId, markFaultViewed]);

  // Reset comment input when the modal opens for a different fault
  useEffect(() => {
    setCommentText("");
  }, [faultId]);

  if (!faultId || !fault) return null;

  const activeStatuses = faultStatuses
    .filter((s) => s.is_active)
    .sort((a, b) => a.order - b.order);
  const canWriteComment = canComment(fault);

  const handleStatusChange = async (statusId: string) => {
    setSaving(true);
    const ok = await updateFaultStatus(fault.id, statusId);
    setSaving(false);
    if (ok) {
      const status = faultStatuses.find((s) => s.id === statusId);
      if (status?.is_final) {
        onClose();
      }
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setSaving(true);
    await addComment(fault.id, commentText.trim());
    setCommentText("");
    setSaving(false);
  };

  const assigneeDisplay =
    fault.assignedToNames.length > 0
      ? fault.assignedToNames.join(", ")
      : fault.assignedToName || "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{fault.typeIcon || "⚠️"}</span>
            <h2 className="text-lg font-bold text-gray-900">{fault.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-sm font-medium ${COLOR_MAP[fault.statusColor ?? "gray"] ?? "bg-gray-100 text-gray-700"}`}
            >
              {fault.statusName}
            </span>
            <span className="px-2.5 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
              {fault.typeIcon} {fault.typeName}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">דווח על ידי:</span>
              <p className="font-medium">{fault.reportedByName}</p>
            </div>
            <div>
              <span className="text-gray-500">
                {fault.assignedToNames.length > 1 ? "מוקצה אל:" : "מוקצה אל:"}
              </span>
              <p className="font-medium">{assigneeDisplay}</p>
            </div>
          </div>

          {fault.description && (
            <div>
              <span className="text-gray-500 text-sm">תיאור:</span>
              <p className="mt-1">{fault.description}</p>
            </div>
          )}

          {fault.photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {fault.photos.map((url, i) => (
                <div
                  key={i}
                  className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100"
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                    sizes="96px"
                  />
                </div>
              ))}
            </div>
          )}

          {canWriteComment && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                עדכון סטטוס
              </label>
              <div className="flex flex-wrap gap-2">
                {activeStatuses.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleStatusChange(s.id)}
                    disabled={saving || fault.statusId === s.id}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${fault.statusId === s.id ? "ring-2 ring-primary-500" : "hover:bg-gray-100"} ${COLOR_MAP[s.color] ?? "bg-gray-100 text-gray-700"}`}
                  >
                    {s.name}
                    {s.is_final && (
                      <span className="mr-1 text-xs opacity-60">✓</span>
                    )}
                  </button>
                ))}
              </div>
              {activeStatuses.some((s) => s.is_final && fault.statusId !== s.id) && (
                <p className="text-xs text-gray-400 mt-1">
                  סטטוס עם ✓ יסגור את החלון אוטומטית
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              הערות
            </label>
            {fault.comments.length === 0 ? (
              <p className="text-gray-500 text-sm">אין הערות</p>
            ) : (
              <div className="space-y-2">
                {fault.comments.map((c) => (
                  <div key={c.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">
                      {c.userName}
                      {c.userId === currentUser.id && (
                        <span className="text-xs text-gray-400 mr-1">(אתה)</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-700 mt-0.5">{c.text}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(c.createdAt).toLocaleString("he-IL")}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {canWriteComment && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="הוסף הערה..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || saving}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
                >
                  שליחה
                </button>
              </div>
            )}
          </div>

          {fault.history.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                היסטוריה
              </label>
              <div className="space-y-1 text-sm text-gray-600">
                {fault.history
                  .slice()
                  .reverse()
                  .map((h) => (
                    <p key={h.id}>
                      {h.userName}: {h.details || h.action} –{" "}
                      {new Date(h.timestamp).toLocaleString("he-IL")}
                    </p>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
