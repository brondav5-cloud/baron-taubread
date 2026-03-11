"use client";

import { useState, useEffect, useRef } from "react";
import type { EditorUser } from "./types";
import type { MeetingTaskPriority } from "@/types/meeting";
import { MEETING_PRIORITY_CONFIG } from "@/types/meeting";
import { defaultDue } from "./blockSerializer";
import type { TaskSheetData } from "./TaskSheet";

const MAX_TITLE = 50;

export interface ConvertResult {
  type: "decision" | "task";
  content: string;
  taskData?: Omit<TaskSheetData, "content">;
}

interface ConvertDialogProps {
  open: boolean;
  initialType: "decision" | "task";
  originalText: string;
  users: EditorUser[];
  onConfirm: (result: ConvertResult) => void;
  onClose: () => void;
}

export default function ConvertDialog({
  open,
  initialType,
  originalText,
  users,
  onConfirm,
  onClose,
}: ConvertDialogProps) {
  const [content, setContent] = useState(originalText);
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState(defaultDue());
  const [priority, setPriority] = useState<MeetingTaskPriority>("normal");
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setContent(originalText);
      setAssigneeId("");
      setDueDate(defaultDue());
      setPriority("normal");
    }
  }, [open, originalText]);

  // Auto select-all so first keystroke replaces the pre-filled text
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      titleRef.current?.focus();
      titleRef.current?.select();
    }, 60);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const isTask = initialType === "task";
  const trimmed = content.trim();
  const overLimit = trimmed.length > MAX_TITLE;
  const canConfirm =
    trimmed.length > 0 &&
    !overLimit &&
    (initialType === "decision" || Boolean(assigneeId));

  const handleConfirm = () => {
    if (!canConfirm) return;
    if (!isTask) {
      onConfirm({ type: "decision", content: trimmed });
    } else {
      const user = users.find((u) => u.id === assigneeId);
      if (!user) return;
      onConfirm({
        type: "task",
        content: trimmed,
        taskData: { assigneeId, assigneeName: user.name, dueDate, priority },
      });
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[62dvh] flex flex-col"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-gray-900 text-sm">
            {isTask ? "📌 המר למשימה" : "✅ המר להחלטה"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm transition-colors"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 pt-3 pb-5 space-y-3">
          {/* Original text — WhatsApp-style amber quote */}
          <div className="bg-amber-50 border-r-4 border-amber-400 rounded-xl px-3 py-2.5">
            <p className="text-[10px] font-bold text-amber-600 mb-1 uppercase tracking-wide">
              💬 הערה מקורית
            </p>
            <p className="text-xs text-amber-900 leading-relaxed line-clamp-3">
              {originalText || "—"}
            </p>
          </div>

          {/* Title field — with counter + select-all hint */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                כותרת קצרה
                <span className="text-gray-300 font-normal mr-1 normal-case">
                  — הקלדה תחליף הכל
                </span>
              </p>
              <span
                className={`text-[10px] font-bold tabular-nums ${
                  overLimit
                    ? "text-red-500"
                    : content.length > 40
                      ? "text-amber-500"
                      : "text-gray-400"
                }`}
              >
                {content.length}/{MAX_TITLE}
              </span>
            </div>
            <textarea
              ref={titleRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={2}
              className={`w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none border transition-colors ${
                overLimit
                  ? "border-red-300 focus:ring-red-300 bg-red-50"
                  : isTask
                    ? "border-orange-300 focus:ring-orange-300"
                    : "border-emerald-300 focus:ring-emerald-300"
              }`}
            />
            {overLimit && (
              <p className="text-[10px] text-red-500 mt-1">
                יותר מדי — מקסימום {MAX_TITLE} תווים כדי שה-SMS יעבור
              </p>
            )}
          </div>

          {/* Task-only fields */}
          {isTask && (
            <>
              {/* Assignee */}
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  למי?
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setAssigneeId(u.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                        assigneeId === u.id
                          ? "bg-orange-100 border-orange-400 text-orange-800 shadow-sm"
                          : "bg-white border-gray-200 text-gray-700 hover:border-orange-300"
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {u.name.charAt(0)}
                      </span>
                      {u.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date + Priority */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    תאריך יעד
                  </p>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
                <div className="flex-shrink-0">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
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
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-base border transition-all ${
                          priority === k
                            ? "border-gray-400 bg-gray-100 shadow-sm"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        {v.icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Confirm */}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`w-full py-3 rounded-xl text-white text-sm font-bold disabled:opacity-40 transition-colors ${
              isTask
                ? "bg-orange-500 hover:bg-orange-600"
                : "bg-emerald-500 hover:bg-emerald-600"
            }`}
          >
            {isTask ? "📌 הוסף כמשימה" : "✅ הוסף כהחלטה"}
          </button>
        </div>
      </div>
    </div>
  );
}
