"use client";

import { useCallback } from "react";
import type { Task } from "@/types/task";

export function useTaskQueries(tasks: Task[]) {
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
      tasks.filter((t) => t.assignees.some((a) => a.userId === userId)),
    [tasks],
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
        return new Date(t.dueDate) < new Date();
      }),
    [tasks],
  );

  const getUnreadCount = useCallback(
    (userId: string) =>
      tasks.filter((t) =>
        t.assignees.some(
          (a) =>
            a.userId === userId && (a.status === "new" || a.status === "seen"),
        ),
      ).length,
    [tasks],
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
