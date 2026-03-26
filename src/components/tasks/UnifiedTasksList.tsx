"use client";

import { useMemo, useState, useCallback } from "react";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  Users,
  List,
  Bell,
} from "lucide-react";
import { clsx } from "clsx";
import toast from "react-hot-toast";
import { useUsers } from "@/context/UsersContext";
import { useTasks } from "@/context/TasksContext";
import { useWorkflow } from "@/context/WorkflowContext";
import type { Task } from "@/types/task";
import type { WorkflowTask } from "@/types/task";
import { TaskPriorityBadge } from "./TaskBadges";

// ============================================
// TYPES
// ============================================

export type FilterType =
  | "all"
  | "my_new"
  | "in_progress"
  | "pending_approval"
  | "created_by_me"
  | "overdue";

export type StatusFilter = "all" | "active" | "completed";

interface UnifiedItem {
  id: string;
  type: "task" | "workflow";
  title: string;
  createdAt: string;
  dueDate: string;
  priority: "urgent" | "normal" | "low";
  status: string;
  categoryIcon?: string;
  categoryName?: string;
  storeName?: string;
  createdByName: string;
  isOverdue: boolean;
  isScheduled: boolean;
  startsAt?: string;
  // Task specific
  task?: Task;
  // Workflow specific
  workflow?: WorkflowTask;
  progress?: number;
  totalSteps?: number;
  completedSteps?: number;
}

interface UnifiedTasksListProps {
  filter: FilterType;
  onTaskClick: (task: Task) => void;
  onWorkflowClick: (workflowId: string) => void;
  assigneeFilter?: string[];
  statusFilter?: StatusFilter;
}

// ============================================
// COMPONENT
// ============================================

