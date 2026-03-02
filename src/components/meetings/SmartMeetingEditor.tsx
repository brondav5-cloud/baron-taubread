"use client";

/**
 * SmartMeetingEditor — a single textarea that auto-extracts:
 *  • Lines starting with "החלטה:" or "✅" → Decisions panel
 *  • Lines containing "@Name ..." → Tasks panel
 *
 * @mention UX: type @ → dropdown appears → select user → inserts "@Name "
 * Task parsing: "@Name [title] עד [DD/MM]"
 */

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import type { MeetingTaskMention, MeetingTaskPriority } from "@/types/meeting";
import { MEETING_PRIORITY_CONFIG } from "@/types/meeting";
import { parseContent } from "./meetingParser";
import type { ParsedDecision, ParsedTask } from "./meetingParser";
export type { ParsedDecision, ParsedTask } from "./meetingParser";

interface User {
  id: string;
  name: string;
}

interface SmartMeetingEditorProps {
  value: string;
  onChange: (text: string) => void;
  users: User[];
  onDecisionsChange: (decisions: ParsedDecision[]) => void;
  onTasksChange: (tasks: ParsedTask[]) => void;
  placeholder?: string;
  readonly?: boolean;
}


// ── @mention dropdown ────────────────────────────────────────
interface MentionState {
  active: boolean;
  query: string;
  atIndex: number; // position of @ in textarea
}

