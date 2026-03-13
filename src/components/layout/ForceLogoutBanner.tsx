"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface LogoutRequest {
  message: string;
  auto_logout_minutes: number;
  requested_at: string;
  requested_by_name: string | null;
}

interface ForceLogoutBannerProps {
  companyId: string;
}

/**
 * Self-contained component. Subscribes to `logout_requests` for the company
 * via Supabase Realtime. When a request is active, shows a full-screen overlay
 * with the admin's message and a countdown to auto-logout.
 *
 * Add <ForceLogoutBanner companyId={...} /> anywhere inside the dashboard —
 * it renders nothing when no active request exists.
 */
export function ForceLogoutBanner({ companyId }: ForceLogoutBannerProps) {
  const router = useRouter();
  const [request, setRequest] = useState<LogoutRequest | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const doLogout = useCallback(async () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }, [router]);

  const applyRequest = useCallback(
    (data: LogoutRequest) => {
      const deadline =
        new Date(data.requested_at).getTime() +
        data.auto_logout_minutes * 60 * 1000;
      const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));

      // Request already expired — log out immediately
      if (remaining === 0) {
        void doLogout();
        return;
      }

      setRequest(data);
      setSecondsLeft(remaining);

      // Clear any previous countdown
      if (countdownRef.current) clearInterval(countdownRef.current);

      countdownRef.current = setInterval(() => {
        const sLeft = Math.max(
          0,
          Math.floor((deadline - Date.now()) / 1000),
        );
        setSecondsLeft(sLeft);
        if (sLeft === 0) {
          clearInterval(countdownRef.current!);
          void doLogout();
        }
      }, 1000);
    },
    [doLogout],
  );

  const fetchRequest = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("logout_requests")
      .select("message, auto_logout_minutes, requested_at, requested_by_name")
      .eq("company_id", companyId)
      .maybeSingle();

    if (data) applyRequest(data as LogoutRequest);
  }, [companyId, applyRequest]);

  useEffect(() => {
    if (!companyId) return;

    void fetchRequest();

    const supabase = createClient();
    const channel = supabase
      .channel(`logout_requests:${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "logout_requests",
          filter: `company_id=eq.${companyId}`,
        },
        () => void fetchRequest(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [companyId, fetchRequest]);

  if (!request) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const countdownStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm text-center p-8 space-y-5">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-orange-500" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">הודעת מנהל</h2>
          {request.requested_by_name && (
            <p className="text-xs text-gray-400">מאת: {request.requested_by_name}</p>
          )}
        </div>

        <p className="text-gray-700 leading-relaxed">{request.message}</p>

        <div className="bg-orange-50 rounded-xl py-3 px-4">
          <p className="text-xs text-gray-500 mb-1">התנתקות אוטומטית בעוד</p>
          <p className="text-4xl font-mono font-bold text-orange-500">
            {countdownStr}
          </p>
        </div>

        <button
          onClick={() => void doLogout()}
          className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          התנתק עכשיו
        </button>
      </div>
    </div>
  );
}