export function UnifiedTasksList({
  filter,
  onTaskClick,
  onWorkflowClick,
  assigneeFilter = [],
  statusFilter = "all",
}: UnifiedTasksListProps) {
  const { currentUser } = useUsers();
  const { tasks } = useTasks();
  const { workflows } = useWorkflow();

  const isAdmin = currentUser.role === "admin";

  const isTaskVisibleToCurrentUser = useCallback(
    (task: Task) => {
      if (isAdmin) return true;
      if (task.createdBy === currentUser.id) return true;
      if (!task.startsAt) return true;
      return new Date(task.startsAt) <= new Date();
    },
    [currentUser.id, isAdmin],
  );

  // מיזוג והמרה לפורמט אחיד
  const unifiedItems = useMemo(() => {
    const items: UnifiedItem[] = [];

    // הוספת משימות רגילות
    tasks.forEach((task) => {
      const isOverdue =
        new Date(task.dueDate) < new Date() && task.status !== "approved";
      items.push({
        id: task.id,
        type: "task",
        title: task.title,
        createdAt: task.createdAt,
        dueDate: task.dueDate,
        priority: task.priority,
        status: task.status,
        categoryIcon: task.categoryIcon,
        categoryName: task.categoryName,
        storeName: task.storeName,
        createdByName: task.createdByName,
        isOverdue,
        isScheduled: !!task.startsAt && new Date(task.startsAt) > new Date(),
        startsAt: task.startsAt,
        task,
      });
    });

    // הוספת workflows
    workflows.forEach((workflow) => {
      const completedSteps = workflow.steps.filter(
        (s) => s.status === "completed",
      ).length;
      const totalSteps = workflow.steps.length;
      const isOverdue =
        new Date(workflow.dueDate) < new Date() &&
        workflow.status !== "completed";

      items.push({
        id: workflow.id,
        type: "workflow",
        title: workflow.title,
        createdAt: workflow.createdAt,
        dueDate: workflow.dueDate,
        priority: workflow.priority,
        status: workflow.status,
        storeName: workflow.storeName,
        createdByName: workflow.createdByName,
        isOverdue,
        isScheduled: false,
        workflow,
        progress: Math.round((completedSteps / totalSteps) * 100),
        totalSteps,
        completedSteps,
      });
    });

    return items;
  }, [tasks, workflows]);

  // סינון לפי הפילטר הנבחר
  const filteredItems = useMemo(() => {
    let filtered = [...unifiedItems];

    filtered = filtered.filter((item) => {
      if (item.type === "task" && item.task) {
        return isTaskVisibleToCurrentUser(item.task);
      }
      return true;
    });

    switch (filter) {
      case "my_new":
        filtered = filtered.filter((item) => {
          if (item.type === "task" && item.task) {
            const assignee = item.task.assignees.find(
              (a) => a.userId === currentUser.id,
            );
            return (
              assignee &&
              (assignee.status === "new" || assignee.status === "seen")
            );
          }
          if (item.type === "workflow" && item.workflow) {
            return item.workflow.steps.some(
              (s) =>
                (s.status === "active" || s.status === "in_progress") &&
                s.assignees.some((a) => a.userId === currentUser.id),
            );
          }
          return false;
        });
        break;

      case "in_progress":
        filtered = filtered.filter((item) => {
          if (item.type === "task" && item.task) {
            return item.task.assignees.some(
              (a) => a.userId === currentUser.id && a.status === "in_progress",
            );
          }
          if (item.type === "workflow" && item.workflow) {
            return item.workflow.steps.some(
              (s) =>
                s.status === "in_progress" &&
                s.assignees.some((a) => a.userId === currentUser.id),
            );
          }
          return false;
        });
        break;

      case "pending_approval":
        filtered = filtered.filter((item) => {
          if (item.type === "task" && item.task) {
            return (
              item.task.createdBy === currentUser.id &&
              item.task.status === "done"
            );
          }
          if (item.type === "workflow" && item.workflow) {
            return (
              item.workflow.createdBy === currentUser.id &&
              item.workflow.status === "awaiting_approval"
            );
          }
          return false;
        });
        break;

      case "created_by_me":
        filtered = filtered.filter((item) => {
          if (item.type === "task" && item.task) {
            return item.task.createdBy === currentUser.id;
          }
          if (item.type === "workflow" && item.workflow) {
            return item.workflow.createdBy === currentUser.id;
          }
          return false;
        });
        break;

      case "overdue":
        filtered = filtered.filter((item) => {
          if (!item.isOverdue) return false;
          if (item.type === "task" && item.task) {
            // Only show if the current user hasn't completed their part yet
            return item.task.assignees.some(
              (a) => a.userId === currentUser.id && a.status !== "done",
            );
          }
          if (item.type === "workflow" && item.workflow) {
            return (
              item.workflow.createdBy === currentUser.id ||
              item.workflow.steps.some((s) =>
                s.assignees.some((a) => a.userId === currentUser.id),
              )
            );
          }
          return false;
        });
        break;

      case "all":
        if (!isAdmin) {
          // רק משימות שקשורות למשתמש
          filtered = filtered.filter((item) => {
            if (item.type === "task" && item.task) {
              return (
                item.task.createdBy === currentUser.id ||
                item.task.assignees.some((a) => a.userId === currentUser.id)
              );
            }
            if (item.type === "workflow" && item.workflow) {
              return (
                item.workflow.createdBy === currentUser.id ||
                item.workflow.steps.some((s) =>
                  s.assignees.some((a) => a.userId === currentUser.id),
                )
              );
            }
            return false;
          });
        }
        break;
    }

    // סינון לפי סטטוס (פעיל / הושלם)
    if (statusFilter === "active") {
      filtered = filtered.filter(
        (item) => item.status !== "approved" && item.status !== "completed",
      );
    } else if (statusFilter === "completed") {
      filtered = filtered.filter(
        (item) => item.status === "approved" || item.status === "completed",
      );
    }

    // סינון לפי מוקצים נבחרים
    if (assigneeFilter.length > 0) {
      filtered = filtered.filter((item) => {
        if (item.type === "task" && item.task) {
          return item.task.assignees.some((a) => assigneeFilter.includes(a.userId));
        }
        if (item.type === "workflow" && item.workflow) {
          return item.workflow.steps.some((s) =>
            s.assignees.some((a) => assigneeFilter.includes(a.userId)),
          );
        }
        return false;
      });
    }

    // מיון לפי תאריך יצירה
    return filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [assigneeFilter, currentUser.id, filter, isAdmin, isTaskVisibleToCurrentUser, statusFilter, unifiedItems]);

  if (filteredItems.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl">
        <span className="text-4xl mb-3 block">📋</span>
        <h3 className="font-medium text-gray-900 mb-1">אין משימות</h3>
        <p className="text-sm text-gray-500">לא נמצאו משימות בקטגוריה הנבחרת</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredItems.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          onClick={() => {
            if (item.type === "task" && item.task) {
              onTaskClick(item.task);
            } else if (item.type === "workflow") {
              onWorkflowClick(item.id);
            }
          }}
          currentUserId={currentUser.id}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}

// ============================================
// ITEM CARD
// ============================================

interface ItemCardProps {
  item: UnifiedItem;
  onClick: () => void;
  currentUserId: string;
  isAdmin: boolean;
}

function ItemCard({ item, onClick, currentUserId, isAdmin }: ItemCardProps) {
  const [nudging, setNudging] = useState(false);

  const handleNudge = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!item.task) return;
      const pendingAssignees = item.task.assignees.filter(
        (a) => a.status === "new" || a.status === "seen" || a.status === "in_progress",
      );
      if (pendingAssignees.length === 0) {
        toast("אין מוקצים שממתינים לטיפול");
        return;
      }
      setNudging(true);
      try {
        const res = await fetch("/api/notifications/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientUserIds: pendingAssignees.map((a) => a.userId),
            title: "תזכורת: משימה ממתינה לטיפולך",
            body: item.task.title,
            type: "reminder",
            referenceId: item.task.id,
            referenceType: "task",
          }),
        });
        if (res.ok) {
          toast.success(`תזכורת נשלחה ל-${pendingAssignees.length} מוקצ${pendingAssignees.length === 1 ? "ה" : "ים"}`);
        } else {
          toast.error("שגיאה בשליחת התזכורת");
        }
      } catch {
        toast.error("שגיאה בשליחת התזכורת");
      } finally {
        setNudging(false);
      }
    },
    [item.task],
  );
  const isWorkflow = item.type === "workflow";

  // מציאת השלב הפעיל של המשתמש ב-workflow
  const userActiveStep =
    isWorkflow && item.workflow
      ? item.workflow.steps.find(
          (s) =>
            (s.status === "active" || s.status === "in_progress") &&
            s.assignees.some((a) => a.userId === currentUserId),
        )
      : null;

  return (
    <div
      onClick={onClick}
      className={clsx(
        "bg-white border rounded-xl p-4 cursor-pointer hover:shadow-md transition-all",
        isWorkflow && "border-r-4 border-r-purple-400",
        item.isOverdue && "border-red-200 bg-red-50/30",
        item.status === "approved" || item.status === "completed"
          ? "border-green-200 bg-green-50/30"
          : "",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Title & Type Badge */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {/* Workflow Badge */}
            {isWorkflow && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                <List className="w-3 h-3" />
                מורכבת
              </span>
            )}

            {/* Status Icon */}
            {item.status === "completed" || item.status === "approved" ? (
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            ) : item.isOverdue ? (
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            ) : (
              <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
            )}

            <h3 className="font-medium text-gray-900 truncate">{item.title}</h3>
          </div>

          {/* Category & Priority */}
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {item.categoryIcon && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <span>{item.categoryIcon}</span>
                {item.categoryName}
              </span>
            )}
            <TaskPriorityBadge priority={item.priority} />
            {item.isOverdue && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">
                ⏰ באיחור
              </span>
            )}
            {item.isScheduled && item.startsAt && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 text-xs font-medium">
                🕒 מתוזמנת
              </span>
            )}
          </div>

          {/* Workflow Progress */}
          {isWorkflow && item.totalSteps && (
            <div className="flex items-center gap-3 mt-2">
              <div className="flex-1 max-w-32 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={clsx(
                    "h-full transition-all",
                    item.status === "completed"
                      ? "bg-green-500"
                      : "bg-purple-500",
                  )}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">
                {item.completedSteps}/{item.totalSteps} שלבים
              </span>
            </div>
          )}

          {/* User's Active Step in Workflow */}
          {userActiveStep && (
            <div className="mt-2 px-2 py-1 bg-purple-50 rounded-lg inline-flex items-center gap-2">
              <span className="text-sm">{userActiveStep.categoryIcon}</span>
              <span className="text-sm text-purple-700">
                התור שלך: {userActiveStep.title}
              </span>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>נוצר ע״י {item.createdByName}</span>
            {item.storeName && <span>📍 {item.storeName}</span>}
            {!isWorkflow && item.task && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {item.task.assignees.length}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {isAdmin &&
            item.type === "task" &&
            item.task &&
            item.status !== "approved" &&
            item.status !== "rejected" && (
              <button
                onClick={handleNudge}
                disabled={nudging}
                title="שלח תזכורת למוקצים"
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-medium transition-colors disabled:opacity-50"
              >
                <Bell className="w-3 h-3" />
                {nudging ? "שולח..." : "הזכר"}
              </button>
            )}
          <ChevronLeft className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    </div>
  );
}
