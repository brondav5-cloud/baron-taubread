"use client";

import { format } from "date-fns";
import { he } from "date-fns/locale";
import { clsx } from "clsx";
import type { Task } from "@/types/task";

interface HistoryTabProps {
  task: Task;
}

const ACTION_LABELS: Record<string, string> = {
  created: "יצר את המשימה",
  seen: "צפה במשימה",
  started: "התחיל טיפול",
  done: "סיים טיפול",
  approved: "אישר וסגר",
  rejected: "דחה",
  comment: "הוסיף הערה",
  checklist: "עדכן צ'קליסט",
  reassigned: "העביר את המשימה",
  assigned: "הוסיף משתמש למשימה",
  removed: "הסיר משתמש מהמשימה",
};

export function HistoryTab({ task }: HistoryTabProps) {
  return (
    <div className="space-y-3">
      {task.history.map((item, index) => (
        <div
          key={item.id}
          className={clsx(
            "flex gap-3 pb-3",
            index !== task.history.length - 1 && "border-b border-gray-100",
          )}
        >
          <div className="w-2 h-2 mt-2 rounded-full bg-gray-300" />
          <div className="flex-1">
            <p className="text-sm">
              <span className="font-medium">{item.userName}</span>{" "}
              <span className="text-gray-600">
                {ACTION_LABELS[item.action] || item.action}
              </span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {format(new Date(item.timestamp), "dd/MM/yyyy HH:mm", {
                locale: he,
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
