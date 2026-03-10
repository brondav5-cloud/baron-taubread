"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Task } from "@/types/task";
import { useAuth } from "@/hooks/useAuth";
import {
  getTasks as fetchTasks,
} from "@/lib/supabase/tasks.queries";
import { dbTaskToTask } from "@/lib/supabase/tasks.mappers";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { useTaskQueries } from "@/hooks/useTaskQueries";
import { useTaskMutations, type CreateTaskInput } from "@/hooks/useTaskMutations";

// ── Context type ─────────────────────────────────────────────

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
  createTask: (input: CreateTaskInput, createdBy: string, createdByName: string) => Task;
  deleteTask: (taskId: string) => Promise<boolean>;
  markAsSeen: (taskId: string, userId: string, userName: string) => void;
  startTask: (taskId: string, userId: string, userName: string) => void;
  completeTask: (taskId: string, userId: string, userName: string, response: string) => void;
  approveTask: (taskId: string, userId: string, userName: string) => void;
  rejectTask: (taskId: string, userId: string, userName: string, reason: string) => void;
  toggleChecklistItem: (taskId: string, itemId: string, userId: string, userName: string) => void;
  addComment: (taskId: string, userId: string, userName: string, text: string) => void;
  resetToSampleData: () => void;
  reassignTask: (taskId: string, fromUserId: string, toUserId: string, toUserName: string, byUserId: string, byUserName: string) => void;
  addAssignee: (taskId: string, userId: string, userName: string, role: "primary" | "secondary", byUserId: string, byUserName: string) => void;
  removeAssignee: (taskId: string, userId: string, byUserId: string, byUserName: string) => void;
}

const TasksContext = createContext<TasksContextType | null>(null);

// ── Provider ─────────────────────────────────────────────────

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
        if (!cancelled) setTasks(dbTasks.map(dbTaskToTask));
      })
      .catch((err) => {
        console.error("[TasksContext] fetch error:", err);
        if (!cancelled) setTasks([]);
      })
      .finally(() => {
        if (!cancelled) setIsInitialized(true);
      });
    return () => { cancelled = true; };
  }, [auth.status, companyId]);

  const refetchTasks = useCallback(() => {
    if (!companyId) return;
    fetchTasks(companyId)
      .then((dbTasks) => setTasks(dbTasks.map(dbTaskToTask)))
      .catch((err) => console.error("[TasksContext] realtime refetch error:", err));
  }, [companyId]);

  useRealtimeTable("tasks", companyId, refetchTasks);

  const queries = useTaskQueries(tasks);
  const mutations = useTaskMutations(companyId, setTasks);

  if (!isInitialized) return null;

  return (
    <TasksContext.Provider value={{ tasks, ...queries, ...mutations }}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks(): TasksContextType {
  const context = useContext(TasksContext);
  if (!context) throw new Error("useTasks must be used within TasksProvider");
  return context;
}
