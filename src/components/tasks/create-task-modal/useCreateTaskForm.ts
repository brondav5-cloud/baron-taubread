import { useState, useEffect, useCallback } from "react";
import { useUsers, type AppUser } from "@/context/UsersContext";
import { useTasks } from "@/context/TasksContext";
import type { TaskPriority } from "@/types/task";

// ============================================
// TYPES
// ============================================

export interface SelectedAssignee {
  userId: string;
  userName: string;
  role: "primary" | "secondary";
}

export type DueOption = "today" | "tomorrow" | "week" | "custom";
export type ScheduleOption = "immediate" | "future";

export interface CreateTaskFormState {
  taskType: "store" | "general";
  storeId: number | undefined;
  storeName: string | undefined;
  categoryId: string;
  priority: TaskPriority;
  dueOption: DueOption;
  customDueDate: string;
  selectedAssignees: SelectedAssignee[];
  title: string;
  description: string;
  checklistItems: string[];
  newChecklistItem: string;
}

export interface StoreOption {
  id: number;
  name: string;
  city?: string;
  agent?: string;
}

export interface UseCreateTaskFormProps {
  initialStoreId?: number;
  initialStoreName?: string;
  visitId?: string;
  isOpen: boolean;
  onClose: () => void;
  stores?: StoreOption[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateDueDate(dueOption: DueOption, customDueDate: string): string {
  const now = new Date();

  switch (dueOption) {
    case "today":
      now.setHours(23, 59, 59, 999);
      return now.toISOString();
    case "tomorrow":
      now.setDate(now.getDate() + 1);
      now.setHours(23, 59, 59, 999);
      return now.toISOString();
    case "week":
      now.setDate(now.getDate() + 7);
      now.setHours(23, 59, 59, 999);
      return now.toISOString();
    case "custom":
      if (customDueDate) {
        const custom = new Date(customDueDate);
        custom.setHours(23, 59, 59, 999);
        return custom.toISOString();
      }
      now.setHours(23, 59, 59, 999);
      return now.toISOString();
    default:
      now.setHours(23, 59, 59, 999);
      return now.toISOString();
  }
}

// ============================================
// HOOK
// ============================================

export function useCreateTaskForm({
  initialStoreId,
  initialStoreName,
  visitId,
  isOpen,
  onClose,
  stores = [],
}: UseCreateTaskFormProps) {
  const { currentUser, allUsers, categories } = useUsers();
  const { createTask } = useTasks();

  // Form state
  const [taskType, setTaskType] = useState<"store" | "general">(
    initialStoreId ? "store" : "general",
  );
  const [storeId, setStoreId] = useState<number | undefined>(initialStoreId);
  const [storeName, setStoreName] = useState<string | undefined>(
    initialStoreName,
  );
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [dueOption, setDueOption] = useState<DueOption>("today");
  const [customDueDate, setCustomDueDate] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<
    SelectedAssignee[]
  >([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [notifySms, setNotifySms] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [scheduleOption, setScheduleOption] =
    useState<ScheduleOption>("immediate");
  const [futureStartAt, setFutureStartAt] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTaskType(initialStoreId ? "store" : "general");
      setStoreId(initialStoreId);
      setStoreName(initialStoreName);
      setCategoryId("");
      setPriority("normal");
      setDueOption("today");
      setCustomDueDate("");
      setSelectedAssignees([]);
      setTitle("");
      setDescription("");
      setChecklistItems([]);
      setNewChecklistItem("");
      setNotifyEmail(false);
      setNotifySms(false);
      setIsPrivate(false);
      setScheduleOption("immediate");
      setFutureStartAt("");
    }
  }, [isOpen, initialStoreId, initialStoreName]);

  // Auto-add default assignee when category changes
  useEffect(() => {
    const category = categories.find((c) => c.id === categoryId);
    if (category?.defaultAssigneeId && selectedAssignees.length === 0) {
      setSelectedAssignees([
        {
          userId: category.defaultAssigneeId,
          userName: category.defaultAssigneeName || "",
          role: "primary",
        },
      ]);
    }
  }, [categoryId, categories, selectedAssignees.length]);

  // Handlers
  const handleTaskTypeChange = useCallback((type: "store" | "general") => {
    setTaskType(type);
    if (type === "general") {
      setStoreId(undefined);
      setStoreName(undefined);
    }
  }, []);

  const handleAddAssignee = useCallback(
    (user: AppUser, role: "primary" | "secondary") => {
      setSelectedAssignees((prev) => {
        if (prev.some((a) => a.userId === user.id)) return prev;
        return [...prev, { userId: user.id, userName: user.name, role }];
      });
    },
    [],
  );

  const handleRemoveAssignee = useCallback((userId: string) => {
    setSelectedAssignees((prev) => prev.filter((a) => a.userId !== userId));
  }, []);

  const handleAddChecklistItem = useCallback(() => {
    if (newChecklistItem.trim()) {
      setChecklistItems((prev) => [...prev, newChecklistItem.trim()]);
      setNewChecklistItem("");
    }
  }, [newChecklistItem]);

  const handleRemoveChecklistItem = useCallback((index: number) => {
    setChecklistItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleStoreSelect = useCallback(
    (storeId: number, storeName: string) => {
      setStoreId(storeId);
      setStoreName(storeName);
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const category = categories.find((c) => c.id === categoryId);
      if (!category || selectedAssignees.length === 0 || !title.trim()) return;

      createTask(
        {
          taskType,
          storeId: taskType === "store" ? storeId : undefined,
          storeName: taskType === "store" ? storeName : undefined,
          visitId,
          categoryId: category.id,
          categoryName: category.name,
          categoryIcon: category.icon,
          priority,
          title: title.trim(),
          description: description.trim(),
          assignees: selectedAssignees,
          checklist: checklistItems.map((text) => ({ text })),
          dueDate: calculateDueDate(dueOption, customDueDate),
          notifyEmail,
          notifySms,
          isPrivate,
          startsAt:
            scheduleOption === "future" && futureStartAt
              ? new Date(futureStartAt).toISOString()
              : undefined,
        },
        currentUser.id,
        currentUser.name,
      );

      onClose();
    },
    [
      categories,
      categoryId,
      selectedAssignees,
      title,
      taskType,
      storeId,
      storeName,
      visitId,
      priority,
      description,
      checklistItems,
      dueOption,
      customDueDate,
      notifyEmail,
      notifySms,
      isPrivate,
      scheduleOption,
      futureStartAt,
      currentUser,
      createTask,
      onClose,
    ],
  );

  // Computed values
  const availableUsers = allUsers.filter(
    (u) =>
      u.id !== currentUser.id &&
      !selectedAssignees.some((a) => a.userId === u.id),
  );
  const hasPrimary = selectedAssignees.some((a) => a.role === "primary");
  const isValid =
    categoryId &&
    selectedAssignees.length > 0 &&
    title.trim() &&
    hasPrimary &&
    (scheduleOption === "immediate" || !!futureStartAt);
  const activeCategories = categories.filter((c) => c.isActive);

  return {
    // State
    taskType,
    storeId,
    storeName,
    categoryId,
    priority,
    dueOption,
    customDueDate,
    selectedAssignees,
    title,
    description,
    checklistItems,
    newChecklistItem,
    showAddCategoryModal,
    notifyEmail,
    notifySms,
    scheduleOption,
    futureStartAt,

    // Setters
    setTaskType: handleTaskTypeChange,
    setStoreId,
    setStoreName,
    setCategoryId,
    setPriority,
    setDueOption,
    setCustomDueDate,
    setTitle,
    setDescription,
    setNewChecklistItem,
    setShowAddCategoryModal,
    setNotifyEmail,
    setNotifySms,
    isPrivate,
    setIsPrivate,
    setScheduleOption,
    setFutureStartAt,

    // Handlers
    handleAddAssignee,
    handleRemoveAssignee,
    handleAddChecklistItem,
    handleRemoveChecklistItem,
    handleStoreSelect,
    handleSubmit,

    // Computed
    stores,
    availableUsers,
    hasPrimary,
    isValid,
    activeCategories,
    allUsers,
    currentUser,
  };
}
