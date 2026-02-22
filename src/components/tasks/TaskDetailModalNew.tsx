"use client";

import { X, Store, Check, ClipboardList, Calendar } from "lucide-react";
import { clsx } from "clsx";
import type { Task } from "@/types/task";
import {
  TaskStatusBadge,
  TaskPriorityBadge,
  TaskCategoryBadge,
  OverdueBadge,
} from "./TaskBadges";
import {
  DetailsTab,
  ChecklistTab,
  CommentsTab,
  HistoryTab,
  TaskActions,
  useTaskDetail,
  type TabType,
} from "./task-detail-modal";

interface TaskDetailModalProps {
  task: Task | null;
  onClose: () => void;
}

export function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {
  const {
    activeTab,
    setActiveTab,
    newComment,
    setNewComment,
    completeResponse,
    setCompleteResponse,
    rejectReason,
    setRejectReason,
    showRejectForm,
    setShowRejectForm,
    currentTask,
    isAssignee,
    isCreator,
    myStatus,
    canEditChecklist,
    canEditAssignees,
    handleStartTask,
    handleCompleteTask,
    handleApproveTask,
    handleRejectTask,
    handleToggleChecklist,
    handleAddComment,
    handleAddAssignee,
    handleRemoveAssignee,
  } = useTaskDetail({ task, onClose });

  if (!currentTask) return null;

  const tabs: {
    id: TabType;
    label: string;
    icon: React.ElementType;
    count?: number;
  }[] = [
    { id: "details", label: "פרטים", icon: Store },
    {
      id: "checklist",
      label: "צ'קליסט",
      icon: Check,
      count: currentTask.checklist.length,
    },
    {
      id: "comments",
      label: "הערות",
      icon: ClipboardList,
      count: currentTask.comments.length,
    },
    {
      id: "history",
      label: "היסטוריה",
      icon: Calendar,
      count: currentTask.history.length,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-100">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <TaskStatusBadge status={currentTask.status} />
              <TaskPriorityBadge priority={currentTask.priority} />
              <TaskCategoryBadge
                icon={currentTask.categoryIcon}
                name={currentTask.categoryName}
              />
              <OverdueBadge
                dueDate={currentTask.dueDate}
                status={currentTask.status}
              />
            </div>
            <h2 className="text-lg font-bold text-gray-900">
              {currentTask.title}
            </h2>
            <p className="text-sm text-gray-500">{currentTask.storeName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium",
                activeTab === tab.id
                  ? "text-primary-600 border-b-2 border-primary-600"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "details" && (
            <DetailsTab
              task={currentTask}
              canEdit={canEditAssignees}
              onAddAssignee={handleAddAssignee}
              onRemoveAssignee={handleRemoveAssignee}
            />
          )}
          {activeTab === "checklist" && (
            <ChecklistTab
              task={currentTask}
              onToggle={handleToggleChecklist}
              canEdit={canEditChecklist}
            />
          )}
          {activeTab === "comments" && (
            <CommentsTab
              task={currentTask}
              newComment={newComment}
              onNewCommentChange={setNewComment}
              onAddComment={handleAddComment}
            />
          )}
          {activeTab === "history" && <HistoryTab task={currentTask} />}
        </div>

        {/* Actions */}
        <TaskActions
          task={currentTask}
          isAssignee={isAssignee}
          isCreator={isCreator}
          myStatus={myStatus}
          showRejectForm={showRejectForm}
          completeResponse={completeResponse}
          rejectReason={rejectReason}
          onCompleteResponseChange={setCompleteResponse}
          onRejectReasonChange={setRejectReason}
          onShowRejectForm={setShowRejectForm}
          onStartTask={handleStartTask}
          onCompleteTask={handleCompleteTask}
          onApproveTask={handleApproveTask}
          onRejectTask={handleRejectTask}
        />
      </div>
    </div>
  );
}
