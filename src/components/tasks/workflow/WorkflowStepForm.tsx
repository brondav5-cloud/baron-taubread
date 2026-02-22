"use client";

import { useState } from "react";
import { X, AlertTriangle, Plus, Trash2, Calendar } from "lucide-react";
import { clsx } from "clsx";
import { useUsers } from "@/context/UsersContext";

interface StepFormData {
  title: string;
  description: string;
  categoryId: string;
  assigneeIds: string[];
  isBlocking: boolean;
  dueDays: number;
  dueDate?: string;
  checklist: string[];
}

interface WorkflowStepFormProps {
  onAdd: (data: StepFormData) => void;
  onCancel: () => void;
  stepNumber: number;
}

export function WorkflowStepForm({
  onAdd,
  onCancel,
  stepNumber,
}: WorkflowStepFormProps) {
  const { categories, allUsers } = useUsers();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isBlocking, setIsBlocking] = useState(false);
  const [dueType, setDueType] = useState<"days" | "date">("days");
  const [dueDays, setDueDays] = useState(1);
  const [dueDate, setDueDate] = useState("");
  const [checklist, setChecklist] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");

  const handleSubmit = () => {
    if (!title.trim() || !categoryId || selectedUsers.length === 0) return;

    onAdd({
      title: title.trim(),
      description: description.trim(),
      categoryId,
      assigneeIds: selectedUsers,
      isBlocking,
      dueDays: dueType === "days" ? dueDays : 0,
      dueDate: dueType === "date" ? dueDate : undefined,
      checklist,
    });
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setChecklist([...checklist, newChecklistItem.trim()]);
      setNewChecklistItem("");
    }
  };

  const removeChecklistItem = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  const activeCategories = categories.filter((c) => c.isActive);
  const isValid = title.trim() && categoryId && selectedUsers.length > 0;

  return (
    <div className="border-2 border-dashed border-primary-300 rounded-xl p-4 bg-primary-50/50">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900">שלב {stepNumber}</h4>
        <button onClick={onCancel} className="p-1 hover:bg-gray-200 rounded">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="space-y-3">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="כותרת השלב *"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />

        {/* Category */}
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">בחר קטגוריה *</option>
          {activeCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>

        {/* Assignees */}
        <div>
          <p className="text-sm text-gray-600 mb-2">אחראים *</p>
          <div className="flex flex-wrap gap-2">
            {allUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => toggleUser(user.id)}
                className={clsx(
                  "px-2 py-1 rounded-lg text-xs font-medium transition-colors",
                  selectedUsers.includes(user.id)
                    ? "bg-primary-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                )}
              >
                {user.avatar} {user.name}
              </button>
            ))}
          </div>
        </div>

        {/* Due Date / Days */}
        <div className="p-3 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">
              מועד יעד לטיפול
            </span>
          </div>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setDueType("days")}
              className={clsx(
                "px-3 py-1.5 text-xs rounded-lg",
                dueType === "days"
                  ? "bg-primary-100 text-primary-700"
                  : "bg-gray-100",
              )}
            >
              מספר ימים
            </button>
            <button
              type="button"
              onClick={() => setDueType("date")}
              className={clsx(
                "px-3 py-1.5 text-xs rounded-lg",
                dueType === "date"
                  ? "bg-primary-100 text-primary-700"
                  : "bg-gray-100",
              )}
            >
              תאריך ספציפי
            </button>
          </div>
          {dueType === "days" ? (
            <select
              value={dueDays}
              onChange={(e) => setDueDays(Number(e.target.value))}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              <option value={1}>יום אחד</option>
              <option value={2}>יומיים</option>
              <option value={3}>3 ימים</option>
              <option value={5}>5 ימים</option>
              <option value={7}>שבוע</option>
              <option value={14}>שבועיים</option>
            </select>
          ) : (
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            />
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            תיאור מפורט
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="הוסף פרטים נוספים על השלב..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
          />
        </div>

        {/* Checklist */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            צ׳קליסט (אופציונלי)
          </label>
          {checklist.length > 0 && (
            <div className="space-y-1 mb-2">
              {checklist.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-white px-2 py-1 rounded"
                >
                  <span className="text-sm flex-1">{item}</span>
                  <button
                    type="button"
                    onClick={() => removeChecklistItem(idx)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={newChecklistItem}
              onChange={(e) => setNewChecklistItem(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && (e.preventDefault(), addChecklistItem())
              }
              placeholder="הוסף פריט..."
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <button
              type="button"
              onClick={addChecklistItem}
              disabled={!newChecklistItem.trim()}
              className="px-2 py-1 bg-gray-100 rounded text-sm disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Blocking */}
        <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white border border-gray-200">
          <input
            type="checkbox"
            checked={isBlocking}
            onChange={(e) => setIsBlocking(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
          />
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-sm">שלב חוסם (השלבים הבאים יחכו להשלמתו)</span>
        </label>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-sm"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid}
            className="flex-1 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            הוסף שלב
          </button>
        </div>
      </div>
    </div>
  );
}
