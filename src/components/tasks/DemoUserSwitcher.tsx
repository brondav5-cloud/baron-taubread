"use client";

import { useUsers } from "@/context/UsersContext";

export function DemoUserSwitcher() {
  const { currentUser } = useUsers();

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-50 border border-primary-200">
      <span className="text-xl">{currentUser.avatar || "👤"}</span>
      <div className="text-right">
        <p className="text-sm font-medium text-gray-900">{currentUser.name}</p>
        <p className="text-xs text-gray-500">{currentUser.department}</p>
      </div>
    </div>
  );
}
