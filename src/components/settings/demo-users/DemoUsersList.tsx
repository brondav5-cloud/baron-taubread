"use client";

import { useState } from "react";
import { Edit2, RefreshCw } from "lucide-react";
import { useDemoUser } from "@/context/DemoUserContext";
import { DEMO_USER_ROLE_CONFIG } from "@/types/task";
import { DemoUserEditModal } from "./DemoUserEditModal";

export function DemoUsersList() {
  const { allUsers, resetUsers } = useDemoUser();
  const [editingUser, setEditingUser] = useState<(typeof allUsers)[0] | null>(
    null,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{allUsers.length} משתמשי דמו</p>
        <button
          onClick={resetUsers}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl"
          title="איפוס לברירת מחדל"
        >
          <RefreshCw className="w-4 h-4" />
          איפוס
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {allUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-4 p-4 hover:bg-gray-50"
            >
              <span className="text-2xl">{user.avatar}</span>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-500">
                  {DEMO_USER_ROLE_CONFIG[user.role].label} • {user.department}
                </p>
              </div>
              <button
                onClick={() => setEditingUser(user)}
                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                title="עריכה"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>
      <DemoUserEditModal
        user={editingUser}
        onClose={() => setEditingUser(null)}
      />
    </div>
  );
}
