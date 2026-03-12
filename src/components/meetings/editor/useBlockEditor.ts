import { useCallback } from "react";
import type {
  TopicBlock,
  ContentRow,
  RowType,
  TaskRow,
} from "./types";
import type { MeetingTaskPriority } from "@/types/meeting";
import { defaultDue } from "./blockSerializer";

let _cnt = 0;
const uid = () => `row_${Date.now()}_${++_cnt}`;

function emptyRow(type: RowType): ContentRow {
  if (type === "task") {
    const row: TaskRow = {
      id: uid(),
      type: "task",
      content: "",
      assigneeIds: [],
      assigneeNames: [],
      dueDate: defaultDue(),
      priority: "normal" as MeetingTaskPriority,
    };
    return row;
  }
  return { id: uid(), type, content: "" };
}

type SetTopics = (fn: (prev: TopicBlock[]) => TopicBlock[]) => void;

export function useBlockEditor(setTopics: SetTopics) {
  const addTopic = useCallback(() => {
    setTopics((prev) => [
      ...prev,
      {
        id: uid(),
        type: "topic",
        title: "",
        rows: [{ id: uid(), type: "text", content: "" }],
      },
    ]);
  }, [setTopics]);

  const updateTopicTitle = useCallback(
    (topicId: string, title: string) => {
      setTopics((prev) =>
        prev.map((t) => (t.id === topicId ? { ...t, title } : t)),
      );
    },
    [setTopics],
  );

  const deleteTopic = useCallback(
    (topicId: string) => {
      setTopics((prev) =>
        prev.length > 1 ? prev.filter((t) => t.id !== topicId) : prev,
      );
    },
    [setTopics],
  );

  const addRow = useCallback(
    (topicId: string, type: RowType, afterRowId?: string): string => {
      const newRow = emptyRow(type);
      setTopics((prev) =>
        prev.map((t) => {
          if (t.id !== topicId) return t;
          if (!afterRowId) return { ...t, rows: [...t.rows, newRow] };
          const idx = t.rows.findIndex((r) => r.id === afterRowId);
          const rows = [...t.rows];
          rows.splice(idx + 1, 0, newRow);
          return { ...t, rows };
        }),
      );
      return newRow.id;
    },
    [setTopics],
  );

  const updateRow = useCallback(
    (topicId: string, rowId: string, updates: Partial<ContentRow>) => {
      setTopics((prev) =>
        prev.map((t) => {
          if (t.id !== topicId) return t;
          return {
            ...t,
            rows: t.rows.map((r) =>
              r.id === rowId ? ({ ...r, ...updates } as ContentRow) : r,
            ),
          };
        }),
      );
    },
    [setTopics],
  );

  const deleteRow = useCallback(
    (topicId: string, rowId: string) => {
      setTopics((prev) =>
        prev.map((t) => {
          if (t.id !== topicId) return t;
          if (t.rows.length <= 1) {
            return { ...t, rows: [emptyRow("text")] };
          }
          return { ...t, rows: t.rows.filter((r) => r.id !== rowId) };
        }),
      );
    },
    [setTopics],
  );

  // Insert a fully-populated row immediately after an existing row
  const insertRowAfter = useCallback(
    (topicId: string, afterRowId: string, rowData: Omit<ContentRow, "id">) => {
      const newRow = { ...rowData, id: uid() } as ContentRow;
      setTopics((prev) =>
        prev.map((t) => {
          if (t.id !== topicId) return t;
          const idx = t.rows.findIndex((r) => r.id === afterRowId);
          const rows = [...t.rows];
          rows.splice(idx + 1, 0, newRow);
          return { ...t, rows };
        }),
      );
    },
    [setTopics],
  );

  const changeRowType = useCallback(
    (topicId: string, rowId: string, newType: RowType) => {
      setTopics((prev) =>
        prev.map((t) => {
          if (t.id !== topicId) return t;
          return {
            ...t,
            rows: t.rows.map((r) => {
              if (r.id !== rowId) return r;
              if (newType === "task") {
                const tr: TaskRow = {
                  id: r.id,
                  type: "task",
                  content: r.content,
                  assigneeIds: [],
                  assigneeNames: [],
                  dueDate: defaultDue(),
                  priority: "normal",
                };
                return tr;
              }
              return { id: r.id, type: newType, content: r.content };
            }),
          };
        }),
      );
    },
    [setTopics],
  );

  return {
    addTopic,
    updateTopicTitle,
    deleteTopic,
    addRow,
    updateRow,
    deleteRow,
    changeRowType,
    insertRowAfter,
  };
}
