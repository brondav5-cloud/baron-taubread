"use client";

import { useState, useEffect } from "react";
import type { EditorUser } from "./types";
import type { MeetingTaskPriority } from "@/types/meeting";
import { MEETING_PRIORITY_CONFIG } from "@/types/meeting";
import { defaultDue } from "./blockSerializer";
import type { TaskSheetData } from "./TaskSheet";

type ConvertTarget = "decision" | "task";

export interface ConvertResult {
  type: ConvertTarget;
  content: string;
  taskData?: Omit<TaskSheetData, "content">;
}

interface ConvertDialogProps {
  open: boolean;
  originalText: string;
  users: EditorUser[];
  onConfirm: (result: ConvertResult) => void;
  onClose: () => void;
}

type Step = "select" | "decision" | "task";

export default function ConvertDialog({
  open,
  originalText,
  users,
  onConfirm,
  onClose,
}: ConvertDialogProps) {
  const [step, setStep] = useState<Step>("select");
  const [content, setContent] = useState(originalText);
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState(defaultDue());
  const [priority, setPriority] = useState<MeetingTaskPriority>("normal");

  useEffect(() => {
    if (open) {
      setStep("select");
      setContent(originalText);
      setAssigneeId("");
      setDueDate(defaultDue());
      setPriority("normal");
    }
  }, [open, originalText]);

  if (!open) return null;

  const canConfirm =
    content.trim().length > 0 &&
    (step === "decision" || (step === "task" && Boolean(assigneeId)));

  const handleConfirm = () => {
    if (!canConfirm) return;
    if (step === "decision") {
      onConfirm({ type: "decision", content: content.trim() });
    } else if (step === "task") {
      const user = users.find((u) => u.id === assigneeId);
      if (!user) return;
      onConfirm({
        type: "task",
        content: content.trim(),
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h3 className="font-bold text-gray-900 text-sm">
            {step === "select" ? "המר הערה ל..." : step === "decision" ? "✅ המר להחלטה" : "📌 המר למשימה"}
          </h3>
          {step !== "select" && (
            <button
              type="button"
              onClick={() => setStep("select")}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              ← חזור
            </button>
          )}
        </div>

        {/* Original text */}
        <div className="px-5 pb-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
            הערה מקורית
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-500 max-h-16 overflow-y-auto leading-relaxed">
            {originalText || "—"}
          </div>
        </div>

        {/* Step: Select type */}
        {step === "select" && (
          <div className="px-5 pb-5 flex gap-3">
            <button
              type="button"
              onClick={() => setStep("decision")}
              className="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 active:scale-95 transition-all"
            >
              <span className="text-2xl">✅</span>
              <span className="text-xs font-bold text-emerald-800">החלטה</span>
            </button>
            <button
              type="button"
              onClick={() => setStep("task")}
              className="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 border-orange-200 bg-orange-50 hover:bg-orange-100 active:scale-95 transition-all"
            >
              <span className="text-2xl">📌</span>
              <span className="text-xs font-bold text-orange-800">משימה</span>
            </button>
          </div>
        )}

        {/* Step: Decision */}
        {step === "decision" && (
          <div className="px-5 pb-5 space-y-3">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                כותרת ההחלטה (ניתן לקצר)
              </p>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={2}
                autoFocus
                className="w-full border border-emerald-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
              />
            </div>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold disabled:opacity-40 hover:bg-emerald-600 transition-colors"
            >
              ✅ המר להחלטה
            </button>
          </div>
        )}

        {/* Step: Task */}
        {step === "task" && (
          <div className="px-5 pb-5 space-y-3">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                כותרת המשימה (ניתן לקצר)
              </p>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={2}
                autoFocus
                className="w-full border border-orange-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
              />
            </div>

            {/* Assignee */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                למי?
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setAssigneeId(u.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      assigneeId === u.id
                        ? "bg-orange-100 border-orange-400 text-orange-800"
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
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
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
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
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
                          : "border-gray-200 bg-white text-gray-400"
                      }`}
                    >
                      {v.icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="w-full py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold disabled:opacity-40 hover:bg-orange-600 transition-colors"
            >
              📌 המר למשימה
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
