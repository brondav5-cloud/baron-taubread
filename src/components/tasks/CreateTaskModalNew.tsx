"use client";

import { X } from "lucide-react";
import { CategoryEditModal } from "@/components/settings/task-categories";
import {
  TaskTypeSelector,
  CategorySelector,
  PrioritySelector,
  DueDateSelector,
  AssigneesSelector,
  ChecklistEditor,
  useCreateTaskForm,
} from "./create-task-modal";

interface StoreOption {
  id: number;
  name: string;
  city?: string;
  agent?: string;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId?: number;
  storeName?: string;
  visitId?: string;
  stores?: StoreOption[];
}

export function CreateTaskModal({
  isOpen,
  onClose,
  storeId: initialStoreId,
  storeName: initialStoreName,
  visitId,
  stores = [],
}: CreateTaskModalProps) {
  const form = useCreateTaskForm({
    initialStoreId,
    initialStoreName,
    visitId,
    isOpen,
    onClose,
    stores,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">משימה חדשה</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={form.handleSubmit}
          className="overflow-y-auto max-h-[calc(90vh-140px)]"
        >
          <div className="p-4 space-y-4">
            {/* Task Type & Store */}
            <TaskTypeSelector
              taskType={form.taskType}
              onTaskTypeChange={form.setTaskType}
              storeId={form.storeId}
              storeName={form.storeName}
              initialStoreName={initialStoreName}
              onStoreSelect={form.handleStoreSelect}
              onStoreNameChange={form.setStoreName}
              stores={form.stores}
            />

            {/* Category */}
            <CategorySelector
              categories={form.activeCategories}
              selectedCategoryId={form.categoryId}
              onCategoryChange={form.setCategoryId}
              onAddCategory={() => form.setShowAddCategoryModal(true)}
            />

            {/* Priority */}
            <PrioritySelector
              priority={form.priority}
              onPriorityChange={form.setPriority}
            />

            {/* Due Date */}
            <DueDateSelector
              dueOption={form.dueOption}
              customDueDate={form.customDueDate}
              onDueOptionChange={form.setDueOption}
              onCustomDateChange={form.setCustomDueDate}
            />

            {/* Assignees */}
            <AssigneesSelector
              selectedAssignees={form.selectedAssignees}
              availableUsers={form.availableUsers}
              hasPrimary={form.hasPrimary}
              onAddAssignee={form.handleAddAssignee}
              onRemoveAssignee={form.handleRemoveAssignee}
            />

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                כותרת *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => form.setTitle(e.target.value)}
                placeholder="תאר את הבעיה בקצרה..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                תיאור מפורט
              </label>
              <textarea
                value={form.description}
                onChange={(e) => form.setDescription(e.target.value)}
                placeholder="הוסף פרטים נוספים..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
              />
            </div>

            {/* Checklist */}
            <ChecklistEditor
              items={form.checklistItems}
              newItem={form.newChecklistItem}
              onNewItemChange={form.setNewChecklistItem}
              onAddItem={form.handleAddChecklistItem}
              onRemoveItem={form.handleRemoveChecklistItem}
            />

            {/* Notification Toggles */}
            {form.selectedAssignees.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                <p className="text-xs font-medium text-gray-500">שלח התראה למוקצים</p>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.notifyEmail}
                      onChange={(e) => form.setNotifyEmail(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">✉️</span>
                    <span className="text-sm text-gray-700">מייל</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.notifySms}
                      onChange={(e) => form.setNotifySms(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">📱</span>
                    <span className="text-sm text-gray-700">SMS</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-4 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-100"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={!form.isValid}
              className="flex-1 py-2.5 px-4 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              צור משימה
            </button>
          </div>
        </form>
      </div>

      {/* Add Category Modal */}
      <CategoryEditModal
        isOpen={form.showAddCategoryModal}
        onClose={() => form.setShowAddCategoryModal(false)}
        category={null}
      />
    </div>
  );
}
