import type { MeetingTaskPriority } from "@/types/meeting";

export interface EditorUser {
  id: string;
  name: string;
}

export interface TextRow {
  id: string;
  type: "text";
  content: string;
}

export interface DecisionRow {
  id: string;
  type: "decision";
  content: string;
}

export interface TaskRow {
  id: string;
  type: "task";
  content: string;
  assigneeIds: string[];
  assigneeNames: string[];
  dueDate: string;
  priority: MeetingTaskPriority;
}

export type ContentRow = TextRow | DecisionRow | TaskRow;

export interface TopicBlock {
  id: string;
  type: "topic";
  title: string;
  rows: ContentRow[];
}

export type RowType = ContentRow["type"];

export const ROW_TYPE_CONFIG: Record<
  RowType,
  { icon: string; label: string; border: string; bg: string; text: string }
> = {
  text: {
    icon: "💬",
    label: "הערה",
    border: "border-gray-200",
    bg: "bg-white",
    text: "text-gray-700",
  },
  decision: {
    icon: "✅",
    label: "החלטה",
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
  },
  task: {
    icon: "📌",
    label: "משימה",
    border: "border-orange-200",
    bg: "bg-orange-50",
    text: "text-orange-800",
  },
};
