"use client";

import { useMemo } from "react";
import { clsx } from "clsx";
import { useUsers } from "@/context/UsersContext";
import { useTasks } from "@/context/TasksContext";
import { useWorkflow } from "@/context/WorkflowContext";
import type { FilterType } from "./UnifiedTasksList";

interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  color: "blue" | "orange" | "green" | "purple" | "red" | "gray";
  onClick?: () => void;
  subtitle?: string;
  isActive?: boolean;
}

function StatCard({
  label,
  value,
  icon,
  color,
  onClick,
  subtitle,
  isActive,
}: StatCardProps) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 hover:bg-blue-100",
    orange: "bg-orange-50 text-orange-700 hover:bg-orange-100",
    green: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    purple: "bg-purple-50 text-purple-700 hover:bg-purple-100",
    red: "bg-red-50 text-red-700 hover:bg-red-100",
    gray: "bg-gray-50 text-gray-700 hover:bg-gray-100",
  };

  const activeRing = {
    blue: "ring-2 ring-blue-400",
    orange: "ring-2 ring-orange-400",
    green: "ring-2 ring-emerald-400",
    purple: "ring-2 ring-purple-400",
    red: "ring-2 ring-red-400",
    gray: "ring-2 ring-gray-400",
  };

  return (
    <button
      onClick={onClick}
      className={clsx(
        "rounded-xl p-4 transition-all text-right w-full cursor-pointer",
        colors[color],
        isActive && activeRing[color],
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="text-sm mt-1 font-medium">{label}</p>
      {subtitle && <p className="text-xs mt-0.5 opacity-70">{subtitle}</p>}
    </button>
  );
}

interface TaskStatsCardsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export function TaskStatsCards({
  activeFilter,
  onFilterChange,
}: TaskStatsCardsProps) {
  const { currentUser } = useUsers();
  const { tasks, getUnreadCount, getPendingApprovalCount } = useTasks();
  const { workflows, getActiveStepsForUser, getWorkflowsAwaitingApproval } =
    useWorkflow();

  const isAdmin = currentUser.role === "admin";

  const stats = useMemo(() => {
    // משימות רגילות
    const myNewTasks = getUnreadCount(currentUser.id);
    const myInProgress = tasks.filter((t) =>
      t.assignees.some(
        (a) => a.userId === currentUser.id && a.status === "in_progress",
      ),
    ).length;
    const myPendingApproval = getPendingApprovalCount(currentUser.id);
    const tasksICreated = tasks.filter(
      (t) => t.createdBy === currentUser.id,
    ).length;
    const overdueTasks = tasks.filter((t) => {
      const isOverdue =
        new Date(t.dueDate) < new Date() && t.status !== "approved";
      const isMyTask = t.assignees.some((a) => a.userId === currentUser.id);
      return isOverdue && isMyTask;
    }).length;

    // משימות מורכבות
    const myActiveWorkflowSteps = getActiveStepsForUser(currentUser.id).length;
    const workflowsPendingApproval = getWorkflowsAwaitingApproval(
      currentUser.id,
    ).length;
    const workflowsICreated = workflows.filter(
      (w) => w.createdBy === currentUser.id,
    ).length;
    const overdueWorkflows = workflows.filter((w) => {
      const isOverdue =
        new Date(w.dueDate) < new Date() && w.status !== "completed";
      const isMyWorkflow =
        w.createdBy === currentUser.id ||
        w.steps.some((s) =>
          s.assignees.some((a) => a.userId === currentUser.id),
        );
      return isOverdue && isMyWorkflow;
    }).length;

    // סה"כ (רגילות + מורכבות)
    const totalNew = myNewTasks + myActiveWorkflowSteps;
    const totalPendingApproval = myPendingApproval + workflowsPendingApproval;
    const totalCreated = tasksICreated + workflowsICreated;
    const totalOverdue = overdueTasks + overdueWorkflows;

    // נתוני מנהל
    const allCount = isAdmin ? tasks.length + workflows.length : 0;

    return {
      totalNew,
      myInProgress,
      totalPendingApproval,
      totalCreated,
      totalOverdue,
      allCount,
    };
  }, [
    currentUser.id,
    isAdmin,
    tasks,
    workflows,
    getUnreadCount,
    getPendingApprovalCount,
    getActiveStepsForUser,
    getWorkflowsAwaitingApproval,
  ]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
      <StatCard
        label="ממתינות לטיפולי"
        value={stats.totalNew}
        icon="📥"
        color="blue"
        onClick={() => onFilterChange("my_new")}
        isActive={activeFilter === "my_new"}
        subtitle="חדשות + שלבי workflow"
      />
      <StatCard
        label="בטיפולי"
        value={stats.myInProgress}
        icon="🔧"
        color="orange"
        onClick={() => onFilterChange("in_progress")}
        isActive={activeFilter === "in_progress"}
      />
      <StatCard
        label="ממתינות לאישורי"
        value={stats.totalPendingApproval}
        icon="✅"
        color="green"
        onClick={() => onFilterChange("pending_approval")}
        isActive={activeFilter === "pending_approval"}
        subtitle="משימות שיצרתי וטופלו"
      />
      <StatCard
        label="משימות שיצרתי"
        value={stats.totalCreated}
        icon="📤"
        color="gray"
        onClick={() => onFilterChange("created_by_me")}
        isActive={activeFilter === "created_by_me"}
      />
      {stats.totalOverdue > 0 && (
        <StatCard
          label="באיחור"
          value={stats.totalOverdue}
          icon="⚠️"
          color="red"
          onClick={() => onFilterChange("overdue")}
          isActive={activeFilter === "overdue"}
        />
      )}
      {isAdmin && (
        <StatCard
          label="כל המשימות"
          value={stats.allCount}
          icon="👁️"
          color="purple"
          onClick={() => onFilterChange("all")}
          isActive={activeFilter === "all"}
          subtitle="תצוגת מנהל"
        />
      )}
    </div>
  );
}
