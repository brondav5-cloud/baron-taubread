"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { TopicBlock, ContentRow, EditorUser, RowType, TaskRow } from "./editor/types";
import { textToBlocks, blocksToText } from "./editor/blockSerializer";
import { useBlockEditor } from "./editor/useBlockEditor";
import TopicBlockComponent from "./editor/TopicBlock";
import TaskSheet, { type TaskSheetData } from "./editor/TaskSheet";
import BlockToolbar from "./editor/BlockToolbar";
import ConvertDialog, { type ConvertResult } from "./editor/ConvertDialog";
import type { ParsedDecision, ParsedTask } from "./meetingParser";
export type { ParsedDecision, ParsedTask } from "./meetingParser";
import type { MeetingTaskMention, MeetingTaskPriority } from "@/types/meeting";
import { MEETING_PRIORITY_CONFIG } from "@/types/meeting";

// ── Props ───────────────────────────────────────────────────

interface SmartMeetingEditorProps {
  value: string;
  onChange: (text: string) => void;
  users: EditorUser[];
  onDecisionsChange: (decisions: ParsedDecision[]) => void;
  onTasksChange: (tasks: ParsedTask[]) => void;
  placeholder?: string;
  readonly?: boolean;
}

// ── Task sheet state ────────────────────────────────────────

interface TaskSheetState {
  topicId: string;
  rowId: string | null; // null = new task
  row?: Partial<TaskRow>;
}

// ── Main component ──────────────────────────────────────────

export default function SmartMeetingEditor({
  value,
  onChange,
  users,
  onDecisionsChange,
  onTasksChange,
  readonly = false,
}: SmartMeetingEditorProps) {
  // Lazy init blocks from text (once on mount)
  const valueRef = useRef(value);
  const [topics, setTopicsRaw] = useState<TopicBlock[]>(() =>
    textToBlocks(valueRef.current, users),
  );

  // Re-init once when users load (edit mode: users arrive after first render)
  const usersInitRef = useRef(users.length > 0);
  useEffect(() => {
    if (!usersInitRef.current && users.length > 0) {
      usersInitRef.current = true;
      if (valueRef.current.trim()) {
        setTopicsRaw(textToBlocks(valueRef.current, users));
      }
    }
  }, [users]);

  const setTopics = useCallback(
    (fn: (prev: TopicBlock[]) => TopicBlock[]) => setTopicsRaw(fn),
    [],
  );

  const editor = useBlockEditor(setTopics);

  // Task sheet
  const [taskSheet, setTaskSheet] = useState<TaskSheetState | null>(null);

  // Convert dialog (text row → decision / task)
  const [convertDialog, setConvertDialog] = useState<{
    topicId: string;
    rowId: string;
    originalText: string;
  } | null>(null);

  // Sync blocks → text + decisions/tasks whenever blocks change
  useEffect(() => {
    const text = blocksToText(topics);
    onChange(text);

    const decisions: ParsedDecision[] = [];
    const tasks: ParsedTask[] = [];
    let idx = 0;
    for (const topic of topics) {
      for (const row of topic.rows) {
        if (row.type === "decision" && row.content.trim()) {
          decisions.push({ id: `dec_${row.id}`, text: row.content, lineIndex: idx });
        } else if (row.type === "task" && row.assigneeId) {
          tasks.push({
            id: row.id,
            userId: row.assigneeId,
            userName: row.assigneeName,
            title: row.content,
            dueDate: row.dueDate,
            priority: row.priority,
            lineIndex: idx,
          });
        }
        idx++;
      }
    }
    onDecisionsChange(decisions);
    onTasksChange(tasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics]);

  // ── TaskSheet handlers ────────────────────────────────────

  const openTaskSheet = useCallback(
    (topicId: string, rowId: string | null, row?: Partial<TaskRow>) => {
      setTaskSheet({ topicId, rowId, row });
    },
    [],
  );

  const handleTaskConfirm = useCallback(
    (data: TaskSheetData) => {
      if (!taskSheet) return;
      const { topicId, rowId } = taskSheet;
      if (rowId) {
        // Editing existing task row
        editor.updateRow(topicId, rowId, data as Partial<ContentRow>);
      } else {
        // Adding new task row
        editor.addRow(topicId, "task");
        // Update the just-added row (last one)
        setTopicsRaw((prev) =>
          prev.map((t) => {
            if (t.id !== topicId) return t;
            const last = t.rows[t.rows.length - 1];
            if (!last) return t;
            return {
              ...t,
              rows: t.rows.map((r) =>
                r.id === last.id
                  ? ({ ...r, ...data } as ContentRow)
                  : r,
              ),
            };
          }),
        );
      }
      setTaskSheet(null);
    },
    [taskSheet, editor],
  );

  // ── ConvertDialog handler ─────────────────────────────────

  const handleConvertConfirm = useCallback(
    (result: ConvertResult) => {
      if (!convertDialog) return;
      const { topicId, rowId } = convertDialog;
      if (result.type === "decision") {
        editor.updateRow(topicId, rowId, { type: "decision", content: result.content } as Partial<ContentRow>);
      } else if (result.type === "task" && result.taskData) {
        editor.updateRow(topicId, rowId, {
          type: "task",
          content: result.content,
          assigneeId: result.taskData.assigneeId,
          assigneeName: result.taskData.assigneeName,
          dueDate: result.taskData.dueDate,
          priority: result.taskData.priority,
        } as Partial<ContentRow>);
      }
      setConvertDialog(null);
    },
    [convertDialog, editor],
  );

  // ── Mobile toolbar handler ────────────────────────────────

  const handleToolbarAdd = useCallback(
    (type: RowType | "topic") => {
      if (type === "topic") {
        editor.addTopic();
        return;
      }
      const lastTopic = topics[topics.length - 1];
      if (!lastTopic) return;
      if (type === "task") {
        openTaskSheet(lastTopic.id, null);
      } else {
        editor.addRow(lastTopic.id, type);
      }
    },
    [topics, editor, openTaskSheet],
  );

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="relative" dir="rtl">
      <div className={`space-y-3 ${!readonly ? "pb-20 md:pb-0" : ""}`}>
        {topics.map((topic) => (
          <TopicBlockComponent
            key={topic.id}
            topic={topic}
            users={users}
            readonly={readonly}
            canDelete={topics.length > 1}
            onTitleChange={(title) => editor.updateTopicTitle(topic.id, title)}
            onDelete={() => editor.deleteTopic(topic.id)}
            onAddRow={(type, afterRowId) => {
              if (type === "task") {
                openTaskSheet(topic.id, null);
              } else {
                editor.addRow(topic.id, type, afterRowId);
              }
            }}
            onUpdateRow={(rowId, updates) =>
              editor.updateRow(topic.id, rowId, updates)
            }
            onDeleteRow={(rowId) => editor.deleteRow(topic.id, rowId)}
            onChangeRowType={(rowId, newType) => {
              if (newType === "task") {
                editor.changeRowType(topic.id, rowId, "task");
                openTaskSheet(topic.id, rowId);
              } else {
                editor.changeRowType(topic.id, rowId, newType);
              }
            }}
            onRequestTaskEdit={(rowId) => {
              const row = topic.rows.find((r) => r.id === rowId);
              openTaskSheet(topic.id, rowId, row as Partial<TaskRow>);
            }}
            onRequestConvert={(rowId) => {
              const row = topic.rows.find((r) => r.id === rowId);
              setConvertDialog({
                topicId: topic.id,
                rowId,
                originalText: row?.content ?? "",
              });
            }}
          />
        ))}

        {/* Add topic button (desktop) */}
        {!readonly && (
          <button
            type="button"
            onClick={editor.addTopic}
            className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-indigo-200 text-indigo-500 text-sm hover:bg-indigo-50 hover:border-indigo-400 transition-colors w-full justify-center"
          >
            <span>📋</span>
            <span>+ הוסף נושא חדש</span>
          </button>
        )}
      </div>

      {/* Mobile toolbar */}
      {!readonly && <BlockToolbar onAdd={handleToolbarAdd} />}

      {/* Task sheet */}
      <TaskSheet
        open={taskSheet !== null}
        task={taskSheet?.row}
        users={users}
        onConfirm={handleTaskConfirm}
        onClose={() => setTaskSheet(null)}
      />

      {/* Convert dialog */}
      <ConvertDialog
        open={convertDialog !== null}
        originalText={convertDialog?.originalText ?? ""}
        users={users}
        onConfirm={handleConvertConfirm}
        onClose={() => setConvertDialog(null)}
      />
    </div>
  );
}

