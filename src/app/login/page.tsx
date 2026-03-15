"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function mapAuthError(message: string): string {
  if (message.includes("Invalid login")) return "פרטי התחברות שגויים";
  if (message.includes("Email not confirmed"))
    return "נא לאשר את כתובת האימייל";
  if (message.includes("Too many requests"))
    return "יותר מדי ניסיונות, נסה שוב מאוחר יותר";
  if (message.includes("Network") || message.includes("fetch"))
    return "בעיית תקשורת, בדוק את החיבור לאינטרנט";
  if (message.includes("supabaseUrl") || message.includes("API key"))
    return "ההגדרות לא הוגדרו כראוי – יש לבדוק משתני סביבה";
  return message || "אירעה שגיאה, נסה שוב";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      // Sign in directly with the browser Supabase client.
      // This sets both the in-memory session AND the cookies correctly,
      // ensuring all subsequent data requests (RPC, select, etc.) include
      // the Authorization header. Using a server-side Route Handler for login
      // only sets cookies but leaves the browser client's in-memory state empty,
      // which causes 401s on data requests right after login.
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(mapAuthError(error.message));
        return;
      }

      // Full reload so the singleton is recreated with the fresh session.
      window.location.href = "/dashboard";
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "אירעה שגיאה, נסה שוב";
      setError(mapAuthError(msg));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "אירעה שגיאה, נסה שוב");
        return;
      }
      setForgotSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "אירעה שגיאה");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-main p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      {/* Floating bakery icons */}
      <div className="absolute top-20 right-20 text-6xl animate-float opacity-20">
        🥐
      </div>
      <div
        className="absolute bottom-32 left-16 text-5xl animate-float opacity-20"
        style={{ animationDelay: "1s" }}
      >
        🍞
      </div>
      <div
        className="absolute top-40 left-32 text-4xl animate-float opacity-20"
        style={{ animationDelay: "2s" }}
      >
        🥖
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-primary rounded-2xl shadow-lg mb-4">
            <span className="text-4xl">🥖</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Bakery&apos;s Analytics
          </h1>
          <p className="text-gray-500 mt-2">התחבר למערכת הניתוח</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-elevated p-8 space-y-5">
          {showForgotPassword ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">איפוס סיסמה</h2>
              <p className="text-sm text-gray-600">
                הזן את האימייל שלך ונישלח לך לינק לאיפוס סיסמה
              </p>
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="input w-full"
                  dir="ltr"
                  required
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="btn btn-primary flex-1"
                  >
                    {forgotLoading ? "שולח..." : "שלח לינק לאיפוס"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    ביטול
                  </button>
                </div>
              </form>
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  {error}
                </div>
              )}
              {forgotSuccess && (
                <p className="text-sm text-green-600 p-3 bg-green-50 rounded-lg">
                  נשלח אימייל. בדוק את תיבת הדואר (כולל בספאם).
                </p>
              )}
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                אימייל
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="your@email.com"
                required
                dir="ltr"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                סיסמה
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-12"
                  placeholder="••••••••"
                  required
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me & Forgot */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-gray-600">זכור אותי</span>
              </label>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowForgotPassword(!showForgotPassword);
                  setForgotEmail(email);
                  setForgotSuccess(false);
                  setError("");
                }}
                className="text-primary-600 hover:text-primary-700 font-medium cursor-pointer underline"
              >
                שכחתי סיסמה
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  מתחבר...
                </>
              ) : (
                "התחבר"
              )}
            </button>
          </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-6">
          © 2026 Bakery&apos;s Analytics. כל הזכויות שמורות.
        </p>
      </div>
    </div>
  );
}
