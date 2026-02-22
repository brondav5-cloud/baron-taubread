"use client";

import { useState } from "react";
import { X, Plus, List, Trash2, GripVertical } from "lucide-react";
import { clsx } from "clsx";
import { useUsers } from "@/context/UsersContext";
import type { TaskPriority } from "@/types/task";
import { TASK_PRIORITY_CONFIG } from "@/types/task";
import { WorkflowStepForm } from "./WorkflowStepForm";

interface StepData {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  assignees: { userId: string; userName: string }[];
  isBlocking: boolean;
  dueDays: number;
}

interface CreateWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    storeId?: number;
    storeName?: string;
    priority: TaskPriority;
    steps: StepData[];
  }) => void;
  storeId?: number;
  storeName?: string;
}

export function CreateWorkflowModal({
  isOpen,
  onClose,
  onSubmit,
  storeId,
  storeName,
}: CreateWorkflowModalProps) {
  const { categories, allUsers } = useUsers();

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [steps, setSteps] = useState<StepData[]>([]);
  const [showStepForm, setShowStepForm] = useState(false);

  const handleAddStep = (data: {
    title: string;
    description: string;
    categoryId: string;
    assigneeIds: string[];
    isBlocking: boolean;
    dueDays: number;
  }) => {
    const category = categories.find((c) => c.id === data.categoryId);
    if (!category) return;

    const newStep: StepData = {
      id: `step_${Date.now()}`,
      title: data.title,
      description: data.description,
      categoryId: data.categoryId,
      categoryName: category.name,
      categoryIcon: category.icon,
      assignees: data.assigneeIds.map((id) => {
        const user = allUsers.find((u) => u.id === id);
        return { userId: id, userName: user?.name || "" };
      }),
      isBlocking: data.isBlocking,
      dueDays: data.dueDays,
    };

    setSteps([...steps, newStep]);
    setShowStepForm(false);
  };

  const removeStep = (stepId: string) => {
    setSteps(steps.filter((s) => s.id !== stepId));
  };

  const handleSubmit = () => {
    if (!title.trim() || steps.length === 0) return;
    onSubmit({
      title: title.trim(),
      description: "",
      storeId,
      storeName,
      priority,
      steps,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b">
          <div className="p-2 bg-purple-100 rounded-xl">
            <List className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-gray-900">משימה מורכבת</h2>
            <p className="text-sm text-gray-500">צור משימה עם מספר שלבים</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              כותרת *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="לדוגמה: פיתוח מוצר חדש"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              דחיפות
            </label>
            <div className="flex gap-2">
              {(Object.keys(TASK_PRIORITY_CONFIG) as TaskPriority[]).map(
                (p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={clsx(
                      "flex-1 py-2 px-3 rounded-lg border-2 text-sm",
                      priority === p
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200",
                    )}
                  >
                    {TASK_PRIORITY_CONFIG[p].icon}{" "}
                    {TASK_PRIORITY_CONFIG[p].label}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Steps */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              שלבים ({steps.length})
            </label>

            {steps.length > 0 && (
              <div className="space-y-2 mb-3">
                {steps.map((step, idx) => (
                  <div
                    key={step.id}
                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
                  >
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs">
                      {idx + 1}
                    </span>
                    <span className="text-lg">{step.categoryIcon}</span>
                    <span className="flex-1 font-medium text-sm">
                      {step.title}
                    </span>
                    {step.isBlocking && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                        🔒 חוסם
                      </span>
                    )}
                    <button
                      onClick={() => removeStep(step.id)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showStepForm ? (
              <WorkflowStepForm
                stepNumber={steps.length + 1}
                onAdd={handleAddStep}
                onCancel={() => setShowStepForm(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowStepForm(true)}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-primary-400 hover:text-primary-600 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                הוסף שלב
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 rounded-xl"
          >
            ביטול
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || steps.length === 0}
            className="flex-1 py-2 bg-purple-600 text-white rounded-xl font-medium disabled:opacity-50"
          >
            צור משימה ({steps.length} שלבים)
          </button>
        </div>
      </div>
    </div>
  );
}
