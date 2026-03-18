"use client";

import { useCallback } from "react";
import type { Task } from "@/types/task";

export function useTaskQueries(tasks: Task[]) {
  const isTaskVisibleForUser = useCallback((task: Task, userId: string) => {
    if (task.createdBy === userId) return true;
    if (!task.startsAt) return true;
    return new Date(task.startsAt) <= new Date();
  }, []);

  const getTaskById = useCallback(
    (id: string) => tasks.find((t) => t.id === id),
    [tasks],
  );

  const getTasksCreatedBy = useCallback(
    (userId: string) => tasks.filter((t) => t.createdBy === userId),
    [tasks],
  );

  const getTasksAssignedTo = useCallback(
    (userId: string) =>
      tasks.filter(
        (t) =>
          t.assignees.some((a) => a.userId === userId) &&
          isTaskVisibleForUser(t, userId),
      ),
    [isTaskVisibleForUser, tasks],
  );

  const getTasksForStore = useCallback(
    (storeId: number) => tasks.filter((t) => t.storeId === storeId),
    [tasks],
  );

  const getTasksPendingApproval = useCallback(
    (userId: string) =>
      tasks.filter((t) => t.createdBy === userId && t.status === "done"),
    [tasks],
  );

  const getOverdueTasks = useCallback(
    (userId: string) =>
      tasks.filter((t) => {
        if (t.status === "approved") return false;
        const isInvolved =
          t.createdBy === userId ||
          t.assignees.some((a) => a.userId === userId);
        if (!isInvolved) return false;
        if (!isTaskVisibleForUser(t, userId)) return false;
        const effectiveDeadline =
          t.expectedCompletionAt &&
          new Date(t.expectedCompletionAt) > new Date(t.dueDate)
            ? t.expectedCompletionAt
            : t.dueDate;
        return new Date(effectiveDeadline) < new Date();
      }),
    [isTaskVisibleForUser, tasks],
  );

  const getUnreadCount = useCallback(
    (userId: string) =>
      tasks.filter((t) =>
        t.assignees.some(
          (a) =>
            a.userId === userId &&
            (a.status === "new" || a.status === "seen") &&
            isTaskVisibleForUser(t, userId),
        ),
      ).length,
    [isTaskVisibleForUser, tasks],
  );

  const getPendingApprovalCount = useCallback(
    (userId: string) =>
      tasks.filter((t) => t.createdBy === userId && t.status === "done").length,
    [tasks],
  );

  return {
    getTaskById,
    getTasksCreatedBy,
    getTasksAssignedTo,
    getTasksForStore,
    getTasksPendingApproval,
    getOverdueTasks,
    getUnreadCount,
    getPendingApprovalCount,
  };
}
