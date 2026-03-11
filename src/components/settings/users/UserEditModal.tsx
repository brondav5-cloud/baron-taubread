"use client";

import { useState } from "react";
import { X, Save, Plus, Settings, Trash2 } from "lucide-react";
import { useUsers, type AppUser } from "@/context/UsersContext";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyPositions } from "@/hooks/useCompanyPositions";
import type { UserPermissionModule } from "@/types/supabase";
import toast from "react-hot-toast";

interface UserEditModalProps {
  user: AppUser | null;
  onClose: () => void;
}

const ROLE_OPTIONS = [
  { value: "admin", label: "מנהל – גישה מלאה" },
  { value: "editor", label: "עורך – עריכה בכל המערכת" },
  { value: "viewer", label: "צופה – צפייה בלבד" },
];

const PERMISSION_MODULES: { key: UserPermissionModule; label: string }[] = [
  { key: "profitability", label: "רווחיות" },
  { key: "expenses", label: "רווח והפסד" },
  { key: "settings", label: "הגדרות" },
  { key: "upload", label: "העלאת נתונים (Excel)" },
];

const AVATAR_OPTIONS = [
  "👤",
  "👨‍💼",
  "👩‍💼",
  "📦",
  "💰",
  "🚚",
  "💳",
  "⚠️",
  "📊",
  "👔",
  "🧑‍🔧",
  "👷",
];

export function UserEditModal({ user, onClose }: UserEditModalProps) {
  const { addUser, updateUser } = useUsers();
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;
  const { allPositions, custom, addPosition, removePosition } =
    useCompanyPositions(companyId ?? null);
  const [showPositionManager, setShowPositionManager] = useState(false);
  const [newPositionLabel, setNewPositionLabel] = useState("");
  const isNew = !user;

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(user?.role ?? "editor");
  const [position, setPosition] = useState(user?.position || "agent");
  const positionOptions =
    allPositions.length > 0
      ? allPositions
      : [{ value: "agent", label: "סוכן שטח" }];
  const [department, setDepartment] = useState(user?.department ?? "");
  const [avatar, setAvatar] = useState(user?.avatar || "👤");
  const [permissions, setPermissions] = useState<Record<string, boolean>>(
    () => {
      const p = user?.permissions ?? {};
      const out: Record<string, boolean> = {};
      PERMISSION_MODULES.forEach(({ key }) => {
        out[key] = p[key] !== false;
      });
      return out;
    },
  );
  const [saving, setSaving] = useState(false);

  const togglePermission = (key: UserPermissionModule) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("חובה למלא שם");
      return;
    }
    if (isNew && !email.trim()) {
      toast.error("חובה למלא אימייל");
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        const perms: Record<string, boolean> = {};
        PERMISSION_MODULES.forEach(({ key }) => {
          perms[key] = permissions[key] !== false;
        });
        const result = await addUser({
          name: name.trim(),
          email: email.trim(),
          password: password.trim() || undefined,
          role,
          position,
          department: department.trim(),
          avatar,
          permissions: perms,
        });
        if (result) {
          toast.success(
            password.trim()
              ? `${name.trim()} נוסף בהצלחה`
              : `${name.trim()} נוסף. המשתמש יוכל להשתמש ב'שכחתי סיסמה' לאיפוס.`,
          );
          onClose();
        } else {
          toast.error("שגיאה בהוספת משתמש");
        }
      } else {
        const perms: Record<string, boolean> = {};
        PERMISSION_MODULES.forEach(({ key }) => {
          perms[key] = permissions[key] !== false;
        });
        await updateUser(user.id, {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role,
          position,
          department: department.trim(),
          avatar,
          permissions: perms,
        });
        toast.success("המשתמש עודכן");
        onClose();
      }
    } catch {
      toast.error("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md my-auto max-h-[90vh] flex flex-col min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <h3 className="text-lg font-bold text-gray-900">
            {isNew ? "הוספת משתמש חדש" : "עריכת משתמש"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              שם *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: משה כהן"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              אימייל {isNew && "*"}
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@company.com"
              type="email"
              dir="ltr"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              טלפון נייד (ל-SMS)
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="050-1234567"
              type="tel"
              dir="ltr"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {isNew && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                סיסמה ראשונית (אופציונלי)
              </label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="אם לא תמלא - המשתמש ישתמש ב'שכחתי סיסמה'"
                type="password"
                dir="ltr"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              הרשאה כללית
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                תפקיד מקצועי
              </label>
              <button
                type="button"
                onClick={() => setShowPositionManager((p) => !p)}
                className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <Settings className="w-3.5 h-3.5" />
                ניהול תפקידים
              </button>
            </div>
            {showPositionManager && (
              <div className="mb-3 p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-2">
                <div className="flex gap-2">
                  <input
                    value={newPositionLabel}
                    onChange={(e) => setNewPositionLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addPosition(newPositionLabel);
                        setNewPositionLabel("");
                      }
                    }}
                    placeholder="הוסף תפקיד חדש"
                    className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addPosition(newPositionLabel);
                      setNewPositionLabel("");
                      toast.success("תפקיד נוסף");
                    }}
                    className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                  >
                    הוסף
                  </button>
                </div>
                {custom.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {custom.map((p) => (
                      <span
                        key={p.value}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded text-sm"
                      >
                        {p.label}
                        <button
                          type="button"
                          onClick={() => removePosition(p.value)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <select
              value={
                positionOptions.some((o) => o.value === position)
                  ? position
                  : (positionOptions[0]?.value ?? "agent")
              }
              onChange={(e) => setPosition(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {positionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              מחלקה
            </label>
            <input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="לדוגמה: מכירות שטח"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              גישה לחלונות
            </label>
            <p className="text-xs text-gray-500 mb-2">
              בחר לאילו מסכים יש למשתמש גישה
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50">
              {PERMISSION_MODULES.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={permissions[key] !== false}
                    onChange={() => togglePermission(key)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              אווטאר
            </label>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_OPTIONS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setAvatar(av)}
                  className={`text-2xl p-2 rounded-lg border-2 transition-colors ${
                    avatar === av
                      ? "border-primary-500 bg-primary-50"
                      : "border-transparent hover:bg-gray-100"
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || (isNew && !email.trim())}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            {isNew ? (
              <Plus className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "שומר..." : isNew ? "הוסף" : "שמור"}
          </button>
        </div>
      </div>
    </div>
  );
}
