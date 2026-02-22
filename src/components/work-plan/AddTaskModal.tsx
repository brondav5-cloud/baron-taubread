"use client";

import { useState } from "react";
import { ClipboardList, X, Flag } from "lucide-react";
import { clsx } from "clsx";
import { DAYS } from "@/hooks/work-plan";

type Priority = "high" | "medium" | "low";

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  {
    value: "high",
    label: "דחוף",
    color: "bg-red-100 text-red-700 border-red-300",
  },
  {
    value: "medium",
    label: "רגיל",
    color: "bg-amber-100 text-amber-700 border-amber-300",
  },
  {
    value: "low",
    label: "נמוך",
    color: "bg-green-100 text-green-700 border-green-300",
  },
];

interface AddTaskModalProps {
  isOpen: boolean;
  selectedDay: number | null;
  onClose: () => void;
  onAdd: (
    title: string,
    description: string,
    day: number,
    priority: Priority,
  ) => void;
}

export function AddTaskModal({
  isOpen,
  selectedDay,
  onClose,
  onAdd,
}: AddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [day, setDay] = useState(selectedDay ?? 0);
  const [priority, setPriority] = useState<Priority>("medium");

  // Reset form when modal opens
  const handleClose = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    onClose();
  };

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!title.trim()) return;
    onAdd(title.trim(), description.trim(), day, priority);
    handleClose();
  };

  // Get current week dates
  const getWeekDates = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

    return DAYS.map((_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
  };

  const weekDates = getWeekDates();

  const formatDate = (date: Date | undefined) => {
    if (!date) return "";
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-xl">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-lg">הוסף משימה</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              כותרת המשימה *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="למשל: להכין דוח שבועי..."
              className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              פירוט (אופציונלי)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="הוסף פרטים נוספים..."
              className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          {/* Day Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              יום
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {DAYS.map((dayName, index) => (
                <button
                  key={index}
                  onClick={() => setDay(index)}
                  className={clsx(
                    "p-2 rounded-xl text-center transition-all text-sm",
                    day === index
                      ? "bg-primary-500 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700",
                  )}
                >
                  <p className="font-medium">{dayName}</p>
                  <p className="text-xs opacity-75">
                    {formatDate(weekDates[index])}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Flag className="w-4 h-4 inline-block ml-1" />
              עדיפות
            </label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPriority(option.value)}
                  className={clsx(
                    "flex-1 py-2 px-3 rounded-xl text-sm font-medium border-2 transition-all",
                    priority === option.value
                      ? option.color + " border-current"
                      : "bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={handleAdd}
            disabled={!title.trim()}
            className={clsx(
              "px-4 py-2 rounded-lg transition-colors",
              title.trim()
                ? "bg-primary-500 text-white hover:bg-primary-600"
                : "bg-gray-200 text-gray-400 cursor-not-allowed",
            )}
          >
            הוסף משימה
          </button>
        </div>
      </div>
    </div>
  );
}
