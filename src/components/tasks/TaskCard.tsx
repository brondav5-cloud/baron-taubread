"use client";

import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import {
  ChevronLeft,
  ClipboardList,
  Check,
  Clock,
  Users,
  FileText,
} from "lucide-react";
import { clsx } from "clsx";
import type { Task } from "@/types/task";
import {
  TaskStatusBadge,
  TaskPriorityBadge,
  TaskCategoryBadge,
  OverdueBadge,
} from "./TaskBadges";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  variant?: "assigned" | "created" | "pending";
}

export function TaskCard({
  task,
  onClick,
  variant = "assigned",
}: TaskCardProps) {
  const timeAgo = formatDistanceToNow(new Date(task.createdAt), {
    addSuffix: true,
    locale: he,
  });

  const completedChecklist = task.checklist.filter(
    (item) => item.completed,
  ).length;
  const totalChecklist = task.checklist.length;
  const hasComments = task.comments.length > 0;
  const hasMultipleAssignees = task.assignees.length > 1;
  const primaryAssignee = task.assignees.find((a) => a.role === "primary");
  const assigneeNames = task.assignees.map((a) => a.userName).join(", ");

  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full text-right bg-white rounded-xl border p-4 transition-all",
        "hover:shadow-md hover:border-primary-200",
        task.status === "new" &&
          variant === "assigned" &&
          "border-blue-300 bg-blue-50/30",
      )}
    >
      {/* Header: Priority + Category + Status */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <TaskPriorityBadge priority={task.priority} size="sm" />
          <TaskCategoryBadge
            icon={task.categoryIcon}
            name={task.categoryName}
            size="sm"
          />
          {task.taskType === "general" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs">
              <FileText className="w-3 h-3" />
              כללי
            </span>
          )}
          <OverdueBadge dueDate={task.dueDate} status={task.status} />
        </div>
        <TaskStatusBadge status={task.status} size="sm" />
      </div>

      {/* Store Name or General Task */}
      <p className="text-xs text-gray-500 mb-1">
        {task.taskType === "store" && task.storeName
          ? task.storeName
          : "משימה כללית"}
      </p>

      {/* Title */}
      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
        {task.title}
      </h3>

      {/* Description Preview */}
      {task.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Multiple Assignees Progress */}
      {hasMultipleAssignees && (
        <div className="flex items-center gap-2 text-xs mb-2">
          <Users className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-gray-600">
            {task.assignees.filter((a) => a.status === "done").length}/
            {task.assignees.length} סיימו
          </span>
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{
                width: `${(task.assignees.filter((a) => a.status === "done").length / task.assignees.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Footer: Meta Info */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          {/* Time */}
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {timeAgo}
          </span>

          {/* Comments Count */}
          {hasComments && (
            <span className="flex items-center gap-1">
              <ClipboardList className="w-3.5 h-3.5" />
              {task.comments.length}
            </span>
          )}

          {/* Checklist Progress */}
          {totalChecklist > 0 && (
            <span className="flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              {completedChecklist}/{totalChecklist}
            </span>
          )}
        </div>

        {/* Creator/Assignee Info */}
        <div className="flex items-center gap-1">
          <span>
            {variant === "assigned"
              ? `מ: ${task.createdByName}`
              : `ל: ${hasMultipleAssignees ? `${task.assignees.length} אנשים` : primaryAssignee?.userName || assigneeNames}`}
          </span>
          <ChevronLeft className="w-4 h-4" />
        </div>
      </div>

      {/* Pending Approval Indicator */}
      {variant === "pending" && task.status === "done" && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <span>✅</span>
            <span>ממתין לאישורך</span>
          </div>
          {task.handlerResponse && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-1">
              תגובה: {task.handlerResponse}
            </p>
          )}
        </div>
      )}
    </button>
  );
}
