"use client";

import { useState, useEffect } from "react";
import type { TaskRow, EditorUser } from "./types";
import type { MeetingTaskPriority } from "@/types/meeting";
import { MEETING_PRIORITY_CONFIG } from "@/types/meeting";
import { defaultDue } from "./blockSerializer";

export interface TaskSheetData {
  content: string;
  assigneeIds: string[];
  assigneeNames: string[];
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
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState(defaultDue());
  const [priority, setPriority] = useState<MeetingTaskPriority>("normal");

  useEffect(() => {
    if (open) {
      setContent(task?.content ?? "");
      setAssigneeIds(task?.assigneeIds ?? []);
      setDueDate(task?.dueDate ?? defaultDue());
      setPriority(task?.priority ?? "normal");
    }
  }, [open, task]);

  const isEdit = Boolean(task?.assigneeIds?.length);
  const canConfirm = assigneeIds.length > 0 && content.trim();

  const toggleAssignee = (id: string) => {
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    const selectedUsers = users.filter((u) => assigneeIds.includes(u.id));
    onConfirm({
      content: content.trim(),
      assigneeIds,
      assigneeNames: selectedUsers.map((u) => u.name),
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
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 shadow-2xl max-h-[72dvh] overflow-y-auto"
        dir="rtl"
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-2.5 flex-shrink-0" />
        <div className="px-4 pt-3 pb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-3">
            📌 {isEdit ? "עריכת משימה" : "משימה חדשה"}
          </h3>

          {/* Assignees — multi-select chips */}
          <div className="mb-3">
            <p className="text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
              למי? <span className="normal-case font-normal text-gray-300">(ניתן לבחור מספר אנשים)</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {users.map((u) => {
                const selected = assigneeIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleAssignee(u.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                      selected
                        ? "bg-orange-100 border-orange-400 text-orange-800 shadow-sm"
                        : "bg-white border-gray-200 text-gray-700"
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {u.name.charAt(0)}
                    </span>
                    {u.name}
                    {selected && <span className="text-orange-500 text-[10px]">✓</span>}
                  </button>
                );
              })}
            </div>
            {assigneeIds.length > 1 && (
              <p className="text-[10px] text-orange-600 mt-1">
                {assigneeIds.length} נבחרו — תיווצר משימה לכל אחד
              </p>
            )}
          </div>

          {/* Content */}
          <div className="mb-3">
            <p className="text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
              מה המשימה?
            </p>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="תיאור המשימה..."
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
            />
          </div>

          {/* Date + Priority in one row */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <p className="text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                תאריך יעד
              </p>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div className="flex-shrink-0">
              <p className="text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                עדיפות
              </p>
              <div className="flex gap-1">
                {(
                  Object.entries(MEETING_PRIORITY_CONFIG) as [
                    MeetingTaskPriority,
                    (typeof MEETING_PRIORITY_CONFIG)[MeetingTaskPriority],
                  ][]
                ).map(([k, v]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setPriority(k)}
                    title={v.label}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border transition-all ${
                      priority === k
                        ? "border-gray-400 bg-gray-100 shadow-sm"
                        : "border-gray-200 bg-white text-gray-400"
                    }`}
                  >
                    {v.icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50"
            >
              ביטול
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors"
            >
              {isEdit ? "עדכן" : "+ הוסף"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
