"use client";

import { clsx } from "clsx";
import type { TaskPriority } from "@/types/task";
import { TASK_PRIORITY_CONFIG } from "@/types/task";

interface PrioritySelectorProps {
  priority: TaskPriority;
  onPriorityChange: (priority: TaskPriority) => void;
}

export function PrioritySelector({
  priority,
  onPriorityChange,
}: PrioritySelectorProps) {
  const priorities = Object.keys(TASK_PRIORITY_CONFIG) as TaskPriority[];

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        דחיפות
      </label>
      <div className="flex gap-2">
        {priorities.map((p) => {
          const config = TASK_PRIORITY_CONFIG[p];
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPriorityChange(p)}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 transition-all",
                priority === p
                  ? "border-primary-500 bg-primary-50"
                  : "border-gray-200 hover:border-gray-300",
              )}
            >
              <span>{config.icon}</span>
              <span className="text-sm font-medium">{config.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
