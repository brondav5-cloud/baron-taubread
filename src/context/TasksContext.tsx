"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Task, TaskStatus, TaskPriority } from "@/types/task";
import { generateHistoryId, calculateDueDate } from "@/types/task";
import demoData from "@/lib/data/tasks-demo.json";
import { useAuth } from "@/hooks/useAuth";
import {
  getTasks as fetchTasks,
  insertTask,
  updateTask,
  deleteAllTasks,
} from "@/lib/supabase/tasks.queries";
import { dbTaskToTask, taskToDbTask } from "@/lib/supabase/tasks.mappers";

// ============================================
// TYPES
// ============================================

interface CreateTaskInput {
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
  dueDate?: string; // אופציונלי - אם לא נשלח, יחושב לפי priority
}

interface TasksContextType {
  tasks: Task[];
  getTaskById: (id: string) => Task | undefined;
  getTasksCreatedBy: (userId: string) => Task[];
  getTasksAssignedTo: (userId: string) => Task[];
  getTasksForStore: (storeId: number) => Task[];
  getTasksPendingApproval: (userId: string) => Task[];
  getOverdueTasks: (userId: string) => Task[];
  getUnreadCount: (userId: string) => number;
  getPendingApprovalCount: (userId: string) => number;
  createTask: (
    input: CreateTaskInput,
    createdBy: string,
    createdByName: string,
  ) => Task;
  markAsSeen: (taskId: string, userId: string, userName: string) => void;
  startTask: (taskId: string, userId: string, userName: string) => void;
  completeTask: (
    taskId: string,
    userId: string,
    userName: string,
    response: string,
  ) => void;
  approveTask: (taskId: string, userId: string, userName: string) => void;
  rejectTask: (
    taskId: string,
    userId: string,
    userName: string,
    reason: string,
  ) => void;
  toggleChecklistItem: (
    taskId: string,
    itemId: string,
    userId: string,
    userName: string,
  ) => void;
  addComment: (
    taskId: string,
    userId: string,
    userName: string,
    text: string,
  ) => void;
  resetToSampleData: () => void;
  // 🆕 העברה והוספת מוקצים
  reassignTask: (
    taskId: string,
    fromUserId: string,
    toUserId: string,
    toUserName: string,
    byUserId: string,
    byUserName: string,
  ) => void;
  addAssignee: (
    taskId: string,
    userId: string,
    userName: string,
    role: "primary" | "secondary",
    byUserId: string,
    byUserName: string,
  ) => void;
  removeAssignee: (
    taskId: string,
    userId: string,
    byUserId: string,
    byUserName: string,
  ) => void;
}

// ============================================
// CONTEXT
// ============================================

const TasksContext = createContext<TasksContextType | null>(null);

// ============================================
// PROVIDER
// ============================================

