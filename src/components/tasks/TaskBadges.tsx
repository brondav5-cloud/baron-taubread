"use client";

import { clsx } from "clsx";
import { TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG } from "@/types/task";
import type { TaskStatus, TaskPriority } from "@/types/task";

// ============================================
// STATUS BADGE
// ============================================

interface TaskStatusBadgeProps {
  status: TaskStatus;
  size?: "sm" | "md";
  showIcon?: boolean;
}

export function TaskStatusBadge({
  status,
  size = "md",
  showIcon = true,
}: TaskStatusBadgeProps) {
  const config = TASK_STATUS_CONFIG[status];

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full font-medium",
        config.bgColor,
        config.color,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
      )}
    >
      {showIcon && <span>{config.icon}</span>}
      <span>{config.label}</span>
    </span>
  );
}

// ============================================
// PRIORITY BADGE
// ============================================

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
  size?: "sm" | "md";
  showIcon?: boolean;
}

export function TaskPriorityBadge({
  priority,
  size = "md",
  showIcon = true,
}: TaskPriorityBadgeProps) {
  const config = TASK_PRIORITY_CONFIG[priority];

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full font-medium",
        config.bgColor,
        config.color,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
      )}
    >
      {showIcon && <span>{config.icon}</span>}
      <span>{config.label}</span>
    </span>
  );
}

// ============================================
// CATEGORY BADGE
// ============================================

interface TaskCategoryBadgeProps {
  icon: string;
  name: string;
  size?: "sm" | "md";
}

export function TaskCategoryBadge({
  icon,
  name,
  size = "md",
}: TaskCategoryBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full font-medium",
        "bg-gray-100 text-gray-700",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
      )}
    >
      <span>{icon}</span>
      <span>{name}</span>
    </span>
  );
}

// ============================================
// OVERDUE BADGE
// ============================================

interface OverdueBadgeProps {
  dueDate: string;
  status: TaskStatus;
}

export function OverdueBadge({ dueDate, status }: OverdueBadgeProps) {
  if (status === "approved") return null;

  const isOverdue = new Date(dueDate) < new Date();
  if (!isOverdue) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">
      <span>⏰</span>
      <span>באיחור</span>
    </span>
  );
}
