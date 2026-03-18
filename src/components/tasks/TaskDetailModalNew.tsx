"use client";

import { useState } from "react";
import { X, Store, Check, ClipboardList, Calendar, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { AdminDeleteModal } from "@/components/shared/AdminDeleteModal";
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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
    expectedCompletionAtInput,
    setExpectedCompletionAtInput,
    progressUpdateText,
    setProgressUpdateText,
    confirmComplete,
    setConfirmComplete,
    currentTask,
    isAssignee,
    isCreator,
    myStatus,
    canEditChecklist,
    canManageTreatment,
    canEditAssignees,
    canDelete,
    handleStartTask,
    handleCompleteTask,
    handleApproveTask,
    handleRejectTask,
    handleToggleChecklist,
    handleAddComment,
    handleAddAssignee,
    handleRemoveAssignee,
    handleDeleteTask,
    handleUpdateExpectedCompletion,
    handleAddProgressUpdate,
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white w-full h-[100dvh] sm:h-auto sm:max-w-2xl sm:max-h-[90vh] rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-100 bg-white">
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
          <div className="flex items-center gap-1">
            {canDelete && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                title="מחק משימה"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 overflow-x-auto bg-white">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex-1 min-w-max flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium",
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
        <div className="flex-1 overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+120px)]">
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
          expectedCompletionAtInput={expectedCompletionAtInput}
          progressUpdateText={progressUpdateText}
          confirmComplete={confirmComplete}
          canManageTreatment={canManageTreatment}
          onCompleteResponseChange={setCompleteResponse}
          onRejectReasonChange={setRejectReason}
          onExpectedCompletionAtInputChange={setExpectedCompletionAtInput}
          onProgressUpdateTextChange={setProgressUpdateText}
          onConfirmCompleteChange={setConfirmComplete}
          onShowRejectForm={setShowRejectForm}
          onStartTask={handleStartTask}
          onCompleteTask={handleCompleteTask}
          onApproveTask={handleApproveTask}
          onRejectTask={handleRejectTask}
          onUpdateExpectedCompletion={handleUpdateExpectedCompletion}
          onAddProgressUpdate={handleAddProgressUpdate}
        />
      </div>

      <AdminDeleteModal
        isOpen={showDeleteModal}
        title="מחיקת משימה"
        description={`האם למחוק את "${currentTask.title}"? כל הנתונים, תגובות וההיסטוריה יימחקו לצמיתות.`}
        onConfirm={handleDeleteTask}
        onClose={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
