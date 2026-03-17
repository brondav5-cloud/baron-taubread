"use client";

import { useState } from "react";
import { Trash2, ShieldAlert, Eye, EyeOff, Loader2 } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/env";

interface AdminDeleteModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export function AdminDeleteModal({
  isOpen,
  title,
  description,
  onConfirm,
  onClose,
}: AdminDeleteModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!password.trim()) {
      setError("יש להזין סיסמה");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Get current user email
      const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setError("לא ניתן לאמת — נסה להתחבר מחדש");
        setLoading(false);
        return;
      }

      // Re-authenticate with their password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (authError) {
        setError("סיסמה שגויה — אנא נסה שוב");
        setLoading(false);
        return;
      }

      // Password correct → perform deletion
      await onConfirm();
      handleClose();
    } catch {
      setError("שגיאה בעת האימות — נסה שוב");
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword("");
    setError("");
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 max-h-[min(90vh,calc(100dvh-2rem))] overflow-y-auto">
        {/* Icon + Title */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700 text-center">
          ⚠️ פעולה זו אינה ניתנת לביטול. יש לאשר עם סיסמת המנהל.
        </div>

        {/* Password field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            סיסמת כניסה שלך לאישור
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
              placeholder="הזן סיסמה..."
              autoFocus
              className="w-full pr-4 pl-10 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && (
            <p className="text-red-600 text-xs mt-1.5 font-medium">{error}</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || !password.trim()}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={15} />
            )}
            {loading ? "מאמת..." : "מחק"}
          </button>
        </div>
      </div>
    </div>
  );
}
