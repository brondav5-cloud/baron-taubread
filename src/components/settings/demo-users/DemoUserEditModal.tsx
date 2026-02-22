"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useDemoUser } from "@/context/DemoUserContext";
import {
  DEMO_USER_ROLE_CONFIG,
  type DemoUser,
  type DemoUserRole,
} from "@/types/task";

interface Props {
  user: DemoUser | null;
  onClose: () => void;
}

const ROLES: DemoUserRole[] = [
  "agent",
  "warehouse_manager",
  "pricing_manager",
  "logistics_manager",
  "accountant",
  "quality_manager",
  "sales_manager",
  "admin",
];
const AVATARS = ["👨‍💼", "👩‍💼", "📦", "💰", "🚚", "💳", "⚠️", "📊", "👔", "🚗"];

export function DemoUserEditModal({ user, onClose }: Props) {
  const { updateUser } = useDemoUser();
  const [name, setName] = useState("");
  const [role, setRole] = useState<DemoUserRole>("agent");
  const [department, setDepartment] = useState("");
  const [avatar, setAvatar] = useState("👨‍💼");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name);
      setRole(user.role);
      setDepartment(user.department || "");
      setAvatar(user.avatar || "👨‍💼");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    updateUser(user.id, {
      name: name.trim(),
      role,
      department: department.trim(),
      avatar,
      email: email.trim(),
    });
    onClose();
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">עריכת משתמש</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              שם *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              תפקיד
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as DemoUserRole)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {DEMO_USER_ROLE_CONFIG[r].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              מחלקה
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              אימוג׳י
            </label>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  className={`w-10 h-10 text-xl rounded-lg border-2 ${avatar === a ? "border-primary-500 bg-primary-50" : "border-gray-200"}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              אימייל
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-100"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 py-2.5 px-4 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              שמור
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
