"use client";

import { format } from "date-fns";
import { he } from "date-fns/locale";
import { User, Store, Clock } from "lucide-react";
import type { Task } from "@/types/task";
import { AssigneeManager } from "../AssigneeManager";

interface DetailsTabProps {
  task: Task;
  canEdit: boolean;
  canManageTreatment?: boolean;
  expectedCompletionAtInput?: string;
  progressUpdateText?: string;
  onExpectedCompletionAtInputChange?: (v: string) => void;
  onProgressUpdateTextChange?: (v: string) => void;
  onUpdateExpectedCompletion?: () => void;
  onAddProgressUpdate?: () => void;
  onAddAssignee: (userId: string, userName: string, role: "primary" | "secondary") => void;
  onRemoveAssignee: (userId: string) => void;
}

export function DetailsTab({
  task,
  canEdit,
  canManageTreatment,
  expectedCompletionAtInput = "",
  progressUpdateText = "",
  onExpectedCompletionAtInputChange,
  onProgressUpdateTextChange,
  onUpdateExpectedCompletion,
  onAddProgressUpdate,
  onAddAssignee,
  onRemoveAssignee,
}: DetailsTabProps) {
  return (
    <div className="space-y-4">
      {task.taskType === "general" && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm">
          <span>📋</span>
          <span>משימה כללית</span>
        </div>
      )}

      {task.description && (
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">תיאור</h4>
          <p className="text-gray-900">{task.description}</p>
        </div>
      )}

      <div className="p-3 bg-gray-50 rounded-xl">
        <AssigneeManager
          assignees={task.assignees}
          canEdit={canEdit}
          onAdd={onAddAssignee}
          onRemove={onRemoveAssignee}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-1.5">
          <User className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-gray-500">נפתח ע״י:</span>
          <span className="font-medium truncate">{task.createdByName}</span>
        </div>
        {task.taskType === "store" && task.storeName && (
          <div className="flex items-center gap-1.5">
            <Store className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-gray-500">חנות:</span>
            <span className="font-medium truncate">{task.storeName}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-gray-500">נוצר:</span>
          <span>{format(new Date(task.createdAt), "dd/MM/yy HH:mm", { locale: he })}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-gray-500">דדליין:</span>
          <span>{format(new Date(task.dueDate), "dd/MM/yy HH:mm", { locale: he })}</span>
        </div>
        {task.expectedCompletionAt && (
          <div className="col-span-2 flex items-center gap-1.5 text-blue-700">
            <Clock className="w-4 h-4 shrink-0" />
            <span>יעד סיום מעודכן:</span>
            <span className="font-medium">
              {format(new Date(task.expectedCompletionAt), "dd/MM/yy HH:mm", { locale: he })}
            </span>
          </div>
        )}
      </div>

      {/* אזור עדכוני טיפול — מוצג inline כשהמשתמש בטיפול */}
      {canManageTreatment && (
        <div className="border border-indigo-100 bg-indigo-50/50 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-indigo-700">עדכון בזמן טיפול</p>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              יעד סיום מעודכן
            </label>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={expectedCompletionAtInput}
                onChange={(e) => onExpectedCompletionAtInputChange?.(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              />
              <button
                onClick={onUpdateExpectedCompletion}
                disabled={!expectedCompletionAtInput}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-40"
              >
                עדכן
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              דיווח התקדמות
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={progressUpdateText}
                onChange={(e) => onProgressUpdateTextChange?.(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onAddProgressUpdate?.()}
                placeholder="מה עשית? מה הצעד הבא?"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              />
              <button
                onClick={onAddProgressUpdate}
                disabled={!progressUpdateText.trim()}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-40"
              >
                שלח
              </button>
            </div>
          </div>

          {task.progressUpdates && task.progressUpdates.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-indigo-500">דיווחים קודמים:</p>
              {task.progressUpdates.slice(-3).reverse().map((u) => (
                <div key={u.id} className="text-xs text-indigo-900 bg-white rounded-lg px-3 py-2 border border-indigo-100">
                  <span className="font-medium">{u.userName}:</span> {u.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {task.handlerResponse && (
        <div className="p-3 bg-emerald-50 rounded-xl">
          <h4 className="text-sm font-medium text-emerald-800 mb-1">תגובת המטפל</h4>
          <p className="text-sm text-emerald-900">{task.handlerResponse}</p>
        </div>
      )}

      {task.rejectionReason && (
        <div className="p-3 bg-red-50 rounded-xl">
          <h4 className="text-sm font-medium text-red-800 mb-1">סיבת דחייה</h4>
          <p className="text-sm text-red-900">{task.rejectionReason}</p>
        </div>
      )}
    </div>
  );
}
