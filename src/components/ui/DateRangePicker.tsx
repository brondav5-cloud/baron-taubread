"use client";

import { useState, useMemo } from "react";
import { Calendar, ChevronDown, X } from "lucide-react";
import { clsx } from "clsx";

// ============================================
// TYPES
// ============================================

export type DatePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "custom";

export interface DateRange {
  from: Date;
  to: Date;
  preset: DatePreset;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

// ============================================
// PRESETS CONFIG
// ============================================

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: "today", label: "היום" },
  { id: "yesterday", label: "אתמול" },
  { id: "this_week", label: "השבוע" },
  { id: "last_week", label: "שבוע שעבר" },
  { id: "this_month", label: "החודש" },
  { id: "last_month", label: "חודש שעבר" },
  { id: "this_year", label: "השנה" },
  { id: "custom", label: "טווח מותאם" },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getDateRangeFromPreset(preset: DatePreset): {
  from: Date;
  to: Date;
} {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "today":
      return { from: today, to: today };

    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { from: yesterday, to: yesterday };
    }

    case "this_week": {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return { from: startOfWeek, to: today };
    }

    case "last_week": {
      const startOfLastWeek = new Date(today);
      startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
      return { from: startOfLastWeek, to: endOfLastWeek };
    }

    case "this_month": {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: startOfMonth, to: today };
    }

    case "last_month": {
      const startOfLastMonth = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1,
      );
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: startOfLastMonth, to: endOfLastMonth };
    }

    case "this_year": {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      return { from: startOfYear, to: today };
    }

    case "custom":
    default:
      return { from: today, to: today };
  }
}

export function createDateRange(
  preset: DatePreset,
  customFrom?: Date,
  customTo?: Date,
): DateRange {
  if (preset === "custom" && customFrom && customTo) {
    return { from: customFrom, to: customTo, preset };
  }
  const { from, to } = getDateRangeFromPreset(preset);
  return { from, to, preset };
}

function formatDateHebrew(date: Date): string {
  return date.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

function formatDateInput(date: Date): string {
  const isoString = date.toISOString();
  return isoString.split("T")[0] ?? isoString.slice(0, 10);
}

// ============================================
// COMPONENT
// ============================================

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(formatDateInput(value.from));
  const [customTo, setCustomTo] = useState(formatDateInput(value.to));

  const displayLabel = useMemo(() => {
    const preset = PRESETS.find((p) => p.id === value.preset);
    if (value.preset === "custom") {
      return `${formatDateHebrew(value.from)} - ${formatDateHebrew(value.to)}`;
    }
    return preset?.label || "בחר תאריך";
  }, [value]);

  const handlePresetClick = (preset: DatePreset) => {
    if (preset === "custom") {
      return; // Don't close, let user pick dates
    }
    onChange(createDateRange(preset));
    setIsOpen(false);
  };

  const handleCustomApply = () => {
    const from = new Date(customFrom);
    const to = new Date(customTo);
    if (from <= to) {
      onChange({ from, to, preset: "custom" });
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onChange(createDateRange("this_month"));
    setIsOpen(false);
  };

  return (
    <div className={clsx("relative", className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "flex items-center gap-2 px-3 py-2 bg-white border rounded-lg text-sm",
          "hover:border-primary-300 transition-colors",
          isOpen && "border-primary-500 ring-2 ring-primary-100",
        )}
      >
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="text-gray-700">{displayLabel}</span>
        <ChevronDown
          className={clsx(
            "w-4 h-4 text-gray-400 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 mt-2 bg-white border rounded-xl shadow-lg z-50 min-w-[280px]">
            {/* Presets */}
            <div className="p-2 border-b">
              <div className="grid grid-cols-2 gap-1">
                {PRESETS.filter((p) => p.id !== "custom").map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetClick(preset.id)}
                    className={clsx(
                      "px-3 py-2 text-sm rounded-lg text-right transition-colors",
                      value.preset === preset.id
                        ? "bg-primary-100 text-primary-700 font-medium"
                        : "hover:bg-gray-100 text-gray-700",
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Range */}
            <div className="p-3">
              <p className="text-xs font-medium text-gray-500 mb-2">
                טווח מותאם:
              </p>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="flex-1 px-2 py-1.5 border rounded-lg text-sm"
                />
                <span className="text-gray-400">עד</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="flex-1 px-2 py-1.5 border rounded-lg text-sm"
                />
              </div>
              <button
                onClick={handleCustomApply}
                className="w-full py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
              >
                החל
              </button>
            </div>

            {/* Clear */}
            <div className="p-2 border-t">
              <button
                onClick={handleClear}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <X className="w-3 h-3" />
                אפס לחודש נוכחי
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
