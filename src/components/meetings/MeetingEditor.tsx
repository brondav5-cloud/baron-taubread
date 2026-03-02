"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import { useState, useCallback, useRef } from "react";
import type { MeetingTaskMention, MeetingTaskPriority } from "@/types/meeting";
import { MEETING_PRIORITY_CONFIG } from "@/types/meeting";

interface User {
  id: string;
  name: string;
}

interface MeetingEditorProps {
  content: Record<string, unknown>;
  placeholder?: string;
  agendaItemIndex: number;
  users: User[];
  onUpdate: (json: Record<string, unknown>) => void;
  onTaskCreated: (task: MeetingTaskMention) => void;
  readonly?: boolean;
}

interface TaskFormState {
  visible: boolean;
  userId: string;
  userName: string;
  taskTitle: string;
  dueDate: string;
  priority: MeetingTaskPriority;
}

const EMPTY_FORM: TaskFormState = {
  visible: false,
  userId: "",
  userName: "",
  taskTitle: "",
  dueDate: "",
  priority: "normal",
};

export default function MeetingEditor({
  content,
  placeholder = "כתוב כאן את תוכן הסעיף... (הקלד @ להוספת משימה)",
  agendaItemIndex,
  users,
  onUpdate,
  onTaskCreated,
  readonly = false,
}: MeetingEditorProps) {
  const [taskForm, setTaskForm] = useState<TaskFormState>(EMPTY_FORM);
  const pendingMentionRef = useRef<{ from: number; to: number } | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Mention.configure({
        HTMLAttributes: {
          class: "mention-chip",
        },
        suggestion: {
          items: ({ query }: { query: string }) =>
            users
              .filter((u) =>
                u.name.toLowerCase().includes(query.toLowerCase()),
              )
              .slice(0, 8),
          render: () => {
            let popup: HTMLDivElement | null = null;
            let selectedIndex = 0;

            return {
              onStart: (props: {
                items: User[];
                command: (item: { id: string; label: string }) => void;
                clientRect?: (() => DOMRect | null) | null;
              }) => {
                popup = document.createElement("div");
                popup.className = "mention-dropdown";
                document.body.appendChild(popup);

                const rect = props.clientRect?.();
                if (rect) {
                  popup.style.position = "fixed";
                  popup.style.top = `${rect.bottom + 4}px`;
                  popup.style.left = `${rect.left}px`;
                  popup.style.zIndex = "9999";
                }

                renderDropdown(props.items, selectedIndex, (user) => {
                  props.command({ id: user.id, label: user.name });
                  // Open task form after selecting user
                  setTaskForm({
                    visible: true,
                    userId: user.id,
                    userName: user.name,
                    taskTitle: "",
                    dueDate: new Date(Date.now() + 3 * 86400000)
                      .toISOString()
                      .slice(0, 10),
                    priority: "normal",
                  });
                });
              },
              onUpdate: (props: {
                items: User[];
                command: (item: { id: string; label: string }) => void;
                clientRect?: (() => DOMRect | null) | null;
              }) => {
                if (!popup) return;
                const rect = props.clientRect?.();
                if (rect) {
                  popup.style.top = `${rect.bottom + 4}px`;
                  popup.style.left = `${rect.left}px`;
                }
                renderDropdown(props.items, selectedIndex, (user) => {
                  props.command({ id: user.id, label: user.name });
                  setTaskForm({
                    visible: true,
                    userId: user.id,
                    userName: user.name,
                    taskTitle: "",
                    dueDate: new Date(Date.now() + 3 * 86400000)
                      .toISOString()
                      .slice(0, 10),
                    priority: "normal",
                  });
                });
              },
              onKeyDown: (props: { event: KeyboardEvent }) => {
                if (props.event.key === "Escape") {
                  popup?.remove();
                  return true;
                }
                return false;
              },
              onExit: () => {
                popup?.remove();
                popup = null;
              },
            };

            function renderDropdown(
              items: User[],
              selected: number,
              onSelect: (u: User) => void,
            ) {
              if (!popup) return;
              if (!items.length) {
                popup.innerHTML =
                  '<div class="mention-no-results">לא נמצאו משתמשים</div>';
                return;
              }
              popup.innerHTML = items
                .map(
                  (u, i) =>
                    `<div class="mention-item ${i === selected ? "mention-item-selected" : ""}" data-index="${i}">
                    <span class="mention-avatar">${u.name.charAt(0)}</span>
                    <span>${u.name}</span>
                  </div>`,
                )
                .join("");

              popup.querySelectorAll(".mention-item").forEach((el, i) => {
                el.addEventListener("mousedown", (e) => {
                  e.preventDefault();
                  const item = items[i];
                  if (item) onSelect(item);
                });
              });
            }
          },
        },
      }),
    ],
    content: content && Object.keys(content).length ? content : undefined,
    editable: !readonly,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getJSON() as Record<string, unknown>);
    },
  });

  const handleTaskSubmit = useCallback(() => {
    if (!taskForm.taskTitle.trim()) return;

    const task: MeetingTaskMention = {
      id: `mt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      agendaItemIndex,
      assigneeUserId: taskForm.userId,
      assigneeName: taskForm.userName,
      taskTitle: taskForm.taskTitle.trim(),
      dueDate: taskForm.dueDate,
      priority: taskForm.priority,
      mentionLabel: taskForm.userName,
    };

    onTaskCreated(task);
    setTaskForm(EMPTY_FORM);
    pendingMentionRef.current = null;
  }, [taskForm, agendaItemIndex, onTaskCreated]);

  return (
    <div className="relative">
      <EditorContent
        editor={editor}
        className="meeting-editor"
      />

      {/* Task form popup */}
      {taskForm.visible && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-xl shadow-sm">
          <p className="text-xs font-semibold text-blue-700 mb-2">
            📌 משימה עבור @{taskForm.userName}
          </p>
          <div className="flex flex-col gap-2">
            <input
              autoFocus
              type="text"
              placeholder="תיאור המשימה..."
              value={taskForm.taskTitle}
              onChange={(e) =>
                setTaskForm((f) => ({ ...f, taskTitle: e.target.value }))
              }
              onKeyDown={(e) => e.key === "Enter" && handleTaskSubmit()}
              className="w-full text-sm border border-blue-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={taskForm.dueDate}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, dueDate: e.target.value }))
                }
                className="text-sm border border-blue-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <select
                value={taskForm.priority}
                onChange={(e) =>
                  setTaskForm((f) => ({
                    ...f,
                    priority: e.target.value as MeetingTaskPriority,
                  }))
                }
                className="text-sm border border-blue-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {(
                  Object.entries(MEETING_PRIORITY_CONFIG) as [
                    MeetingTaskPriority,
                    (typeof MEETING_PRIORITY_CONFIG)[MeetingTaskPriority],
                  ][]
                ).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.icon} {v.label}
                  </option>
                ))}
              </select>
              <div className="flex gap-1 mr-auto">
                <button
                  onClick={handleTaskSubmit}
                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium"
                >
                  הוסף
                </button>
                <button
                  onClick={() => setTaskForm(EMPTY_FORM)}
                  className="text-xs text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
