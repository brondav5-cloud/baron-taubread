"use client";

import { format } from "date-fns";
import { he } from "date-fns/locale";
import { User, Store, Clock } from "lucide-react";
import type { Task } from "@/types/task";
import { AssigneeManager } from "../AssigneeManager";

interface DetailsTabProps {
  task: Task;
  canEdit: boolean;
  onAddAssignee: (
    userId: string,
    userName: string,
    role: "primary" | "secondary",
  ) => void;
  onRemoveAssignee: (userId: string) => void;
}

export function DetailsTab({
  task,
  canEdit,
  onAddAssignee,
  onRemoveAssignee,
}: DetailsTabProps) {
  return (
    <div className="space-y-4">
      {/* Task Type Badge */}
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

      {/* Assignees Section with Manager */}
      <div className="p-3 bg-gray-50 rounded-xl">
        <AssigneeManager
          assignees={task.assignees}
          canEdit={canEdit}
          onAdd={onAddAssignee}
          onRemove={onRemoveAssignee}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-gray-400" />
          <span className="text-gray-500">נפתח ע״י:</span>
          <span className="font-medium">{task.createdByName}</span>
        </div>
        {task.taskType === "store" && task.storeName && (
          <div className="flex items-center gap-2 text-sm">
            <Store className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500">חנות:</span>
            <span className="font-medium">{task.storeName}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-gray-500">נוצר:</span>
          <span>
            {format(new Date(task.createdAt), "dd/MM/yyyy HH:mm", {
              locale: he,
            })}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-gray-500">דדליין:</span>
          <span>
            {format(new Date(task.dueDate), "dd/MM/yyyy HH:mm", { locale: he })}
          </span>
        </div>
        {task.startsAt && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500">מתפרסם למוקצים:</span>
            <span>
              {format(new Date(task.startsAt), "dd/MM/yyyy HH:mm", {
                locale: he,
              })}
            </span>
          </div>
        )}
        {task.expectedCompletionAt && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500">יעד סיום מעודכן:</span>
            <span>
              {format(new Date(task.expectedCompletionAt), "dd/MM/yyyy HH:mm", {
                locale: he,
              })}
            </span>
          </div>
        )}
      </div>

      {task.handlerResponse && (
        <div className="p-3 bg-emerald-50 rounded-xl">
          <h4 className="text-sm font-medium text-emerald-800 mb-1">
            תגובת המטפל
          </h4>
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
