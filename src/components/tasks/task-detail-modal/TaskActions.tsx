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
  expectedCompletionAtInput: string;
  progressUpdateText: string;
  onCompleteResponseChange: (value: string) => void;
  onRejectReasonChange: (value: string) => void;
  onExpectedCompletionAtInputChange: (value: string) => void;
  onProgressUpdateTextChange: (value: string) => void;
  onConfirmCompleteChange: (value: boolean) => void;
  onShowRejectForm: (show: boolean) => void;
  onStartTask: () => void;
  onCompleteTask: () => void;
  onApproveTask: () => void;
  onRejectTask: () => void;
  onUpdateExpectedCompletion: () => void;
  onAddProgressUpdate: () => void;
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
  expectedCompletionAtInput,
  progressUpdateText,
  onCompleteResponseChange,
  onRejectReasonChange,
  onExpectedCompletionAtInputChange,
  onProgressUpdateTextChange,
  onConfirmCompleteChange,
  onShowRejectForm,
  onStartTask,
  onCompleteTask,
  onApproveTask,
  onRejectTask,
  onUpdateExpectedCompletion,
  onAddProgressUpdate,
}: TaskActionsProps) {
  return (
    <div className="border-t border-gray-100 p-4 bg-gray-50">
      {/* In Progress - Response Field + Complete Button */}
      {canManageTreatment && (
        <div className="space-y-3 max-h-[40vh] overflow-y-auto">
          <div className="text-xs font-semibold text-gray-500">ניהול בזמן טיפול</div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              יעד סיום מעודכן
            </label>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={expectedCompletionAtInput}
                onChange={(e) =>
                  onExpectedCompletionAtInputChange(e.target.value)
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={onUpdateExpectedCompletion}
                disabled={!expectedCompletionAtInput}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                עדכן
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              עדכון התקדמות
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={progressUpdateText}
                onChange={(e) => onProgressUpdateTextChange(e.target.value)}
                placeholder="למשל: טופלה תקלה בחלק א׳, ממשיך לחלק ב׳"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={onAddProgressUpdate}
                disabled={!progressUpdateText.trim()}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                דווח בטיפול
              </button>
            </div>
          </div>
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
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                >
                  כן, סיימתי
                </button>
                <button
                  onClick={() => onConfirmCompleteChange(false)}
                  className="flex-1 py-2 border border-emerald-300 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100"
                >
                  עדיין בטיפול
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reject Form */}
      {showRejectForm && (
        <div className="mb-4 p-3 bg-red-50 rounded-xl">
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

      {/* Action Buttons */}
      {!canManageTreatment && (
        <div className="flex gap-2">
          {/* Start Task Button */}
          {isAssignee && (myStatus === "new" || myStatus === "seen") && (
            <button
              onClick={onStartTask}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
            >
              <TrendingUp className="w-4 h-4" />
              נכנס לטיפול
            </button>
          )}

          {/* Creator Approval Buttons */}
          {isCreator && task.status === "done" && !showRejectForm && (
            <>
              <button
                onClick={() => onShowRejectForm(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-red-300 text-red-600 rounded-xl font-medium hover:bg-red-50"
              >
                <XCircle className="w-4 h-4" />
                דחה
              </button>
              <button
                onClick={onApproveTask}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4" />
                אשר וסגור
              </button>
            </>
          )}

          {/* Closed Task */}
          {task.status === "approved" && (
            <div className="flex-1 text-center py-2.5 bg-gray-100 rounded-xl text-gray-500">
              ✅ משימה נסגרה
            </div>
          )}
        </div>
      )}
    </div>
  );
}