export default function SmartMeetingEditor({
  value,
  onChange,
  users,
  onDecisionsChange,
  onTasksChange,
  placeholder = "כתוב חופשי...\n\nהחלטה: [טקסט] ← יופיע בתיבת החלטות\n@שם [משימה] עד [תאריך] ← יופיע בתיבת משימות",
  readonly = false,
}: SmartMeetingEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mention, setMention] = useState<MentionState>({
    active: false,
    query: "",
    atIndex: -1,
  });

  // Filtered users for dropdown
  const filteredUsers = useMemo(
    () =>
      mention.active
        ? users
            .filter((u) =>
              u.name.toLowerCase().includes(mention.query.toLowerCase()),
            )
            .slice(0, 6)
        : [],
    [mention.active, mention.query, users],
  );

  // Parse content and notify parents
  useEffect(() => {
    const { decisions, tasks } = parseContent(value, users);
    onDecisionsChange(decisions);
    onTasksChange(tasks);
  }, [value, users, onDecisionsChange, onTasksChange]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newVal = e.target.value;
      onChange(newVal);

      // Detect @mention trigger
      const cursor = e.target.selectionStart ?? 0;
      const textBefore = newVal.slice(0, cursor);
      const lastAt = textBefore.lastIndexOf("@");

      if (lastAt !== -1) {
        const afterAt = textBefore.slice(lastAt + 1);
        // No spaces — still in the middle of a mention
        if (!afterAt.includes(" ") && !afterAt.includes("\n")) {
          setMention({ active: true, query: afterAt, atIndex: lastAt });
          return;
        }
      }
      setMention({ active: false, query: "", atIndex: -1 });
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (mention.active && e.key === "Escape") {
        setMention({ active: false, query: "", atIndex: -1 });
        return;
      }
      if (mention.active && e.key === "Enter" && filteredUsers.length === 1) {
        e.preventDefault();
        insertMention(filteredUsers[0]!);
      }
    },
    [mention.active, filteredUsers],
  );

  const insertMention = useCallback(
    (user: User) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const before = value.slice(0, mention.atIndex);
      const after = value.slice(ta.selectionStart ?? mention.atIndex);
      const inserted = `@${user.name} `;
      const newVal = before + inserted + after;
      onChange(newVal);
      setMention({ active: false, query: "", atIndex: -1 });

      // Restore cursor after the inserted mention
      setTimeout(() => {
        const pos = mention.atIndex + inserted.length;
        ta.setSelectionRange(pos, pos);
        ta.focus();
      }, 0);
    },
    [value, mention.atIndex, onChange],
  );

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.max(200, ta.scrollHeight)}px`;
  }, [value]);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        readOnly={readonly}
        placeholder={placeholder}
        dir="rtl"
        className="w-full resize-none border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 leading-7 bg-white font-inherit"
        style={{ minHeight: 200, lineHeight: "1.8" }}
      />

      {/* @mention dropdown */}
      {mention.active && filteredUsers.length > 0 && (
        <div className="absolute right-0 left-0 mx-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
             style={{ top: "calc(100% + 4px)" }}>
          <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-xs text-gray-400 font-medium">
            בחר משתמש לשיוך משימה
          </div>
          {filteredUsers.map((u) => (
            <button
              key={u.id}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(u);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-right transition-colors"
            >
              <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                {u.name.charAt(0)}
              </span>
              <span className="text-sm font-medium text-gray-800">{u.name}</span>
              <span className="text-xs text-gray-400 mr-auto">משימה חדשה</span>
            </button>
          ))}
          {mention.query && filteredUsers.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-400">לא נמצאו משתמשים</div>
          )}
        </div>
      )}

      {/* Hint line */}
      {!readonly && (
        <div className="mt-2 space-y-1">
          <div className="flex gap-3 text-xs text-gray-400 flex-wrap">
            <span>
              <span className="font-semibold text-emerald-600">החלטה:</span>{" "}
              [טקסט] — תיבת החלטות
            </span>
            <span>
              <span className="font-semibold text-orange-500">@שם</span>{" "}
              [משימה]{" "}
              <span className="font-semibold text-orange-400">עד DD/MM</span>{" "}
              — תיבת משימות
            </span>
            <span>
              <span className="font-semibold text-emerald-600">✅</span>{" "}
              [טקסט] — גם החלטה
            </span>
          </div>
          <div className="text-xs text-indigo-500 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1 inline-block">
            💡 <span className="font-semibold">החלטה + הקצאה:</span>{" "}
            <code className="bg-white px-1 rounded">
              החלטה: [טקסט] @שם עד DD/MM
            </code>{" "}
            — נכנס גם לשתי התיבות
          </div>
        </div>
      )}
    </div>
  );
}

// ── Live panels ──────────────────────────────────────────────

interface DecisionsPanelProps {
  decisions: ParsedDecision[];
}

export function DecisionsPanel({ decisions }: DecisionsPanelProps) {
  if (!decisions.length) return null;
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
      <h3 className="font-semibold text-emerald-800 mb-2 flex items-center gap-2 text-sm">
        ✅ החלטות שהתקבלו
        <span className="bg-emerald-200 text-emerald-800 text-xs px-1.5 py-0.5 rounded-full font-bold">
          {decisions.length}
        </span>
      </h3>
      <ul className="space-y-1.5">
        {decisions.map((d) => (
          <li key={d.id} className="flex items-start gap-2 text-sm text-emerald-900">
            <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>
            <span>{d.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface TasksPanelProps {
  tasks: ParsedTask[];
  onPriorityChange?: (taskId: string, priority: MeetingTaskPriority) => void;
  onDueDateChange?: (taskId: string, date: string) => void;
}

export function TasksPanel({ tasks, onPriorityChange, onDueDateChange }: TasksPanelProps) {
  if (!tasks.length) return null;
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
      <h3 className="font-semibold text-orange-800 mb-2 flex items-center gap-2 text-sm">
        📌 משימות שהוקצו
        <span className="bg-orange-200 text-orange-800 text-xs px-1.5 py-0.5 rounded-full font-bold">
          {tasks.length}
        </span>
      </h3>
      <div className="space-y-2">
        {tasks.map((t) => {
          const isOverdue = t.dueDate && new Date(t.dueDate) < new Date();
          return (
            <div
              key={t.id}
              className="flex items-center gap-3 bg-white rounded-xl px-3 py-2 border border-orange-100"
            >
              <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                {t.userName.charAt(0)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                <p className="text-xs text-gray-500">@{t.userName}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {onDueDateChange ? (
                  <input
                    type="date"
                    value={t.dueDate}
                    onChange={(e) => onDueDateChange(t.id, e.target.value)}
                    className={`text-xs border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-300 ${
                      isOverdue
                        ? "border-red-300 bg-red-50 text-red-600"
                        : "border-orange-200 bg-white text-gray-600"
                    }`}
                  />
                ) : (
                  t.dueDate && (
                    <span
                      className={`text-xs font-medium ${
                        isOverdue ? "text-red-600" : "text-gray-500"
                      }`}
                    >
                      {isOverdue ? "⚠️ " : ""}
                      {new Date(t.dueDate).toLocaleDateString("he-IL")}
                    </span>
                  )
                )}
                {onPriorityChange ? (
                  <select
                    value={t.priority}
                    onChange={(e) =>
                      onPriorityChange(t.id, e.target.value as MeetingTaskPriority)
                    }
                    className="text-xs border border-orange-200 rounded-lg px-1.5 py-1 bg-white focus:outline-none"
                  >
                    {(Object.entries(MEETING_PRIORITY_CONFIG) as [MeetingTaskPriority, typeof MEETING_PRIORITY_CONFIG[MeetingTaskPriority]][]).map(
                      ([k, v]) => (
                        <option key={k} value={k}>
                          {v.icon} {v.label}
                        </option>
                      ),
                    )}
                  </select>
                ) : (
                  <span>{MEETING_PRIORITY_CONFIG[t.priority].icon}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Converter: ParsedTask → MeetingTaskMention ───────────────
export function parsedTaskToMention(t: ParsedTask): MeetingTaskMention {
  return {
    id: t.id,
    agendaItemIndex: 0,
    assigneeUserId: t.userId,
    assigneeName: t.userName,
    taskTitle: t.title,
    dueDate: t.dueDate,
    priority: t.priority,
    mentionLabel: t.userName,
  };
}
