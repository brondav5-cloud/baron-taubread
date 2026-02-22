"use client";

import { Users, X } from "lucide-react";
import { clsx } from "clsx";
import type { AppUser } from "@/context/UsersContext";
import type { SelectedAssignee } from "./useCreateTaskForm";

interface AssigneesSelectorProps {
  selectedAssignees: SelectedAssignee[];
  availableUsers: AppUser[];
  hasPrimary: boolean;
  onAddAssignee: (user: AppUser, role: "primary" | "secondary") => void;
  onRemoveAssignee: (userId: string) => void;
}

export function AssigneesSelector({
  selectedAssignees,
  availableUsers,
  hasPrimary,
  onAddAssignee,
  onRemoveAssignee,
}: AssigneesSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        <Users className="w-4 h-4 inline ml-1" />
        הקצה ל * (ניתן לבחור מספר אנשים)
      </label>

      {/* Selected Assignees */}
      {selectedAssignees.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedAssignees.map((assignee) => (
            <div
              key={assignee.userId}
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
                assignee.role === "primary"
                  ? "bg-primary-100 text-primary-700"
                  : "bg-gray-100 text-gray-700",
              )}
            >
              <span>{assignee.userName}</span>
              <span className="text-xs opacity-70">
                ({assignee.role === "primary" ? "ראשי" : "משני"})
              </span>
              <button
                type="button"
                onClick={() => onRemoveAssignee(assignee.userId)}
                className="hover:bg-black/10 rounded-full p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Assignee List */}
      {availableUsers.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-32 overflow-y-auto">
            {availableUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span>{user.avatar}</span>
                  <span className="text-sm">{user.name}</span>
                  <span className="text-xs text-gray-400">
                    ({user.department})
                  </span>
                </div>
                <div className="flex gap-1">
                  {!hasPrimary && (
                    <button
                      type="button"
                      onClick={() => onAddAssignee(user, "primary")}
                      className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                    >
                      ראשי
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      onAddAssignee(user, hasPrimary ? "secondary" : "primary")
                    }
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    {hasPrimary ? "משני" : "הוסף"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
