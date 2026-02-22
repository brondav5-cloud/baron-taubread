"use client";

import { format } from "date-fns";
import { Check } from "lucide-react";
import { clsx } from "clsx";
import type { Task } from "@/types/task";

interface ChecklistTabProps {
  task: Task;
  onToggle: (itemId: string) => void;
  canEdit: boolean;
}

export function ChecklistTab({ task, onToggle, canEdit }: ChecklistTabProps) {
  if (task.checklist.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Check className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>אין פריטים בצ&apos;קליסט</p>
      </div>
    );
  }

  const completed = task.checklist.filter((i) => i.completed).length;
  const progressPercent = (completed / task.checklist.length) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">
          {completed}/{task.checklist.length} הושלמו
        </span>
        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {task.checklist.map((item) => (
          <button
            key={item.id}
            onClick={() => canEdit && onToggle(item.id)}
            disabled={!canEdit}
            className={clsx(
              "w-full flex items-start gap-3 p-3 rounded-lg text-right transition-colors",
              canEdit ? "hover:bg-gray-50" : "cursor-default",
              item.completed && "bg-emerald-50",
            )}
          >
            <span
              className={item.completed ? "text-emerald-500" : "text-gray-300"}
            >
              {item.completed ? "☑️" : "☐"}
            </span>
            <div className="flex-1">
              <p
                className={clsx(
                  "text-sm",
                  item.completed && "line-through text-gray-400",
                )}
              >
                {item.text}
              </p>
              {item.completedBy && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {item.completedBy} •{" "}
                  {item.completedAt &&
                    format(new Date(item.completedAt), "dd/MM HH:mm")}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
