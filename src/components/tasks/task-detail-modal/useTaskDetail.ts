import { useState, useEffect, useCallback } from "react";
import { useUsers } from "@/context/UsersContext";
import { useTasks } from "@/context/TasksContext";
import type { Task } from "@/types/task";

export type TabType = "details" | "checklist" | "comments" | "history";

export interface UseTaskDetailProps {
  task: Task | null;
  onClose: () => void;
}

export function useTaskDetail({ task, onClose }: UseTaskDetailProps) {
  const [activeTab, setActiveTab] = useState<TabType>("details");
  const [newComment, setNewComment] = useState("");
  const [completeResponse, setCompleteResponse] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const { currentUser } = useUsers();
  const {
    markAsSeen,
    startTask,
    completeTask,
    approveTask,
    rejectTask,
    toggleChecklistItem,
    addComment,
    getTaskById,
    addAssignee,
    removeAssignee,
  } = useTasks();

  // Get fresh task from context
  const currentTask = task ? getTaskById(task.id) : null;

  const currentAssignee = currentTask?.assignees.find(
    (a) => a.userId === currentUser.id,
  );
  const isAssignee = !!currentAssignee;
  const isCreator = currentTask?.createdBy === currentUser.id;
  const myStatus = currentAssignee?.status;
  const isAdmin = currentUser.role === "admin";
  const canEditAssignees = isCreator || isAdmin;

  // Mark as seen when assignee opens
  useEffect(() => {
    if (currentTask && isAssignee && myStatus === "new") {
      markAsSeen(currentTask.id, currentUser.id, currentUser.name);
    }
  }, [
    currentTask,
    isAssignee,
    myStatus,
    markAsSeen,
    currentUser.id,
    currentUser.name,
  ]);

  // Handlers
  const handleStartTask = useCallback(() => {
    if (!currentTask) return;
    startTask(currentTask.id, currentUser.id, currentUser.name);
  }, [currentTask, startTask, currentUser.id, currentUser.name]);

  const handleCompleteTask = useCallback(() => {
    if (!currentTask || !completeResponse.trim()) return;
    completeTask(
      currentTask.id,
      currentUser.id,
      currentUser.name,
      completeResponse.trim(),
    );
    setCompleteResponse("");
    onClose();
  }, [
    currentTask,
    completeTask,
    currentUser.id,
    currentUser.name,
    completeResponse,
    onClose,
  ]);

  const handleApproveTask = useCallback(() => {
    if (!currentTask) return;
    approveTask(currentTask.id, currentUser.id, currentUser.name);
    onClose();
  }, [currentTask, approveTask, currentUser.id, currentUser.name, onClose]);

  const handleRejectTask = useCallback(() => {
    if (!currentTask || !rejectReason.trim()) return;
    rejectTask(
      currentTask.id,
      currentUser.id,
      currentUser.name,
      rejectReason.trim(),
    );
    setShowRejectForm(false);
    setRejectReason("");
  }, [currentTask, rejectTask, currentUser.id, currentUser.name, rejectReason]);

  const handleToggleChecklist = useCallback(
    (itemId: string) => {
      if (!currentTask) return;
      toggleChecklistItem(
        currentTask.id,
        itemId,
        currentUser.id,
        currentUser.name,
      );
    },
    [currentTask, toggleChecklistItem, currentUser.id, currentUser.name],
  );

  const handleAddComment = useCallback(() => {
    if (!currentTask || !newComment.trim()) return;
    addComment(
      currentTask.id,
      currentUser.id,
      currentUser.name,
      newComment.trim(),
    );
    setNewComment("");
  }, [currentTask, addComment, currentUser.id, currentUser.name, newComment]);

  const handleAddAssignee = useCallback(
    (userId: string, userName: string, role: "primary" | "secondary") => {
      if (!currentTask) return;
      addAssignee(
        currentTask.id,
        userId,
        userName,
        role,
        currentUser.id,
        currentUser.name,
      );
    },
    [currentTask, addAssignee, currentUser.id, currentUser.name],
  );

  const handleRemoveAssignee = useCallback(
    (userId: string) => {
      if (!currentTask) return;
      removeAssignee(currentTask.id, userId, currentUser.id, currentUser.name);
    },
    [currentTask, removeAssignee, currentUser.id, currentUser.name],
  );

  return {
    // State
    activeTab,
    newComment,
    completeResponse,
    rejectReason,
    showRejectForm,

    // Setters
    setActiveTab,
    setNewComment,
    setCompleteResponse,
    setRejectReason,
    setShowRejectForm,

    // Computed
    currentTask,
    isAssignee,
    isCreator,
    myStatus,
    canEditChecklist: isAssignee && currentTask?.status !== "approved",
    canEditAssignees,

    // Handlers
    handleStartTask,
    handleCompleteTask,
    handleApproveTask,
    handleRejectTask,
    handleToggleChecklist,
    handleAddComment,
    handleAddAssignee,
    handleRemoveAssignee,
  };
}
