"use client";

import { useState, useEffect } from "react";
import type { TaskRow, EditorUser } from "./types";
import type { MeetingTaskPriority } from "@/types/meeting";
import { MEETING_PRIORITY_CONFIG } from "@/types/meeting";
import { defaultDue } from "./blockSerializer";

export interface TaskSheetData {
  content: string;
  assigneeId: string;
  assigneeName: string;
  dueDate: string;
  priority: MeetingTaskPriority;
}

interface TaskSheetProps {
  open: boolean;
  task?: Partial<TaskRow>;
  users: EditorUser[];
  onConfirm: (data: TaskSheetData) => void;
  onClose: () => void;
}

export default function TaskSheet({
  open,
  task,
  users,
  onConfirm,
  onClose,
}: TaskSheetProps) {
  const [content, setContent] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState(defaultDue());
  const [priority, setPriority] = useState<MeetingTaskPriority>("normal");

  useEffect(() => {
    if (open) {
      setContent(task?.content ?? "");
      setAssigneeId(task?.assigneeId ?? "");
      setDueDate(task?.dueDate ?? defaultDue());
      setPriority(task?.priority ?? "normal");
    }
  }, [open, task]);

  const isEdit = Boolean(task?.assigneeId);
  const canConfirm = assigneeId && content.trim();

  const handleConfirm = () => {
    if (!canConfirm) return;
    const user = users.find((u) => u.id === assigneeId);
    if (!user) return;
    onConfirm({
      content: content.trim(),
      assigneeId,
      assigneeName: user.name,
      dueDate,
      priority,
    });
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 shadow-2xl max-h-[92dvh] overflow-y-auto"
        dir="rtl"
      >
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 flex-shrink-0" />
        <div className="px-5 pt-4 pb-safe pb-8">
          <h3 className="text-base font-bold text-gray-900 mb-5">
            📌 {isEdit ? "עריכת משימה" : "משימה חדשה"}
          </h3>

          {/* Assignee */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              למי?
            </p>
            <div className="flex flex-wrap gap-2">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setAssigneeId(u.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                    assigneeId === u.id
                      ? "bg-orange-100 border-orange-400 text-orange-800 shadow-sm"
                      : "bg-white border-gray-200 text-gray-700 hover:border-orange-300"
                  }`}
                >
                  <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {u.name.charAt(0)}
                  </span>
                  {u.name}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              מה המשימה?
            </p>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="תיאור המשימה..."
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
            />
          </div>

          {/* Due date */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              תאריך יעד
            </p>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          {/* Priority */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              עדיפות
            </p>
            <div className="flex gap-2">
              {(
                Object.entries(
                  MEETING_PRIORITY_CONFIG,
                ) as [
                  MeetingTaskPriority,
                  (typeof MEETING_PRIORITY_CONFIG)[MeetingTaskPriority],
                ][]
              ).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setPriority(k)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    priority === k
                      ? "border-gray-400 bg-gray-100 shadow-sm"
                      : "border-gray-200 text-gray-500 bg-white"
                  }`}
                >
                  {v.icon} {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50"
            >
              ביטול
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex-1 py-3 rounded-xl bg-orange-500 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors"
            >
              {isEdit ? "עדכן" : "+ הוסף"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
