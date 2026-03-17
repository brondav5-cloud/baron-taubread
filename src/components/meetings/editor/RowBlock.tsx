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
  /** For text rows — opens ConvertDialog with the chosen target type */
  onRequestConvert?: (targetType: "decision" | "task") => void;
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
  onRequestConvert,
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

  // ── Task row ────────────────────────────────────────────────
  if (row.type === "task") {
    const isOverdue = row.dueDate && new Date(row.dueDate) < new Date();
    const priorityCfg = MEETING_PRIORITY_CONFIG[row.priority];
    return (
      <div
        className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border ${cfg.border} ${cfg.bg} group relative`}
      >
        {!readonly && (
          <TypeBadge
            type={row.type}
            showMenu={showTypeMenu}
            onToggleMenu={() => setShowTypeMenu((p) => !p)}
            onChangeType={(t) => { setShowTypeMenu(false); onChangeType(t); }}
            onDelete={() => { setShowTypeMenu(false); onDelete(); }}
          />
        )}
        {readonly && <span className="text-base flex-shrink-0">{cfg.icon}</span>}

        <div className="flex -space-x-1 flex-shrink-0">
          {(row.assigneeNames.length > 0 ? row.assigneeNames : ["?"]).slice(0, 3).map((name, i) => (
            <span
              key={i}
              title={name}
              className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center border-2 border-white"
            >
              {name.charAt(0)}
            </span>
          ))}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${cfg.text}`}>
            {row.content || <span className="text-gray-400 italic">לא הוזן תיאור</span>}
          </p>
          <p className="text-xs text-gray-500">
            {row.assigneeNames.length > 0
              ? row.assigneeNames.join(", ")
              : "לא שויך"}
            {row.dueDate && (
              <span className={`mr-2 ${isOverdue ? "text-red-500 font-semibold" : ""}`}>
                {isOverdue ? "⚠️ " : ""}עד{" "}
                {new Date(row.dueDate + "T00:00:00").toLocaleDateString("he-IL")}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-base" title={priorityCfg.label}>{priorityCfg.icon}</span>
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

  // ── Text / Decision row ─────────────────────────────────────
  const isEmpty = row.content === "";

  return (
    <div className={`flex gap-2 rounded-xl px-3 py-2 border ${cfg.border} ${cfg.bg} group`}>
      {!readonly && (
        <TypeBadge
          type={row.type}
          showMenu={showTypeMenu}
          onToggleMenu={() => setShowTypeMenu((p) => !p)}
          onChangeType={(t) => { setShowTypeMenu(false); onChangeType(t); }}
          onDelete={() => { setShowTypeMenu(false); onDelete(); }}
          onConvert={row.type === "text" ? (target) => {
            setShowTypeMenu(false);
            onRequestConvert?.(target);
          } : undefined}
        />
      )}
      {readonly && <span className="text-base flex-shrink-0 mt-0.5">{cfg.icon}</span>}

      <textarea
        ref={textareaRef}
        value={row.content}
        onChange={(e) => onUpdate({ content: e.target.value } as Partial<ContentRow>)}
        onKeyDown={handleKeyDown}
        readOnly={readonly}
        placeholder={row.type === "decision" ? "פרט את ההחלטה..." : "הערה חופשית..."}
        rows={1}
        dir="rtl"
        className={`flex-1 resize-none bg-transparent text-sm focus:outline-none leading-relaxed placeholder:text-gray-300 ${cfg.text}`}
        style={{ minHeight: "1.5rem" }}
      />

      {/* ✕ only on empty rows — non-empty rows use the badge menu to delete */}
      {!readonly && isEmpty && (
        <button
          type="button"
          onClick={onDelete}
          className="text-gray-300 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex-shrink-0 self-start mt-0.5"
          aria-label="מחק שורה"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ── Type badge with context-aware menu ──────────────────────

interface TypeBadgeProps {
  type: RowType;
  showMenu: boolean;
  onToggleMenu: () => void;
  onChangeType: (t: RowType) => void;
  onDelete: () => void;
  /** Provided for text rows only — triggers ConvertDialog */
  onConvert?: (targetType: "decision" | "task") => void;
}

function TypeBadge({
  type,
  showMenu,
  onToggleMenu,
  onChangeType,
  onDelete,
  onConvert,
}: TypeBadgeProps) {
  const cfg = ROW_TYPE_CONFIG[type];
  const isTextRow = type === "text" && Boolean(onConvert);

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={onToggleMenu}
        title={isTextRow ? "המר להחלטה / משימה" : "שנה סוג שורה"}
        className="text-base hover:scale-110 transition-transform"
      >
        {cfg.icon}
      </button>

      {showMenu && (
        <div className="absolute top-full mt-1 right-0 bg-white rounded-xl shadow-xl border border-gray-200 z-20 overflow-hidden min-w-[140px] max-w-[calc(100vw-1rem)]">
          {isTextRow ? (
            /* Text row: show conversion options */
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 bg-gray-50 border-b border-gray-100 uppercase tracking-wide">
                המר ל...
              </div>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onConvert?.("decision"); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-emerald-50 text-right"
              >
                <span>✅</span>
                <span className="font-medium text-emerald-700">החלטה</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onConvert?.("task"); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-orange-50 text-right"
              >
                <span>📌</span>
                <span className="font-medium text-orange-700">משימה</span>
              </button>
              <div className="border-t border-gray-100" />
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onDelete(); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-red-50 text-right text-red-500"
              >
                <span>🗑️</span>
                <span>מחק שורה</span>
              </button>
            </>
          ) : (
            /* Decision / task row: show type-change options */
            <>
              {(Object.entries(ROW_TYPE_CONFIG) as [RowType, typeof ROW_TYPE_CONFIG[RowType]][]).map(
                ([t, c]) => (
                  <button
                    key={t}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); onChangeType(t); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 text-right ${t === type ? "font-bold" : ""}`}
                  >
                    <span>{c.icon}</span>
                    <span>{c.label}</span>
                    {t === type && <span className="mr-auto text-blue-500">✓</span>}
                  </button>
                ),
              )}
              <div className="border-t border-gray-100" />
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onDelete(); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-red-50 text-right text-red-500"
              >
                <span>🗑️</span>
                <span>מחק שורה</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function PriorityChip({ priority }: { priority: MeetingTaskPriority }) {
  const cfg = MEETING_PRIORITY_CONFIG[priority];
  return (
    <span className={`text-xs font-medium ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}
