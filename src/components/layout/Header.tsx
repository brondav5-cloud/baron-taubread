"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  Bell,
  Plus,
  ChevronDown,
  User,
  Settings,
  LogOut,
  ListTodo,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { clsx } from "clsx";
import GlobalSearch from "./GlobalSearch";
import CompanyPicker from "./CompanyPicker";
import { useUsers } from "@/context/UsersContext";
import { useTasks } from "@/context/TasksContext";
import { usePush } from "@/context/PushNotificationContext";
import { createClient } from "@/lib/supabase/client";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setShowUserMenu(false);
    router.push("/login");
    router.refresh();
  };
  const [showNotifications, setShowNotifications] = useState(false);

  const { currentUser } = useUsers();
  const { tasks, getUnreadCount, getPendingApprovalCount, getOverdueTasks } =
    useTasks();
  const push = usePush();

  const unreadCount = getUnreadCount(currentUser.id);
  const pendingCount = getPendingApprovalCount(currentUser.id);
  const overdueCount = getOverdueTasks(currentUser.id).length;
  const totalNotifications = unreadCount + pendingCount + overdueCount;

  // Get recent tasks for notifications
  const myNewTasks = tasks
    .filter((t) =>
      t.assignees.some(
        (a) => a.userId === currentUser.id && a.status === "new",
      ),
    )
    .slice(0, 3);

  const myPendingApproval = tasks
    .filter((t) => t.createdBy === currentUser.id && t.status === "done")
    .slice(0, 3);

  const handleAddVisit = () => {
    router.push("/dashboard/visits/new");
  };

  const handleGoToTasks = () => {
    setShowNotifications(false);
    router.push("/dashboard/tasks");
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-200 pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 lg:px-6 gap-1 sm:gap-2">
        {/* Right side (RTL start) */}
        <div className="flex items-center gap-1 sm:gap-4 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          <CompanyPicker />
          <div className="flex-1 min-w-0 max-w-full">
            <GlobalSearch />
          </div>
        </div>

        {/* Left side (RTL end) */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 shrink-0">
          <button
            onClick={handleAddVisit}
            className="flex items-center justify-center gap-2 p-1.5 sm:px-4 sm:py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
            title="הוסף ביקור"
            aria-label="הוסף ביקור"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline">הוסף ביקור</span>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {totalNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 flex items-center justify-center px-1.5 bg-red-500 text-white text-xs font-bold rounded-full">
                  {totalNotifications > 99 ? "99+" : totalNotifications}
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="fixed sm:absolute left-2 right-2 sm:left-0 sm:right-auto top-16 sm:top-auto mt-0 sm:mt-2 w-auto sm:w-80 bg-white rounded-xl shadow-elevated border border-gray-100 z-20 animate-scale-in">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      התראות משימות
                    </h3>
                    <span className="text-xs text-gray-500">
                      {currentUser.name}
                    </span>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {/* Push Permission Banner */}
                    {push && push.isSupported && !push.isSubscribed && push.state !== "denied" && (
                      <div className="p-3 bg-amber-50 border-b border-amber-200">
                        <p className="text-sm text-amber-800 mb-2">
                          הפעל התראות כדי לקבל עדכונים על משימות ותקלות
                        </p>
                        <button
                          onClick={() => void push.subscribe()}
                          className="w-full px-3 py-1.5 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors"
                        >
                          🔔 הפעל התראות
                        </button>
                      </div>
                    )}
                    {push && push.state === "denied" && (
                      <div className="p-3 bg-red-50 border-b border-red-200">
                        <p className="text-xs text-red-700">
                          ההתראות חסומות בדפדפן. יש לשנות בהגדרות הדפדפן.
                        </p>
                      </div>
                    )}
                    {push && push.isSubscribed && (
                      <div className="p-2 border-b border-gray-100">
                        <button
                          onClick={() => {
                            fetch("/api/push/test", { method: "POST" })
                              .then((r) => r.json())
                              .then((d) => {
                                if (d.sent > 0) {
                                  alert("התראת בדיקה נשלחה! בדוק אם הגיעה.");
                                } else {
                                  alert(`לא נשלח: sent=${d.sent}, hasVapidKeys=${d.hasVapidKeys}`);
                                }
                              })
                              .catch((e) => alert("שגיאה: " + e.message));
                          }}
                          className="w-full px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          שלח התראת בדיקה לעצמי
                        </button>
                      </div>
                    )}

                    {/* New Tasks */}
                    {unreadCount > 0 && (
                      <div className="p-3 bg-blue-50 border-b border-blue-100">
                        <div className="flex items-center gap-2 text-blue-700 mb-2">
                          <ListTodo className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {unreadCount} משימות חדשות
                          </span>
                        </div>
                        {myNewTasks.map((task) => (
                          <div
                            key={task.id}
                            onClick={handleGoToTasks}
                            className="p-2 bg-white rounded-lg mb-1 last:mb-0 cursor-pointer hover:bg-blue-100 transition-colors"
                          >
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {task.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              מ: {task.createdByName}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pending Approval */}
                    {pendingCount > 0 && (
                      <div className="p-3 bg-emerald-50 border-b border-emerald-100">
                        <div className="flex items-center gap-2 text-emerald-700 mb-2">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {pendingCount} ממתינות לאישורך
                          </span>
                        </div>
                        {myPendingApproval.map((task) => (
                          <div
                            key={task.id}
                            onClick={handleGoToTasks}
                            className="p-2 bg-white rounded-lg mb-1 last:mb-0 cursor-pointer hover:bg-emerald-100 transition-colors"
                          >
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {task.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              טופל ע״י:{" "}
                              {
                                task.assignees.find((a) => a.status === "done")
                                  ?.userName
                              }
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Overdue */}
                    {overdueCount > 0 && (
                      <div className="p-3 bg-red-50 border-b border-red-100">
                        <div className="flex items-center gap-2 text-red-700">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {overdueCount} משימות באיחור
                          </span>
                        </div>
                      </div>
                    )}

                    {/* No Notifications */}
                    {totalNotifications === 0 && (
                      <div className="p-8 text-center">
                        <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          אין התראות חדשות
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="p-3 border-t border-gray-100">
                    <button
                      onClick={handleGoToTasks}
                      className="w-full text-center text-sm text-primary-600 font-medium hover:text-primary-700"
                    >
                      צפה בכל המשימות
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-lg">{currentUser.avatar}</span>
              </div>
              <ChevronDown
                className={clsx(
                  "w-4 h-4 text-gray-400 transition-transform hidden sm:block",
                  showUserMenu && "rotate-180",
                )}
              />
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="fixed sm:absolute left-2 right-2 sm:left-0 sm:right-auto top-16 sm:top-auto mt-0 sm:mt-2 w-auto sm:w-56 bg-white rounded-xl shadow-elevated border border-gray-100 z-20 animate-scale-in">
                  <div className="p-4 border-b border-gray-100">
                    <p className="font-medium text-gray-900">
                      {currentUser.name}
                    </p>
                    <p className="text-sm text-gray-500">{currentUser.email}</p>
                    <p className="text-xs text-primary-600 mt-1">
                      {currentUser.department}
                    </p>
                  </div>
                  <div className="p-2">
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                      <User className="w-4 h-4" />
                      הפרופיל שלי
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                      <Settings className="w-4 h-4" />
                      הגדרות
                    </button>
                  </div>
                  <div className="p-2 border-t border-gray-100">
                    <button
                      onClick={() => void handleSignOut()}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      התנתק
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
