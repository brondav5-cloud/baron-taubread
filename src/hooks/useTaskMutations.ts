"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { Task, TaskStatus, TaskPriority } from "@/types/task";
import { generateHistoryId, calculateDueDate } from "@/types/task";
import {
  insertTask,
  updateTask,
  deleteSingleTask,
} from "@/lib/supabase/tasks.queries";
import { dbTaskToTask, taskToDbTask } from "@/lib/supabase/tasks.mappers";
import { sendNotification } from "@/lib/notifications/notify";

export interface CreateTaskInput {
  taskType: "store" | "general";
  storeId?: number;
  storeName?: string;
  visitId?: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  priority: TaskPriority;
  title: string;
  description: string;
  assignees: {
    userId: string;
    userName: string;
    role: "primary" | "secondary";
  }[];
  photos?: string[];
  checklist?: { text: string }[];
  dueDate?: string;
  notifyEmail?: boolean;
  notifySms?: boolean;
  isPrivate?: boolean;
  startsAt?: string;
}

export function useTaskMutations(
  companyId: string | null,
  setTasks: Dispatch<SetStateAction<Task[]>>,
) {
  const createTask = useCallback(
    (
      input: CreateTaskInput,
      createdBy: string,
      createdByName: string,
    ): Task => {
      const now = new Date().toISOString();
      const newTask: Omit<Task, "id"> & { id: string } = {
        id: "",
        taskType: input.taskType,
        createdBy,
        createdByName,
        createdAt: now,
        updatedAt: now,
        assignees: input.assignees.map((a) => ({
          ...a,
          status: "new" as TaskStatus,
        })),
        visitId: input.visitId,
        storeId: input.storeId,
        storeName: input.storeName,
        categoryId: input.categoryId,
        categoryName: input.categoryName,
        categoryIcon: input.categoryIcon,
        priority: input.priority,
        title: input.title,
        description: input.description,
        photos: input.photos || [],
        status: "new",
        checklist: (input.checklist || []).map((item, i) => ({
          id: `checklist_${Date.now()}_${i}`,
          text: item.text,
          completed: false,
        })),
        comments: [],
        history: [
          {
            id: generateHistoryId(),
            action: "created",
            userId: createdBy,
            userName: createdByName,
            timestamp: now,
            details: "המשימה נוצרה",
          },
        ],
        handlerPhotos: [],
        dueDate: input.dueDate || calculateDueDate(input.priority),
        isPrivate: input.isPrivate ?? false,
        startsAt: input.startsAt,
        expectedCompletionAt: undefined,
        progressUpdates: [],
      };
      if (companyId) {
        const insertRow = taskToDbTask(newTask, companyId);
        insertTask(insertRow).then(({ data, error }) => {
          if (!error && data) {
            const created = dbTaskToTask(data);
            setTasks((prev) => [created, ...prev]);

            const recipientIds = input.assignees
              .map((a) => a.userId)
              .filter((id) => id !== createdBy);
            const shouldNotifyNow =
              !created.startsAt || new Date(created.startsAt) <= new Date();
            if (recipientIds.length > 0 && shouldNotifyNow) {
              sendNotification({
                recipientUserIds: recipientIds,
                type: "task_assigned",
                title: "משימה חדשה הוקצתה לך",
                body: `${createdByName}: ${input.title}`,
                url: `/dashboard/tasks`,
                referenceId: created.id,
                referenceType: "task",
                sendEmail: input.notifyEmail,
                sendSms: input.notifySms,
              });
            }
          }
        });
        return { ...newTask, id: `pending_${Date.now()}` } as Task;
      }
      return newTask as Task;
    },
    [companyId, setTasks],
  );

  const updateExpectedCompletion = useCallback(
    (taskId: string, userId: string, userName: string, expectedCompletionAt: string) => {
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== taskId) return task;
          const assignee = task.assignees.find((a) => a.userId === userId);
          if (!assignee) return task;

          const originalTask = task;
          const updated = {
            ...task,
            expectedCompletionAt,
            updatedAt: now,
            history: [
              ...task.history,
              {
                id: generateHistoryId(),
                action: "eta_updated" as const,
                userId,
                userName,
                timestamp: now,
                details: "עודכן יעד סיום",
              },
            ],
          };
          if (companyId) {
            const u = taskToDbTask(updated, companyId);
            updateTask(taskId, {
              expected_completion_at: u.expected_completion_at,
              updated_at: now,
              history: u.history,
            }).then((success) => {
              if (!success)
                setTasks((tasks) => tasks.map((t) => (t.id === taskId ? originalTask : t)));
            });
          }
          return updated;
        }),
      );
    },
    [companyId, setTasks],
  );

  const addProgressUpdate = useCallback(
    (
      taskId: string,
      userId: string,
      userName: string,
      text: string,
      expectedCompletionAt?: string,
    ) => {
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== taskId) return task;
          const assignee = task.assignees.find((a) => a.userId === userId);
          if (!assignee) return task;

          const originalTask = task;
          const updated = {
            ...task,
            expectedCompletionAt: expectedCompletionAt || task.expectedCompletionAt,
            progressUpdates: [
              ...task.progressUpdates,
              {
                id: `progress_${Date.now()}`,
                userId,
                userName,
                text,
                createdAt: now,
                expectedCompletionAt: expectedCompletionAt || task.expectedCompletionAt,
              },
            ],
            updatedAt: now,
            history: [
              ...task.history,
              {
                id: generateHistoryId(),
                action: "progress_updated" as const,
                userId,
                userName,
                timestamp: now,
                details: "עודכן סטטוס התקדמות",
              },
            ],
          };
          if (companyId) {
            const u = taskToDbTask(updated, companyId);
            updateTask(taskId, {
              expected_completion_at: u.expected_completion_at,
              progress_updates: u.progress_updates,
              updated_at: now,
              history: u.history,
            }).then((success) => {
              if (!success)
                setTasks((tasks) => tasks.map((t) => (t.id === taskId ? originalTask : t)));
            });
          }
          return updated;
        }),
      );
    },
    [companyId, setTasks],
  );

  const markAsSeen = useCallback(
    (taskId: string, userId: string, userName: string) => {
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== taskId) return task;
          const assigneeIndex = task.assignees.findIndex(
            (a) => a.userId === userId,
          );
          if (assigneeIndex === -1) return task;
          const currentAssignee = task.assignees[assigneeIndex];
          if (!currentAssignee || currentAssignee.status !== "new") return task;

          const newAssignees = [...task.assignees];
          newAssignees[assigneeIndex] = {
            ...currentAssignee,
            status: "seen" as TaskStatus,
            seenAt: now,
          };

          const originalTask = task;
          const updated = {
            ...task,
            assignees: newAssignees,
            status: "seen" as TaskStatus,
            updatedAt: now,
            history: [
              ...task.history,
              {
                id: generateHistoryId(),
                action: "seen" as const,
                userId,
                userName,
                timestamp: now,
                details: "המשימה נצפתה",
              },
            ],
          };
          if (companyId) {
            const u = taskToDbTask(updated, companyId);
            updateTask(taskId, {
              assignees: u.assignees,
              status: u.status,
              updated_at: now,
              history: u.history,
            }).then((success) => {
              if (!success)
                setTasks((tasks) => tasks.map((t) => (t.id === taskId ? originalTask : t)));
            });
          }
          return updated;
        }),
      );
    },
    [companyId, setTasks],
  );

  const startTask = useCallback(
    (taskId: string, userId: string, userName: string) => {
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== taskId) return task;
          const assigneeIndex = task.assignees.findIndex(
            (a) => a.userId === userId,
          );
          if (assigneeIndex === -1) return task;
          const currentAssignee = task.assignees[assigneeIndex];
          if (!currentAssignee) return task;

          const newAssignees = [...task.assignees];
          newAssignees[assigneeIndex] = {
            ...currentAssignee,
            status: "in_progress" as TaskStatus,
          };

          const originalTask = task;
          const updated = {
            ...task,
            assignees: newAssignees,
            status: "in_progress" as TaskStatus,
            updatedAt: now,
            history: [
              ...task.history,
              {
                id: generateHistoryId(),
                action: "started" as const,
                userId,
                userName,
                timestamp: now,
                details: "התחיל טיפול",
              },
            ],
          };
          if (companyId) {
            const u = taskToDbTask(updated, companyId);
            updateTask(taskId, {
              assignees: u.assignees,
              status: u.status,
              updated_at: now,
              history: u.history,
            }).then((success) => {
              if (!success)
                setTasks((tasks) => tasks.map((t) => (t.id === taskId ? originalTask : t)));
            });
          }
          return updated;
        }),
      );
    },
    [companyId, setTasks],
  );

  const completeTask = useCallback(
    (taskId: string, userId: string, userName: string, response: string) => {
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== taskId) return task;
          const assigneeIndex = task.assignees.findIndex(
            (a) => a.userId === userId,
          );
          if (assigneeIndex === -1) return task;
          const currentAssignee = task.assignees[assigneeIndex];
          if (!currentAssignee) return task;

          const newAssignees = [...task.assignees];
          newAssignees[assigneeIndex] = {
            ...currentAssignee,
            status: "done" as TaskStatus,
            handledAt: now,
            response,
          };

          const allAssigneesDone = newAssignees.every(
            (a) => a.status === "done",
          );

          const originalTask = task;
          const updated = {
            ...task,
            assignees: newAssignees,
            status: (allAssigneesDone ? "done" : task.status) as TaskStatus,
            handlerResponse: response,
            handledAt: now,
            updatedAt: now,
            history: [
              ...task.history,
              {
                id: generateHistoryId(),
                action: "done" as const,
                userId,
                userName,
                timestamp: now,
                details: allAssigneesDone
                  ? "כל המוקצים סיימו - ממתין לאישור"
                  : `${userName} סיים טיפול`,
              },
            ],
          };
          if (companyId) {
            const u = taskToDbTask(updated, companyId);
            updateTask(taskId, {
              assignees: u.assignees,
              status: u.status,
              handler_response: u.handler_response,
              handled_at: now,
              updated_at: now,
              history: u.history,
            }).then((success) => {
              if (!success)
                setTasks((tasks) => tasks.map((t) => (t.id === taskId ? originalTask : t)));
            });
          }
          return updated;
        }),
      );
    },
    [companyId, setTasks],
  );

  const approveTask = useCallback(
    (taskId: string, userId: string, userName: string) => {
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== taskId) return task;
          const originalTask = task;
          const updated = {
            ...task,
            status: "approved" as TaskStatus,
            approvedAt: now,
            updatedAt: now,
            history: [
              ...task.history,
              {
                id: generateHistoryId(),
                action: "approved" as const,
                userId,
                userName,
                timestamp: now,
                details: "המשימה אושרה ונסגרה",
              },
            ],
          };
          if (companyId) {
            updateTask(taskId, {
              status: "approved",
              approved_at: now,
              updated_at: now,
              history: updated.history,
            }).then((success) => {
              if (!success)
                setTasks((tasks) => tasks.map((t) => (t.id === taskId ? originalTask : t)));
            });
          }
          return updated;
        }),
      );
    },
    [companyId, setTasks],
  );

  const rejectTask = useCallback(
    (taskId: string, userId: string, userName: string, reason: string) => {
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== taskId) return task;
          const originalTask = task;
          const newAssignees = task.assignees.map((a) => ({
            ...a,
            status: "in_progress" as TaskStatus,
          }));
          const updated = {
            ...task,
            assignees: newAssignees,
            status: "in_progress" as TaskStatus,
            rejectedAt: now,
            rejectionReason: reason,
            updatedAt: now,
            history: [
              ...task.history,
              {
                id: generateHistoryId(),
                action: "rejected" as const,
                userId,
                userName,
                timestamp: now,
                details: `המשימה נדחתה: ${reason}`,
              },
            ],
          };
          if (companyId) {
            const u = taskToDbTask(updated, companyId);
            updateTask(taskId, {
              assignees: u.assignees,
              status: u.status,
              rejected_at: now,
              rejection_reason: reason,
              updated_at: now,
              history: u.history,
            }).then((success) => {
              if (!success)
                setTasks((tasks) => tasks.map((t) => (t.id === taskId ? originalTask : t)));
            });
          }
          return updated;
        }),
      );
    },
    [companyId, setTasks],
  );

  const toggleChecklistItem = useCallback(
    (taskId: string, itemId: string, _userId: string, userName: string) => {
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== taskId) return task;
          const originalTask = task;
          const updated = {
            ...task,
            updatedAt: now,
            checklist: task.checklist.map((item) => {
              if (item.id !== itemId) return item;
              return {
                ...item,
                completed: !item.completed,
                completedAt: !item.completed ? now : undefined,
                completedBy: !item.completed ? userName : undefined,
              };
            }),
          };
          if (companyId) {
            const u = taskToDbTask(updated, companyId);
            updateTask(taskId, { checklist: u.checklist, updated_at: now }).then((success) => {
              if (!success)
                setTasks((tasks) => tasks.map((t) => (t.id === taskId ? originalTask : t)));
            });
          }
          return updated;
        }),
      );
    },
    [companyId, setTasks],
  );

  const addComment = useCallback(
    (taskId: string, userId: string, userName: string, text: string) => {
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== taskId) return task;
          const originalTask = task;
          const updated = {
            ...task,
            updatedAt: now,
            comments: [
              ...task.comments,
              {
                id: `comment_${Date.now()}`,
                userId,
                userName,
                text,
                createdAt: now,
              },
            ],
            history: [
              ...task.history,
              {
                id: generateHistoryId(),
                action: "comment" as const,
                userId,
                userName,
                timestamp: now,
                details: "הוספה הערה",
              },
            ],
          };
          if (companyId) {
            const u = taskToDbTask(updated, companyId);
            updateTask(taskId, {
              comments: u.comments,
              history: u.history,
              updated_at: now,
            }).then((success) => {
              if (!success)
                setTasks((tasks) => tasks.map((t) => (t.id === taskId ? originalTask : t)));
            });
          }
          return updated;
        }),
      );
    },
    [companyId, setTasks],
  );

  const reassignTask = useCallback(
    (
      taskId: string,
      fromUserId: string,
      toUserId: string,
      toUserName: string,
      byUserId: string,
      byUserName: string,
    ) => {
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== taskId) return task;
          const originalTask = task;

          const assignees = task.assignees.map((a) => {
            if (a.userId === fromUserId) {
              return {
                ...a,
                userId: toUserId,
                userName: toUserName,
                status: "new" as TaskStatus,
              };
            }
            return a;
          });

          const updated = {
            ...task,
            assignees,
            updatedAt: now,
            history: [
              ...task.history,
              {
                id: generateHistoryId(),
                action: "reassigned" as const,
                userId: byUserId,
                userName: byUserName,
                timestamp: now,
                details: `העביר משימה ל-${toUserName}`,
              },
            ],
          };
          if (companyId) {
            const u = taskToDbTask(updated, companyId);
            const taskTitle = task.title;
            updateTask(taskId, {
              assignees: u.assignees,
              history: u.history,
              updated_at: now,
            }).then((success) => {
              if (!success) {
                setTasks((tasks) => tasks.map((t) => (t.id === taskId ? originalTask : t)));
                return;
              }
              if (toUserId !== byUserId) {
                sendNotification({
                  recipientUserIds: [toUserId],
                  type: "task_reassigned",
                  title: "משימה הועברה אליך",
                  body: `${byUserName} העביר אליך: ${taskTitle}`,
                  url: `/dashboard/tasks`,
                  referenceId: taskId,
                  referenceType: "task",
                });
              }
            });
          }
          return updated;
        }),
      );
    },
    [companyId, setTasks],
  );

  const addAssignee = useCallback(
    (
      taskId: string,
      userId: string,
      userName: string,
      role: "primary" | "secondary",
      byUserId: string,
      byUserName: string,
    ) => {
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== taskId) return task;
          if (task.assignees.some((a) => a.userId === userId)) return task;
          const originalTask = task;

          const updated = {
            ...task,
            assignees: [
              ...task.assignees,
              { userId, userName, role, status: "new" as TaskStatus },
            ],
            updatedAt: now,
            history: [
              ...task.history,
              {
                id: generateHistoryId(),
                action: "assigned" as const,
                userId: byUserId,
                userName: byUserName,
                timestamp: now,
                details: `הוסיף את ${userName} למשימה`,
              },
            ],
          };
          if (companyId) {
            const u = taskToDbTask(updated, companyId);
            const taskTitle = task.title;
            updateTask(taskId, {
              assignees: u.assignees,
              history: u.history,
              updated_at: now,
            }).then((success) => {
              if (!success) {
                setTasks((tasks) => tasks.map((t) => (t.id === taskId ? originalTask : t)));
                return;
              }
              if (userId !== byUserId) {
                sendNotification({
                  recipientUserIds: [userId],
                  type: "task_assigned",
                  title: "צורפת למשימה",
                  body: `${byUserName} הוסיף אותך ל: ${taskTitle}`,
                  url: `/dashboard/tasks`,
                  referenceId: taskId,
                  referenceType: "task",
                });
              }
            });
          }
          return updated;
        }),
      );
    },
    [companyId, setTasks],
  );

  const removeAssignee = useCallback(
    (taskId: string, userId: string, byUserId: string, byUserName: string) => {
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== taskId) return task;
          const removedUser = task.assignees.find((a) => a.userId === userId);
          if (!removedUser) return task;
          if (task.assignees.length <= 1) return task;
          const originalTask = task;

          const updated = {
            ...task,
            assignees: task.assignees.filter((a) => a.userId !== userId),
            updatedAt: now,
            history: [
              ...task.history,
              {
                id: generateHistoryId(),
                action: "removed" as const,
                userId: byUserId,
                userName: byUserName,
                timestamp: now,
                details: `הסיר את ${removedUser.userName} מהמשימה`,
              },
            ],
          };
          if (companyId) {
            const u = taskToDbTask(updated, companyId);
            updateTask(taskId, {
              assignees: u.assignees,
              history: u.history,
              updated_at: now,
            }).then((success) => {
              if (!success)
                setTasks((tasks) => tasks.map((t) => (t.id === taskId ? originalTask : t)));
            });
          }
          return updated;
        }),
      );
    },
    [companyId, setTasks],
  );

  const deleteTask = useCallback(
    async (taskId: string): Promise<boolean> => {
      const ok = await deleteSingleTask(taskId);
      if (ok) setTasks((prev) => prev.filter((t) => t.id !== taskId));
      return ok;
    },
    [setTasks],
  );

  return {
    createTask,
    deleteTask,
    markAsSeen,
    startTask,
    completeTask,
    approveTask,
    rejectTask,
    toggleChecklistItem,
    addComment,
    reassignTask,
    addAssignee,
    removeAssignee,
    updateExpectedCompletion,
    addProgressUpdate,
  };
}