// ── DecisionsPanel (re-exported for MeetingForm summary) ───

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

// ── TasksPanel (re-exported for MeetingForm summary) ────────

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
          const priorityCfg = MEETING_PRIORITY_CONFIG[t.priority];
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
                      isOverdue ? "border-red-300 bg-red-50 text-red-600" : "border-orange-200 bg-white text-gray-600"
                    }`}
                  />
                ) : (
                  t.dueDate && (
                    <span className={`text-xs font-medium ${isOverdue ? "text-red-600" : "text-gray-500"}`}>
                      {isOverdue ? "⚠️ " : ""}
                      {new Date(t.dueDate + "T00:00:00").toLocaleDateString("he-IL")}
                    </span>
                  )
                )}
                {onPriorityChange ? (
                  <select
                    value={t.priority}
                    onChange={(e) => onPriorityChange(t.id, e.target.value as MeetingTaskPriority)}
                    className="text-xs border border-orange-200 rounded-lg px-1.5 py-1 bg-white focus:outline-none"
                  >
                    {(Object.entries(MEETING_PRIORITY_CONFIG) as [MeetingTaskPriority, typeof MEETING_PRIORITY_CONFIG[MeetingTaskPriority]][]).map(
                      ([k, v]) => (
                        <option key={k} value={k}>{v.icon} {v.label}</option>
                      ),
                    )}
                  </select>
                ) : (
                  <span>{priorityCfg.icon}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── parsedTaskToMention (re-exported for MeetingForm) ───────

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
