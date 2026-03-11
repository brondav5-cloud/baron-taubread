"use client";

import { useState } from "react";
import { Users, Pencil, Plus, Trash2, RefreshCw } from "lucide-react";
import { useUsers, type AppUser } from "@/context/UsersContext";
import { useAuth } from "@/hooks/useAuth";
import { UserEditModal } from "@/components/settings/users/UserEditModal";
import toast from "react-hot-toast";

export default function UsersSettingsPage() {
  const { allUsers, isLoading, removeUser } = useUsers();
  const authState = useAuth();
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const role = authState.status === "authed" ? authState.user.selectedCompanyRole ?? authState.user.role : null;
  const canSendResetAll = role === "admin" || role === "super_admin";

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
    </div>
  );
}