export function TasksProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (auth.status === "loading") return;
    if (!companyId) {
      setTasks([]);
      setIsInitialized(true);
      return;
    }
    let cancelled = false;
    fetchTasks(companyId)
      .then((dbTasks) => {
        if (!cancelled) {
          setTasks(dbTasks.map(dbTaskToTask));
        }
      })
      .catch((err) => {
        console.error("[TasksContext] fetch error:", err);
        if (!cancelled) setTasks([]);
      })
      .finally(() => {
        if (!cancelled) setIsInitialized(true);
      });
    return () => {
      cancelled = true;
    };
  }, [auth.status, companyId]);

  // ============================================
  // GETTERS
  // ============================================

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

  // ============================================
  // ACTIONS
  // ============================================

  const createTask = useCallback(
    (
      input: CreateTaskInput,
      createdBy: string,
      createdByName: string,
    ): Task => {
      const now = new Date().toISOString();
      const newTask: Omit<Task, "id"> & { id: string } = {
        id: "", // will get from DB
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
      };
      if (companyId) {
        const insertRow = taskToDbTask(newTask, companyId);
        insertTask(insertRow).then(({ data, error }) => {
          if (!error && data) {
            const created = dbTaskToTask(data);
            setTasks((prev) => [created, ...prev]);
          }
        });
        return { ...newTask, id: `pending_${Date.now()}` } as Task;
      }
      return newTask as Task;
    },
    [companyId],
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
            });
          }
          return updated;
        }),
      );
    },
    [companyId],
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
            });
          }
          return updated;
        }),
      );
    },
    [companyId],
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
            });
          }
          return updated;
        }),
      );
    },
    [companyId],
  );

  const approveTask = useCallback(
    (taskId: string, userId: string, userName: string) => {
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== taskId) return task;
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
            });
          }
          return updated;
        }),
      );
    },
    [companyId],
  );

  const rejectTask = useCallback(
    (taskId: string, userId: string, userName: string, reason: string) => {
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== taskId) return task;
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
            });
          }
          return updated;
        }),
      );
    },
    [companyId],
  );

  const toggleChecklistItem = useCallback(
    (taskId: string, itemId: string, _userId: string, userName: string) => {
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== taskId) return task;
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
            updateTask(taskId, { checklist: u.checklist, updated_at: now });
          }
          return updated;
        }),
      );
    },
    [companyId],
  );

  const addComment = useCallback(
    (taskId: string, userId: string, userName: string, text: string) => {
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== taskId) return task;
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
            });
          }
          return updated;
        }),
      );
    },
    [companyId],
  );

  // ============================================
  // REASSIGN & ADD ASSIGNEE
  // ============================================

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
                action: "comment" as const,
                userId: byUserId,
                userName: byUserName,
                timestamp: now,
                details: `העביר משימה ל-${toUserName}`,
              },
            ],
          };
          if (companyId) {
            const u = taskToDbTask(updated, companyId);
            updateTask(taskId, {
              assignees: u.assignees,
              history: u.history,
              updated_at: now,
            });
          }
          return updated;
        }),
      );
    },
    [companyId],
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
                action: "comment" as const,
                userId: byUserId,
                userName: byUserName,
                timestamp: now,
                details: `הוסיף את ${userName} למשימה`,
              },
            ],
          };
          if (companyId) {
            const u = taskToDbTask(updated, companyId);
            updateTask(taskId, {
              assignees: u.assignees,
              history: u.history,
              updated_at: now,
            });
          }
          return updated;
        }),
      );
    },
    [companyId],
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

          const updated = {
            ...task,
            assignees: task.assignees.filter((a) => a.userId !== userId),
            updatedAt: now,
            history: [
              ...task.history,
              {
                id: generateHistoryId(),
                action: "comment" as const,
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
            });
          }
          return updated;
        }),
      );
    },
    [companyId],
  );

  const resetToSampleData = useCallback(async () => {
    if (!companyId) return;
    await deleteAllTasks(companyId);
    setTasks([]);
    const samples = demoData.sampleTasks as Task[];
    const inserted: Task[] = [];
    for (const t of samples) {
      const row = taskToDbTask({ ...t, id: "" }, companyId);
      const { data } = await insertTask(row);
      if (data) inserted.push(dbTaskToTask(data));
    }
    setTasks(inserted);
  }, [companyId]);

  if (!isInitialized) return null;

  return (
    <TasksContext.Provider
      value={{
        tasks,
        getTaskById,
        getTasksCreatedBy,
        getTasksAssignedTo,
        getTasksForStore,
        getTasksPendingApproval,
        getOverdueTasks,
        getUnreadCount,
        getPendingApprovalCount,
        createTask,
        markAsSeen,
        startTask,
        completeTask,
        approveTask,
        rejectTask,
        toggleChecklistItem,
        addComment,
        resetToSampleData,
        reassignTask,
        addAssignee,
        removeAssignee,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks(): TasksContextType {
  const context = useContext(TasksContext);
  if (!context) throw new Error("useTasks must be used within TasksProvider");
  return context;
}
