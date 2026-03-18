"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Plus, ListTodo, BarChart3, List, Bug, Users, X, ChevronDown } from "lucide-react";
import { useUsers } from "@/context/UsersContext";
import { useTasks } from "@/context/TasksContext";
import { useWorkflow } from "@/context/WorkflowContext";
import { useVisits } from "@/context/VisitsContext";
import type { Task } from "@/types/task";
import {
  CreateTaskModal,
  TaskDetailModal,
  DemoUserSwitcher,
  TaskStatsCards,
} from "@/components/tasks";
import {
  UnifiedTasksList,
  type FilterType,
} from "@/components/tasks/UnifiedTasksList";
import {
  CreateWorkflowModal,
  WorkflowDetailModal,
} from "@/components/tasks/workflow";

export default function TasksPage() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [selectedStoreNameFromSession, setSelectedStoreNameFromSession] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("my_new");
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);

  const { currentUser, allUsers } = useUsers();
  const { tasks } = useTasks();
  const { createWorkflow, workflows } = useWorkflow();
  const isAdmin = currentUser.role === "admin";

  // Count only tasks/workflows that involve the current user
  const myTasksCount = tasks.filter(
    (t) => {
      const involved =
        t.createdBy === currentUser.id ||
        t.assignees.some((a) => a.userId === currentUser.id);
      if (!involved) return false;
      if (isAdmin || t.createdBy === currentUser.id) return true;
      if (!t.startsAt) return true;
      return new Date(t.startsAt) <= new Date();
    },
  ).length;
  const myWorkflowsCount = workflows.filter(
    (w) =>
      w.createdBy === currentUser.id ||
      w.steps.some((s) => s.assignees.some((a) => a.userId === currentUser.id)),
  ).length;
  const { stores: storesFromSupabase } = useVisits();

  const stores = storesFromSupabase.map((s) => ({
    id: s.external_id,
    name: s.name,
    city: s.city,
    agent: s.agent,
  }));

  const handleCreateTask = () => {
    setSelectedStoreId(null);
    setSelectedStoreNameFromSession(null);
    setShowCreateModal(true);
  };

  // Check for store from "שמור ועבור למשימה" (visits → tasks)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("createTaskStore");
      if (!raw) return;
      const data = JSON.parse(raw) as { storeId?: number; storeName?: string };
      if (data.storeId != null && typeof data.storeId === "number") {
        setSelectedStoreId(data.storeId);
        setSelectedStoreNameFromSession(data.storeName ?? null);
        setShowCreateModal(true);
      }
      sessionStorage.removeItem("createTaskStore");
    } catch {
      sessionStorage.removeItem("createTaskStore");
    }
  }, []);

  const handleCreateWorkflow = (data: {
    title: string;
    description: string;
    storeId?: number;
    storeName?: string;
    priority: "urgent" | "normal" | "low";
    steps: {
      id: string;
      title: string;
      description: string;
      categoryId: string;
      categoryName: string;
      categoryIcon: string;
      assignees: { userId: string; userName: string }[];
      isBlocking: boolean;
      dueDays: number;
    }[];
  }) => {
    createWorkflow(data, currentUser.id, currentUser.name);
  };

  const selectedStore = selectedStoreId
    ? stores.find((s) => s.id === selectedStoreId)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <ListTodo className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">משימות</h1>
              <p className="text-sm text-gray-500">
                סה״כ {myTasksCount + myWorkflowsCount} משימות
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <DemoUserSwitcher />

          <Link
            href="/dashboard/faults"
            className="flex items-center gap-2 px-3 py-2 bg-orange-100 hover:bg-orange-200 rounded-lg transition-colors"
            title="דיווח תקלות"
          >
            <Bug className="w-5 h-5 text-orange-600" />
            <span className="hidden sm:inline text-sm font-medium text-orange-700">
              תקלות
            </span>
          </Link>

          <Link
            href="/dashboard/tasks/analytics"
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="ניתוח משימות"
          >
            <BarChart3 className="w-5 h-5 text-gray-600" />
            <span className="hidden sm:inline text-sm font-medium text-gray-700">
              ניתוח
            </span>
          </Link>

          <button
            onClick={() => setShowWorkflowModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-xl font-medium hover:bg-purple-200 transition-colors"
            title="משימה מורכבת"
          >
            <List className="w-5 h-5" />
            <span className="hidden sm:inline">מורכבת</span>
          </button>

          <button
            onClick={handleCreateTask}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">משימה חדשה</span>
          </button>
        </div>
      </div>

      {/* Quick Stats - Clickable */}
      <TaskStatsCards
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* Assignee Filter */}
      <div className="relative" ref={assigneeDropdownRef}>
        <button
          onClick={() => setShowAssigneeDropdown((v) => !v)}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Users className="w-4 h-4 text-gray-500" />
          {assigneeFilter.length === 0
            ? "סנן לפי מוקצה"
            : `${assigneeFilter.length} מוקצ${assigneeFilter.length === 1 ? "ה" : "ים"} נבחר${assigneeFilter.length === 1 ? "" : "ו"}`}
          <ChevronDown className="w-4 h-4 text-gray-400" />
          {assigneeFilter.length > 0 && (
            <span
              onClick={(e) => { e.stopPropagation(); setAssigneeFilter([]); }}
              className="ml-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3 h-3" />
            </span>
          )}
        </button>

        {showAssigneeDropdown && (
          <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-[calc(env(safe-area-inset-top)+3.25rem)] sm:top-full sm:mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-2 sm:min-w-52 max-h-64 overflow-y-auto">
            <div className="text-xs text-gray-400 px-2 py-1 mb-1">בחר מוקצים להצגה</div>
            {allUsers.filter((u) => u.id !== "anon").map((user) => (
              <label key={user.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={assigneeFilter.includes(user.id)}
                  onChange={() =>
                    setAssigneeFilter((prev) =>
                      prev.includes(user.id)
                        ? prev.filter((id) => id !== user.id)
                        : [...prev, user.id],
                    )
                  }
                  className="w-4 h-4 accent-primary-600"
                />
                <span className="text-base">{user.avatar}</span>
                <span className="text-sm text-gray-800">{user.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Unified Tasks List */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <UnifiedTasksList
          filter={activeFilter}
          onTaskClick={setSelectedTask}
          onWorkflowClick={setSelectedWorkflowId}
          assigneeFilter={assigneeFilter}
        />
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          isOpen={true}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedStoreId(null);
            setSelectedStoreNameFromSession(null);
          }}
          storeId={selectedStore?.id ?? selectedStoreId ?? undefined}
          storeName={
            selectedStore?.name ?? selectedStoreNameFromSession ?? undefined
          }
          stores={stores}
        />
      )}

      {/* Create Workflow Modal */}
      <CreateWorkflowModal
        isOpen={showWorkflowModal}
        onClose={() => setShowWorkflowModal(false)}
        onSubmit={handleCreateWorkflow}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
      />

      {/* Workflow Detail Modal */}
      <WorkflowDetailModal
        workflowId={selectedWorkflowId}
        onClose={() => setSelectedWorkflowId(null)}
      />
    </div>
  );
}
