"use client";

import type { RowType } from "./types";

interface BlockToolbarProps {
  onAdd: (type: RowType | "topic") => void;
}

const ITEMS: { type: RowType | "topic"; icon: string; label: string; color: string }[] = [
  { type: "topic", icon: "📋", label: "נושא", color: "text-indigo-600" },
  { type: "text", icon: "💬", label: "הערה", color: "text-gray-600" },
  { type: "decision", icon: "✅", label: "החלטה", color: "text-emerald-600" },
  { type: "task", icon: "📌", label: "משימה", color: "text-orange-600" },
];

export default function BlockToolbar({ onAdd }: BlockToolbarProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 z-30 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-stretch h-16">
        {ITEMS.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => onAdd(item.type)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 active:bg-gray-100 transition-colors ${item.color}`}
          >
            <span className="text-2xl leading-none">{item.icon}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Desktop inline add-row bar (shown inside each topic)
interface AddRowBarProps {
  onAdd: (type: RowType) => void;
  onAddTopic?: () => void;
}

export function AddRowBar({ onAdd, onAddTopic }: AddRowBarProps) {
  return (
    <div className="flex gap-2 mt-2 pt-2 border-t border-dashed border-gray-200">
      {onAddTopic && (
        <button
          type="button"
          onClick={onAddTopic}
          className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors text-indigo-600 hover:bg-indigo-50 border-indigo-200"
        >
          <span>📋</span>
          <span>+ נושא</span>
        </button>
      )}
      {(["text", "decision", "task"] as RowType[]).map((type) => {
        const cfg = {
          text: {
            icon: "💬",
            label: "הערה",
            cls: "text-gray-500 hover:bg-gray-50 border-gray-200",
          },
          decision: {
            icon: "✅",
            label: "החלטה",
            cls: "text-emerald-600 hover:bg-emerald-50 border-emerald-200",
          },
          task: {
            icon: "📌",
            label: "משימה",
            cls: "text-orange-600 hover:bg-orange-50 border-orange-200",
          },
        }[type];
        return (
          <button
            key={type}
            type="button"
            onClick={() => onAdd(type)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${cfg.cls}`}
          >
            <span>{cfg.icon}</span>
            <span>+ {cfg.label}</span>
          </button>
        );
      })}
    </div>
  );
}
