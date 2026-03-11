"use client";

import { useRef, useEffect, useState } from "react";
import type { ContentRow, EditorUser, RowType } from "./types";
import { ROW_TYPE_CONFIG } from "./types";
import { MEETING_PRIORITY_CONFIG } from "@/types/meeting";
import type { MeetingTaskPriority } from "@/types/meeting";

interface RowBlockProps {
  row: ContentRow;
  topicId: string;
  users: EditorUser[];
  readonly?: boolean;
  onUpdate: (updates: Partial<ContentRow>) => void;
  onDelete: () => void;
  onAddAfter: (type: RowType) => void;
  onChangeType: (newType: RowType) => void;
  onRequestTaskEdit: () => void;
}

export default function RowBlock({
  row,
  users: _users,
  readonly = false,
  onUpdate,
  onDelete,
  onAddAfter,
  onChangeType,
  onRequestTaskEdit,
}: RowBlockProps) {
  const cfg = ROW_TYPE_CONFIG[row.type];
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  // Auto-resize textarea
  const textContent =
    row.type === "text" || row.type === "decision" ? row.content : null;
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [textContent]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onAddAfter("text");
    }
    if (e.key === "Backspace" && row.content === "") {
      e.preventDefault();
      onDelete();
    }
  };

  if (row.type === "task") {
    const isOverdue = row.dueDate && new Date(row.dueDate) < new Date();
    const priorityCfg = MEETING_PRIORITY_CONFIG[row.priority];
    return (
      <div
        className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border ${cfg.border} ${cfg.bg} group relative`}
      >
        {/* Type badge */}
        {!readonly && (
          <TypeBadge
            type={row.type}
            showMenu={showTypeMenu}
            onToggleMenu={() => setShowTypeMenu((p) => !p)}
            onChangeType={(t) => {
              setShowTypeMenu(false);
              onChangeType(t);
            }}
          />
        )}
        {readonly && (
          <span className="text-base flex-shrink-0">{cfg.icon}</span>
        )}

        {/* Assignee avatar */}
        <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
          {row.assigneeName ? row.assigneeName.charAt(0) : "?"}
        </span>

        {/* Task content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${cfg.text}`}>
            {row.content || (
              <span className="text-gray-400 italic">לא הוזן תיאור</span>
            )}
          </p>
          <p className="text-xs text-gray-500">
            {row.assigneeName || "לא שויך"}
            {row.dueDate && (
              <span
                className={`mr-2 ${isOverdue ? "text-red-500 font-semibold" : ""}`}
              >
                {isOverdue ? "⚠️ " : ""}עד{" "}
                {new Date(row.dueDate + "T00:00:00").toLocaleDateString(
                  "he-IL",
                )}
              </span>
            )}
          </p>
        </div>

        {/* Priority + edit */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-base" title={priorityCfg.label}>
            {priorityCfg.icon}
          </span>
          {!readonly && (
            <button
              type="button"
              onClick={onRequestTaskEdit}
              className="text-xs text-orange-600 border border-orange-200 rounded-lg px-2 py-1 hover:bg-orange-100 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="ערוך משימה"
            >
              ✏️
            </button>
          )}
        </div>
      </div>
    );
  }

  // Text / Decision row — inline textarea
  return (
    <div
      className={`flex gap-2 rounded-xl px-3 py-2 border ${cfg.border} ${cfg.bg} group`}
    >
      {!readonly && (
        <TypeBadge
          type={row.type}
          showMenu={showTypeMenu}
          onToggleMenu={() => setShowTypeMenu((p) => !p)}
          onChangeType={(t) => {
            setShowTypeMenu(false);
            onChangeType(t);
          }}
        />
      )}
      {readonly && (
        <span className="text-base flex-shrink-0 mt-0.5">{cfg.icon}</span>
      )}

      <textarea
        ref={textareaRef}
        value={row.content}
        onChange={(e) => onUpdate({ content: e.target.value } as Partial<ContentRow>)}
        onKeyDown={handleKeyDown}
        readOnly={readonly}
        placeholder={
          row.type === "decision" ? "פרט את ההחלטה..." : "הערה חופשית..."
        }
        rows={1}
        dir="rtl"
        className={`flex-1 resize-none bg-transparent text-sm focus:outline-none leading-relaxed placeholder:text-gray-300 ${cfg.text}`}
        style={{ minHeight: "1.5rem" }}
      />

      {!readonly && (
        <button
          type="button"
          onClick={onDelete}
          className="text-gray-300 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex-shrink-0 mt-0.5 self-start"
          aria-label="מחק שורה"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ── Type badge with dropdown menu ──────────────────────────

interface TypeBadgeProps {
  type: RowType;
  showMenu: boolean;
  onToggleMenu: () => void;
  onChangeType: (t: RowType) => void;
}

function TypeBadge({ type, showMenu, onToggleMenu, onChangeType }: TypeBadgeProps) {
  const cfg = ROW_TYPE_CONFIG[type];
  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={onToggleMenu}
        title="שנה סוג שורה"
        className="text-base hover:scale-110 transition-transform"
      >
        {cfg.icon}
      </button>
      {showMenu && (
        <div className="absolute top-full mt-1 right-0 bg-white rounded-xl shadow-xl border border-gray-200 z-20 min-w-[120px] overflow-hidden">
          {(Object.entries(ROW_TYPE_CONFIG) as [RowType, typeof ROW_TYPE_CONFIG[RowType]][]).map(
            ([t, c]) => (
              <button
                key={t}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChangeType(t);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 text-right ${
                  t === type ? "font-bold" : ""
                }`}
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
                {t === type && <span className="mr-auto text-blue-500">✓</span>}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

// ── Read-only priority chip for task rows ───────────────────

export function PriorityChip({ priority }: { priority: MeetingTaskPriority }) {
  const cfg = MEETING_PRIORITY_CONFIG[priority];
  return (
    <span className={`text-xs font-medium ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}
