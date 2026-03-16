"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Pencil, Plus, Trash2, RefreshCw, LogOut } from "lucide-react";
import { useUsers, type AppUser } from "@/context/UsersContext";
import { useAuth } from "@/hooks/useAuth";
import { UserEditModal } from "@/components/settings/users/UserEditModal";
import toast from "react-hot-toast";

interface TrackedUserActivity {
  userId: string;
  name: string;
  email: string;
  events24h: number;
  lastSeenAt: string | null;
  lastRoute: string | null;
}

interface ActivitySummaryRow {
  date: string;
  userId: string;
  name: string;
  email: string;
  loginCount: number;
  pageViews: number;
  heartbeatCount: number;
  activeMinutes: number;
  lastRoute: string | null;
  lastSeenAt: string | null;
}

export default function UsersSettingsPage() {
  const router = useRouter();
  const { allUsers, isLoading, removeUser, currentUser } = useUsers();
  const authState = useAuth();
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [showForceLogout, setShowForceLogout] = useState(false);
  const [forceLogoutMessage, setForceLogoutMessage] = useState(
    "יש לצאת מהמערכת לצורך עדכון. אנא שמור עבודתך והתנתק.",
  );
  const [forceLogoutMinutes, setForceLogoutMinutes] = useState(5);
  const [sendingForceLogout, setSendingForceLogout] = useState(false);
  const [clearingForceLogout, setClearingForceLogout] = useState(false);
  const [trackedEmail, setTrackedEmail] = useState("");
  const [trackedUsers, setTrackedUsers] = useState<TrackedUserActivity[]>([]);
  const [loadingTracked, setLoadingTracked] = useState(false);
  const [savingTracked, setSavingTracked] = useState(false);
  const [summaryDays, setSummaryDays] = useState<2 | 7>(7);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryRows, setSummaryRows] = useState<ActivitySummaryRow[]>([]);
  const [summarySource, setSummarySource] = useState<
    "daily_summary" | "raw_fallback" | "empty"
  >("empty");
  const [monitorView, setMonitorView] = useState<"live" | "summary">("live");

  const role =
    authState.status === "authed"
      ? authState.user.selectedCompanyRole ??
        authState.user.role ??
        currentUser.role
      : currentUser.role;
  const canSendResetAll = role === "admin" || role === "super_admin";

  useEffect(() => {
    if (authState.status !== "loading" && !canSendResetAll) {
      router.replace("/dashboard/settings");
    }
  }, [authState.status, canSendResetAll, router]);

  const loadTrackedUsers = async () => {
    setLoadingTracked(true);
    try {
      const res = await fetch("/api/admin/activity/tracked-users", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "שגיאה בטעינת משתמשים במעקב");
        return;
      }
      setTrackedUsers(Array.isArray(data.users) ? data.users : []);
    } catch {
      toast.error("שגיאה בטעינת משתמשים במעקב");
    } finally {
      setLoadingTracked(false);
    }
  };

  const loadSummary = async (days: 2 | 7 = summaryDays) => {
    setLoadingSummary(true);
    try {
      const res = await fetch(`/api/admin/activity/summary?days=${days}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "שגיאה בטעינת סיכום ניטור");
        return;
      }
      setSummaryRows(Array.isArray(data.rows) ? data.rows : []);
      setSummarySource(
        data.source === "daily_summary" || data.source === "raw_fallback"
          ? data.source
          : "empty",
      );
    } catch {
      toast.error("שגיאה בטעינת סיכום ניטור");
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleAddTrackedUser = async () => {
    const email = trackedEmail.trim().toLowerCase();
    if (!email) return;
    setSavingTracked(true);
    try {
      const res = await fetch("/api/admin/activity/tracked-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "שגיאה בהוספה למעקב");
        return;
      }
      toast.success("המשתמש נוסף למעקב");
      setTrackedEmail("");
      await loadTrackedUsers();
    } catch {
      toast.error("שגיאה בהוספה למעקב");
    } finally {
      setSavingTracked(false);
    }
  };

  const handleRemoveTrackedUser = async (userId: string) => {
    if (!confirm("להסיר את המשתמש ממעקב?")) return;
    setSavingTracked(true);
    try {
      const res = await fetch("/api/admin/activity/tracked-users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "שגיאה בהסרה ממעקב");
        return;
      }
      toast.success("המשתמש הוסר ממעקב");
      await loadTrackedUsers();
    } catch {
      toast.error("שגיאה בהסרה ממעקב");
    } finally {
      setSavingTracked(false);
    }
  };

  useEffect(() => {
    if (canSendResetAll) {
      void loadTrackedUsers();
      void loadSummary(summaryDays);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSendResetAll, summaryDays]);

  const handleSendPasswordResetAll = async () => {
    if (!confirm("לשלוח אימייל איפוס סיסמה לכל המשתמשים? כל אחד יקבל לינק להגדרת סיסמה חדשה.")) return;
    setSendingReset(true);
    try {
      const res = await fetch("/api/users/send-password-reset-all", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "שגיאה בשליחת אימיילים");
        return;
      }
      toast.success(data.message ?? `נשלחו ${data.sent} אימיילים`);
    } catch {
      toast.error("שגיאה בשליחת אימיילים");
    } finally {
      setSendingReset(false);
    }
  };

  const handleForceLogout = async () => {
    setSendingForceLogout(true);
    try {
      const res = await fetch("/api/admin/force-logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: forceLogoutMessage,
          auto_logout_minutes: forceLogoutMinutes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "שגיאה בשליחת הודעת ניתוק");
        return;
      }
      toast.success("הודעת ניתוק נשלחה לכל המשתמשים");
      setShowForceLogout(false);
    } catch {
      toast.error("שגיאה בשליחת הודעת ניתוק");
    } finally {
      setSendingForceLogout(false);
    }
  };

  const handleClearForceLogout = async () => {
    if (!confirm("לבטל את בקשת הניתוק הפעילה לכל המשתמשים?")) return;
    setClearingForceLogout(true);
    try {
      const res = await fetch("/api/admin/force-logout", {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "שגיאה בביטול בקשת ניתוק");
        return;
      }
      toast.success("בקשת הניתוק בוטלה");
      setShowForceLogout(false);
    } catch {
      toast.error("שגיאה בביטול בקשת ניתוק");
    } finally {
      setClearingForceLogout(false);
    }
  };

  const handleRemove = async (user: AppUser) => {
    if (!confirm(`להסיר את ${user.name}? המשתמש לא יימחק אלא יסומן כלא פעיל.`))
      return;
    try {
      await removeUser(user.id);
      toast.success(`${user.name} הוסר`);
    } catch {
      toast.error("שגיאה בהסרת משתמש");
    }
  };

  if (authState.status === "loading" || !canSendResetAll) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">משתמשים</h1>
            <p className="text-sm text-gray-500">
              ניהול שמות, תפקידים ומחלקות – מופיעים במשימות, תקלות והקצאות
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canSendResetAll && (
            <>
              <button
                onClick={handleSendPasswordResetAll}
                disabled={sendingReset || allUsers.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingReset ? (
                  <>שולח...</>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    איפוס סיסמה לכולם
                  </>
                )}
              </button>
              <button
                onClick={() => setShowForceLogout(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors text-sm font-medium border border-red-200"
              >
                <LogOut className="w-4 h-4" />
                נתק את כולם
              </button>
            </>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            הוסף משתמש
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">טוען משתמשים...</div>
      ) : allUsers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            אין משתמשים עדיין
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            הוסף את אנשי הצוות שלך כדי שיופיעו במשימות, תקלות והקצאות
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            הוסף משתמש ראשון
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {allUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl">{user.avatar || "👤"}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-500">
                  {user.department || "ללא מחלקה"} · {user.position || "—"} ·
                  הרשאה:{" "}
                  {user.role === "admin"
                    ? "מנהל"
                    : user.role === "editor"
                      ? "עורך"
                      : user.role === "viewer"
                        ? "צופה"
                        : user.role}
                </p>
              </div>
              <span className="text-xs text-gray-400 truncate max-w-[160px]">
                {user.email}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingUser(user)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  title="ערוך"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleRemove(user)}
                  className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  title="הסר"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingUser && (
        <UserEditModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}

      {showAddModal && (
        <UserEditModal user={null} onClose={() => setShowAddModal(false)} />
      )}

      {showForceLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowForceLogout(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <LogOut className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">נתק את כולם</h2>
                <p className="text-sm text-gray-500">
                  כל המשתמשים יראו הודעה ויתנתקו אוטומטית
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                הודעה למשתמשים
              </label>
              <textarea
                value={forceLogoutMessage}
                onChange={(e) => setForceLogoutMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                זמן לניתוק אוטומטי (דקות)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={forceLogoutMinutes}
                  onChange={(e) =>
                    setForceLogoutMinutes(Number(e.target.value))
                  }
                  className="flex-1 accent-red-500"
                />
                <span className="text-sm font-medium text-gray-700 w-12 text-center">
                  {forceLogoutMinutes} דק׳
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClearForceLogout}
                disabled={clearingForceLogout || sendingForceLogout}
                className="py-2.5 px-3 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="בטל בקשת ניתוק פעילה"
              >
                {clearingForceLogout ? "מבטל..." : "בטל ניתוק פעיל"}
              </button>
              <button
                type="button"
                onClick={() => setShowForceLogout(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleForceLogout}
                disabled={sendingForceLogout || !forceLogoutMessage.trim()}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                {sendingForceLogout ? "שולח..." : "שלח ונתק"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">ניטור משתמשים</h2>
            <p className="text-sm text-gray-500">
              תצוגה חיה לצד סיכום יבש, במינימום עומס
            </p>
          </div>
          <div className="inline-flex rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setMonitorView("live")}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                monitorView === "live"
                  ? "bg-white text-primary-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              ניטור חי
            </button>
            <button
              type="button"
              onClick={() => setMonitorView("summary")}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                monitorView === "summary"
                  ? "bg-white text-primary-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              סיכום יבש
            </button>
          </div>
        </div>

        {monitorView === "live" ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                מעקב מתבצע רק עבור משתמשים שנבחרו במפורש
              </p>
              <button
                type="button"
                onClick={() => void loadTrackedUsers()}
                disabled={loadingTracked || savingTracked}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {loadingTracked ? "טוען..." : "רענן"}
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="email"
                value={trackedEmail}
                onChange={(e) => setTrackedEmail(e.target.value)}
                placeholder="הוסף משתמש למעקב לפי אימייל"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => void handleAddTrackedUser()}
                disabled={savingTracked || !trackedEmail.trim()}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 disabled:opacity-50"
              >
                הוסף
              </button>
            </div>

            {trackedUsers.length === 0 ? (
              <p className="text-sm text-gray-500">אין משתמשים במעקב כרגע.</p>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                {trackedUsers.map((u) => (
                  <div
                    key={u.userId}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:border-primary-200 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{u.name}</p>
                      <p className="text-xs text-gray-500 truncate">{u.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        פעילות 24ש׳: {u.events24h} · אחרון:{" "}
                        {u.lastSeenAt
                          ? new Date(u.lastSeenAt).toLocaleString("he-IL")
                          : "אין"}
                        {u.lastRoute ? ` · דף: ${u.lastRoute}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRemoveTrackedUser(u.userId)}
                      disabled={savingTracked}
                      className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                    >
                      הסר
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                {summarySource === "daily_summary"
                  ? "מקור: סיכום יומי מהיר"
                  : summarySource === "raw_fallback"
                    ? "מקור: fallback מנתונים גולמיים (זמני)"
                    : "אין נתונים לתקופה שנבחרה"}
              </p>
              <div className="flex items-center gap-2">
                <select
                  value={summaryDays}
                  onChange={(e) => setSummaryDays(Number(e.target.value) as 2 | 7)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value={2}>יומיים אחרונים</option>
                  <option value={7}>7 ימים אחרונים</option>
                </select>
                <button
                  type="button"
                  onClick={() => void loadSummary(summaryDays)}
                  disabled={loadingSummary}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {loadingSummary ? "טוען..." : "רענן"}
                </button>
              </div>
            </div>

            {summaryRows.length === 0 ? (
              <p className="text-sm text-gray-500">אין נתוני סיכום לתקופה שנבחרה.</p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                {summaryRows.map((r) => (
                  <div
                    key={`${r.date}-${r.userId}`}
                    className="p-3 border border-gray-200 rounded-xl text-sm hover:border-primary-200 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-gray-800">
                      <span className="font-semibold">{r.name}</span>
                      <span className="text-xs text-gray-500">{r.email}</span>
                      <span className="text-xs text-gray-400">· {r.date}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      דקות פעילות: {r.activeMinutes} · צפיות מסך: {r.pageViews} · כניסות: {r.loginCount}
                      {r.lastRoute ? ` · דף אחרון: ${r.lastRoute}` : ""}
                      {r.lastSeenAt
                        ? ` · נראה לאחרונה: ${new Date(r.lastSeenAt).toLocaleString("he-IL")}`
                        : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
