"use client";

import { useState } from "react";
import { X, Users, Plus } from "lucide-react";
import { clsx } from "clsx";
import { useUsers } from "@/context/UsersContext";

interface Assignee {
  userId: string;
  userName: string;
  role?: "primary" | "secondary";
}

interface AssigneeManagerProps {
  assignees: Assignee[];
  canEdit: boolean;
  onAdd: (
    userId: string,
    userName: string,
    role: "primary" | "secondary",
  ) => void;
  onRemove: (userId: string) => void;
  minAssignees?: number;
}

export function AssigneeManager({
  assignees,
  canEdit,
  onAdd,
  onRemove,
  minAssignees = 1,
}: AssigneeManagerProps) {
  const { allUsers } = useUsers();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  // משתמשים שלא מוקצים עדיין
  const availableUsers = allUsers.filter(
    (user) => !assignees.some((a) => a.userId === user.id),
  );

  const handleAdd = () => {
    const user = allUsers.find((u) => u.id === selectedUserId);
    if (user) {
      onAdd(user.id, user.name, "secondary");
      setSelectedUserId("");
      setIsAdding(false);
    }
  };

  const canRemove = assignees.length > minAssignees;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Users className="w-4 h-4" />
        <span>מוקצים:</span>
      </div>

      {/* רשימת מוקצים */}
      <div className="flex flex-wrap gap-2">
        {assignees.map((assignee) => (
          <div
            key={assignee.userId}
            className={clsx(
              "flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm",
              assignee.role === "primary"
                ? "bg-primary-100 text-primary-700"
                : "bg-gray-100 text-gray-700",
            )}
          >
            <span>{assignee.userName}</span>
            {assignee.role === "primary" && (
              <span className="text-xs opacity-70">(ראשי)</span>
            )}
            {canEdit && canRemove && (
              <button
                onClick={() => onRemove(assignee.userId)}
                className="p-0.5 hover:bg-red-100 rounded text-red-500"
                title="הסר"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}

        {/* כפתור הוספה */}
        {canEdit && availableUsers.length > 0 && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 px-2 py-1 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600"
          >
            <Plus className="w-3 h-3" />
            הוסף
          </button>
        )}
      </div>

      {/* בורר משתמש */}
      {isAdding && (
        <div className="flex items-center gap-2 mt-2">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="flex-1 px-2 py-1.5 border rounded-lg text-sm"
          >
            <option value="">בחר משתמש...</option>
            {availableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.avatar} {user.name} ({user.department})
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!selectedUserId}
            className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            הוסף
          </button>
          <button
            onClick={() => {
              setIsAdding(false);
              setSelectedUserId("");
            }}
            className="px-3 py-1.5 border rounded-lg text-sm"
          >
            ביטול
          </button>
        </div>
      )}
    </div>
  );
}
