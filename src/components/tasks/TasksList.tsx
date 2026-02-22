"use client";

import { useState, useMemo } from "react";
import {
  Inbox,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Eye,
  Users,
} from "lucide-react";
import { clsx } from "clsx";
import { useUsers } from "@/context/UsersContext";
import { useTasks } from "@/context/TasksContext";
import type { Task } from "@/types/task";
import { TaskCard } from "./TaskCard";

type TabType = "assigned" | "created" | "pending" | "overdue" | "all";

interface TasksListProps {
  onTaskClick: (task: Task) => void;
}

export function TasksList({ onTaskClick }: TasksListProps) {
  const [activeTab, setActiveTab] = useState<TabType>("assigned");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const { currentUser, allUsers } = useUsers();
  const {
    tasks,
    getTasksAssignedTo,
    getTasksCreatedBy,
    getTasksPendingApproval,
    getOverdueTasks,
  } = useTasks();

  const isAdmin = currentUser.role === "admin";

  const assignedTasks = getTasksAssignedTo(currentUser.id)
    .filter((t) => t.status !== "approved")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  const createdTasks = getTasksCreatedBy(currentUser.id).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const pendingTasks = getTasksPendingApproval(currentUser.id);
  const overdueTasks = getOverdueTasks(currentUser.id);

  // כל המשימות (למנהל)
  const allTasks = useMemo(() => {
    let filtered = [...tasks].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (selectedUserId) {
      filtered = filtered.filter(
        (t) =>
          t.createdBy === selectedUserId ||
          t.assignees.some((a) => a.userId === selectedUserId),
      );
    }
    return filtered;
  }, [tasks, selectedUserId]);

  const tabs: {
    id: TabType;
    label: string;
    icon: React.ElementType;
    count: number;
    adminOnly?: boolean;
  }[] = [
    {
      id: "assigned",
      label: "ממתינות לטיפולי",
      icon: Inbox,
      count: assignedTasks.filter((t) => t.status === "new").length,
    },
    {
      id: "pending",
      label: "ממתינות לאישורי",
      icon: CheckCircle,
      count: pendingTasks.length,
    },
    {
      id: "created",
      label: "משימות שיצרתי",
      icon: ChevronRight,
      count: 0,
    },
    {
      id: "overdue",
      label: "באיחור",
      icon: AlertTriangle,
      count: overdueTasks.length,
    },
    ...(isAdmin
      ? [
          {
            id: "all" as TabType,
            label: "כל המשימות",
            icon: Eye,
            count: tasks.length,
            adminOnly: true,
          },
        ]
      : []),
  ];

  const getTasksForTab = (tab: TabType): Task[] => {
    switch (tab) {
      case "assigned":
        return assignedTasks;
      case "created":
        return createdTasks;
      case "pending":
        return pendingTasks;
      case "overdue":
        return overdueTasks;
      case "all":
        return allTasks;
    }
  };

  const getVariantForTab = (
    tab: TabType,
  ): "assigned" | "created" | "pending" => {
    switch (tab) {
      case "assigned":
        return "assigned";
      case "created":
        return "created";
      case "pending":
        return "pending";
      case "overdue":
        return "assigned";
      case "all":
        return "created"; // תצוגת מנהל - מציג כמו "נוצר"
    }
  };

  const currentTasks = getTasksForTab(activeTab);
  const variant = getVariantForTab(activeTab);

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-white text-primary-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900",
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count > 0 && (
              <span
                className={clsx(
                  "flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-bold",
                  activeTab === tab.id
                    ? "bg-primary-100 text-primary-700"
                    : "bg-gray-200 text-gray-600",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Admin Filter */}
      {isAdmin && activeTab === "all" && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-purple-50 rounded-xl">
          <Users className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-medium text-purple-700">
            סנן לפי עובד:
          </span>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="flex-1 max-w-xs px-3 py-1.5 border border-purple-200 rounded-lg text-sm bg-white"
          >
            <option value="">כל העובדים</option>
            {allUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.avatar} {user.name} ({user.department})
              </option>
            ))}
          </select>
          {selectedUserId && (
            <button
              onClick={() => setSelectedUserId("")}
              className="text-sm text-purple-600 hover:underline"
            >
              נקה
            </button>
          )}
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-3">
        {currentTasks.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          currentTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              variant={variant}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyState({ tab }: { tab: TabType }) {
  const config: Record<
    TabType,
    { icon: string; title: string; description: string }
  > = {
    assigned: {
      icon: "📥",
      title: "אין משימות לטיפול",
      description: "כל המשימות שהוקצו לך טופלו. כל הכבוד!",
    },
    created: {
      icon: "📤",
      title: "לא יצרת משימות",
      description: "כשתיצור משימה חדשה, היא תופיע כאן",
    },
    pending: {
      icon: "✅",
      title: "אין משימות לאישור",
      description: "כשמשימות שיצרת יטופלו, הן יחכו כאן לאישורך",
    },
    overdue: {
      icon: "🎉",
      title: "אין משימות באיחור",
      description: "מעולה! כל המשימות מטופלות בזמן",
    },
    all: {
      icon: "📋",
      title: "אין משימות במערכת",
      description: "כשיווצרו משימות, הן יופיעו כאן",
    },
  };

  const { icon, title, description } = config[tab];

  return (
    <div className="text-center py-12 bg-gray-50 rounded-xl">
      <span className="text-4xl mb-3 block">{icon}</span>
      <h3 className="font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}
