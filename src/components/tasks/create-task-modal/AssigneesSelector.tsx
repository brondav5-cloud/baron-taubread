"use client";

import { useState } from "react";
import { Users, X, Search } from "lucide-react";
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
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? availableUsers.filter((u) =>
        u.name?.toLowerCase().includes(search.toLowerCase()),
      )
    : availableUsers;

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

      {/* Search input */}
      {availableUsers.length > 0 && (
        <div className="relative mb-1">
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חפש לפי שם..."
            className="w-full pr-8 pl-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            dir="rtl"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* User list */}
      {availableUsers.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-32 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">
                לא נמצאו משתמשים
              </p>
            ) : (
              filtered.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex-shrink-0">{user.avatar}</span>
                    <span className="text-sm truncate">{user.name}</span>
                    {user.department && (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        ({user.department})
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0 mr-2">
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
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
