"use client";

import { clsx } from "clsx";
import type { DueOption } from "./useCreateTaskForm";

interface DueDateSelectorProps {
  dueOption: DueOption;
  customDueDate: string;
  onDueOptionChange: (option: DueOption) => void;
  onCustomDateChange: (date: string) => void;
}

const DUE_OPTIONS: { value: DueOption; label: string }[] = [
  { value: "today", label: "היום" },
  { value: "tomorrow", label: "מחר" },
  { value: "week", label: "שבוע" },
  { value: "custom", label: "בחר..." },
];

export function DueDateSelector({
  dueOption,
  customDueDate,
  onDueOptionChange,
  onCustomDateChange,
}: DueDateSelectorProps) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        ⏰ מועד יעד לטיפול
      </label>
      <div className="grid grid-cols-4 gap-2">
        {DUE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onDueOptionChange(option.value)}
            className={clsx(
              "py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all",
              dueOption === option.value
                ? "border-primary-500 bg-primary-50 text-primary-700"
                : "border-gray-200 hover:border-gray-300",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {dueOption === "custom" && (
        <input
          type="date"
          value={customDueDate}
          onChange={(e) => onCustomDateChange(e.target.value)}
          min={today}
          className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        />
      )}
    </div>
  );
}
