"use client";

import { TrendingUp, CheckCircle, XCircle } from "lucide-react";
import type { Task, TaskStatus } from "@/types/task";

interface TaskActionsProps {
  task: Task;
  isAssignee: boolean;
  isCreator: boolean;
  canManageTreatment: boolean;
  myStatus: TaskStatus | undefined;
  showRejectForm: boolean;
  confirmComplete: boolean;
  completeResponse: string;
  rejectReason: string;
  onCompleteResponseChange: (value: string) => void;
  onRejectReasonChange: (value: string) => void;
  onConfirmCompleteChange: (value: boolean) => void;
  onShowRejectForm: (show: boolean) => void;
  onStartTask: () => void;
  onCompleteTask: () => void;
  onApproveTask: () => void;
  onRejectTask: () => void;
}

export function TaskActions({
  task,
  isAssignee,
  isCreator,
  canManageTreatment,
  myStatus,
  showRejectForm,
  confirmComplete,
  completeResponse,
  rejectReason,
  onCompleteResponseChange,
  onRejectReasonChange,
  onConfirmCompleteChange,
  onShowRejectForm,
  onStartTask,
  onCompleteTask,
  onApproveTask,
  onRejectTask,
}: TaskActionsProps) {
  const showAnything =
    (isAssignee && (myStatus === "new" || myStatus === "seen")) ||
    canManageTreatment ||
    (isCreator && task.status === "done") ||
    task.status === "approved" ||
    showRejectForm;

  if (!showAnything) return null;

  return (
    <div className="border-t border-gray-100 p-4 pb-[calc(env(safe-area-inset-bottom)+12px)] bg-white">
      {/* נכנס לטיפול */}
      {isAssignee && (myStatus === "new" || myStatus === "seen") && (
        <button
          onClick={onStartTask}
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
        >
          <TrendingUp className="w-4 h-4" />
          נכנס לטיפול
        </button>
      )}

      {/* בטיפול: כפתור סיים משימה */}
      {canManageTreatment && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              תגובה לסיום (מה עשית?)
            </label>
            <textarea
              value={completeResponse}
              onChange={(e) => onCompleteResponseChange(e.target.value)}
              placeholder="תאר בקצרה את הפעולות שביצעת..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
            />
          </div>
          {!confirmComplete ? (
            <button
              onClick={() => onConfirmCompleteChange(true)}
              disabled={!completeResponse.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-4 h-4" />
              סיים משימה
            </button>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-2">
              <p className="text-sm font-medium text-emerald-800">
                האם באמת סיימת את המשימה?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onCompleteTask}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                >
                  כן, סיימתי
                </button>
                <button
                  onClick={() => onConfirmCompleteChange(false)}
                  className="flex-1 py-2.5 border border-emerald-300 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100"
                >
                  עדיין בטיפול
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* טופס דחייה */}
      {showRejectForm && (
        <div className="mb-3 p-3 bg-red-50 rounded-xl">
          <p className="text-sm font-medium text-red-800 mb-2">סיבת הדחייה:</p>
          <textarea
            value={rejectReason}
            onChange={(e) => onRejectReasonChange(e.target.value)}
            placeholder="למה הטיפול לא מספק?"
            rows={2}
            className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onShowRejectForm(false)}
              className="px-3 py-1.5 text-sm text-gray-600"
            >
              ביטול
            </button>
            <button
              onClick={onRejectTask}
              disabled={!rejectReason.trim()}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg disabled:opacity-50"
            >
              דחה
            </button>
          </div>
        </div>
      )}

      {/* אישור יוצר */}
      {isCreator && task.status === "done" && !showRejectForm && (
        <div className="flex gap-2">
          <button
            onClick={() => onShowRejectForm(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 border border-red-300 text-red-600 rounded-xl font-medium hover:bg-red-50"
          >
            <XCircle className="w-4 h-4" />
            דחה
          </button>
          <button
            onClick={onApproveTask}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4" />
            אשר וסגור
          </button>
        </div>
      )}

      {/* נסגרה */}
      {task.status === "approved" && (
        <div className="text-center py-3 bg-gray-100 rounded-xl text-gray-500">
          ✅ משימה נסגרה
        </div>
      )}
    </div>
  );
}
