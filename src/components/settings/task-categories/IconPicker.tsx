"use client";

import { useState } from "react";
import { clsx } from "clsx";

// רשימת אייקונים מומלצים לקטגוריות משימות
const ICON_GROUPS = {
  עסקים: ["📦", "💰", "🚚", "💳", "📊", "📈", "🏪", "🛒", "🏭", "📋"],
  תקשורת: ["📞", "📧", "💬", "📣", "🔔", "📱", "💻", "🖥️", "📡", "📺"],
  אנשים: ["👤", "👥", "🤝", "👔", "👷", "🧑‍💼", "👨‍💼", "👩‍💼", "🙋", "💁"],
  סטטוס: ["✅", "❌", "⚠️", "🔴", "🟡", "🟢", "⏰", "🔒", "🔓", "⭐"],
  כלים: ["🔧", "🔨", "⚙️", "🛠️", "📐", "📏", "🔍", "💡", "🔑", "📎"],
  מסמכים: ["📄", "📑", "📝", "📁", "🗂️", "🗃️", "📚", "📖", "🧾", "📃"],
  כסף: ["💵", "💴", "💶", "💷", "💸", "🏦", "💹", "📉", "🪙", "💎"],
  זמן: ["⏱️", "⏲️", "🕐", "📅", "🗓️", "⌛", "⏳", "🔄", "🔁", "📆"],
};

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string>(
    Object.keys(ICON_GROUPS)[0]!,
  );

  const handleSelect = (icon: string) => {
    onChange(icon);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "w-16 h-16 text-3xl rounded-xl border-2 transition-all",
          "flex items-center justify-center",
          "hover:border-primary-300 hover:bg-primary-50",
          isOpen
            ? "border-primary-500 bg-primary-50"
            : "border-gray-200 bg-white",
        )}
      >
        {value || "❓"}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
            {/* Group Tabs */}
            <div className="flex flex-wrap gap-1 p-2 bg-gray-50 border-b border-gray-100">
              {Object.keys(ICON_GROUPS).map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => setActiveGroup(group)}
                  className={clsx(
                    "px-2 py-1 text-xs rounded-lg transition-colors",
                    activeGroup === group
                      ? "bg-primary-500 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-100",
                  )}
                >
                  {group}
                </button>
              ))}
            </div>

            {/* Icons Grid */}
            <div className="p-3 grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
              {ICON_GROUPS[activeGroup as keyof typeof ICON_GROUPS]?.map(
                (icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => handleSelect(icon)}
                    className={clsx(
                      "w-10 h-10 text-xl rounded-lg transition-all",
                      "flex items-center justify-center",
                      "hover:bg-primary-100",
                      value === icon &&
                        "bg-primary-100 ring-2 ring-primary-500",
                    )}
                  >
                    {icon}
                  </button>
                ),
              )}
            </div>

            {/* Custom Input */}
            <div className="p-2 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500 mb-1">או הקלד אימוג׳י:</p>
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value.slice(-2))}
                placeholder="🔤"
                className="w-full px-2 py-1 text-center text-lg border border-gray-200 rounded-lg"
                maxLength={2}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
