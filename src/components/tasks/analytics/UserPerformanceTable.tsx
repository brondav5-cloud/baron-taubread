"use client";

import { useMemo, useState } from "react";
import type { Task } from "@/types/task";
import type { AppUser } from "@/context/UsersContext";

interface UserPerformanceTableProps {
  tasks: Task[];
  users: AppUser[];
  onUserClick?: (userId: string, userName: string) => void;
}

interface UserStats {
  userId: string;
  userName: string;
  avatar: string;
  assigned: number;
  completed: number;
  inProgress: number;
  seenOnly: number;
  notTouched: number;
  completionRate: number;
}

export function UserPerformanceTable({ tasks, users, onUserClick }: UserPerformanceTableProps) {
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const userStats: UserStats[] = useMemo(() => {
    return users
      .filter((u) => u.id !== "anon")
      .map((user) => {
        const userAssignments = tasks.flatMap((task) =>
          task.assignees
            .filter((a) => a.userId === user.id)
            .map((a) => ({ task, assignee: a })),
        );

        const assigned = userAssignments.length;
        const completed = userAssignments.filter(
          (a) => a.assignee.status === "done" || a.assignee.status === "approved",
        ).length;
        const inProgress = userAssignments.filter(
          (a) => a.assignee.status === "in_progress",
        ).length;
        const seenOnly = userAssignments.filter(
          (a) => a.assignee.status === "seen",
        ).length;
        const notTouched = userAssignments.filter(
          (a) => a.assignee.status === "new",
        ).length;

        return {
          userId: user.id,
          userName: user.name,
          avatar: user.avatar,
          assigned,
          completed,
          inProgress,
          seenOnly,
          notTouched,
          completionRate: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
        };
      })
      .filter((u) => u.assigned > 0)
      .sort((a, b) => b.assigned - a.assigned);
  }, [tasks, users]);

  const getTasksForUser = (userId: string) =>
    tasks.filter((t) => t.assignees.some((a) => a.userId === userId));

  if (userStats.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-gray-400 text-sm">
        אין נתוני ביצועים לתקופה הנבחרת
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">ביצועים לפי משתמש</h3>
        <p className="text-xs text-gray-500 mt-0.5">כל המשימות שמוקצות לכל משתמש בתקופה</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-right px-4 py-3 font-medium text-gray-600">משתמש</th>
              <th className="text-center px-3 py-3 font-medium text-gray-600">הוקצו</th>
              <th className="text-center px-3 py-3 font-medium text-green-700">✅ הושלמו</th>
              <th className="text-center px-3 py-3 font-medium text-blue-700">⏳ בטיפול</th>
              <th className="text-center px-3 py-3 font-medium text-amber-700">👁 צפה בלבד</th>
              <th className="text-center px-3 py-3 font-medium text-red-700">❌ לא נגע</th>
              <th className="text-center px-3 py-3 font-medium text-gray-600">% השלמה</th>
            </tr>
          </thead>
          <tbody>
            {userStats.map((u) => (
              <>
                <tr
                  key={u.userId}
                  onClick={() => {
                    setExpandedUser(expandedUser === u.userId ? null : u.userId);
                    onUserClick?.(u.userId, u.userName);
                  }}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{u.avatar}</span>
                      <span className="font-medium text-gray-800">{u.userName}</span>
                    </div>
                  </td>
                  <td className="text-center px-3 py-3 font-semibold text-gray-700">{u.assigned}</td>
                  <td className="text-center px-3 py-3">
                    <span className={u.completed > 0 ? "text-green-600 font-medium" : "text-gray-300"}>
                      {u.completed}
                    </span>
                  </td>
                  <td className="text-center px-3 py-3">
                    <span className={u.inProgress > 0 ? "text-blue-600 font-medium" : "text-gray-300"}>
                      {u.inProgress}
                    </span>
                  </td>
                  <td className="text-center px-3 py-3">
                    <span className={u.seenOnly > 0 ? "text-amber-600 font-medium" : "text-gray-300"}>
                      {u.seenOnly}
                    </span>
                  </td>
                  <td className="text-center px-3 py-3">
                    {u.notTouched > 0 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 font-bold text-xs">
                        {u.notTouched}
                      </span>
                    ) : (
                      <span className="text-gray-300">0</span>
                    )}
                  </td>
                  <td className="text-center px-3 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${u.completionRate >= 80 ? "bg-green-500" : u.completionRate >= 50 ? "bg-amber-500" : "bg-red-400"}`}
                          style={{ width: `${u.completionRate}%` }}
                        />
                      </div>
                      <span className={`font-medium text-xs ${u.completionRate >= 80 ? "text-green-600" : u.completionRate >= 50 ? "text-amber-600" : "text-red-500"}`}>
                        {u.completionRate}%
                      </span>
                    </div>
                  </td>
                </tr>

                {expandedUser === u.userId && (
                  <tr key={`${u.userId}-expanded`}>
                    <td colSpan={7} className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        <p className="text-xs font-medium text-gray-500 mb-2">משימות של {u.userName}:</p>
                        {getTasksForUser(u.userId).map((task) => {
                          const myStatus = task.assignees.find((a) => a.userId === u.userId)?.status;
                          const statusEmoji =
                            myStatus === "approved" || myStatus === "done" ? "✅" :
                            myStatus === "in_progress" ? "⏳" :
                            myStatus === "seen" ? "👁" : "❌";
                          const isOverdue = new Date(task.dueDate) < new Date() && task.status !== "approved";
                          return (
                            <div key={task.id} className="flex items-center gap-2 text-xs text-gray-700 py-0.5">
                              <span>{statusEmoji}</span>
                              <span className={`flex-1 truncate ${isOverdue ? "text-red-600 font-medium" : ""}`}>
                                {task.title}
                              </span>
                              {isOverdue && <span className="text-red-400 shrink-0">⏰ באיחור</span>}
                              <span className="text-gray-400 shrink-0 dir-ltr">
                                {new Date(task.createdAt).toLocaleDateString("he-IL")}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
