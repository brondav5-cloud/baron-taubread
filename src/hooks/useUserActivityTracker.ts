"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const PAGE_VIEW_THROTTLE_MS = 45_000;
const HEARTBEAT_MS = 60_000;
const LOGIN_SENT_KEY = "activity_login_sent";
const TRACK_ENABLED_KEY = "activity_track_enabled";

async function sendActivity(eventType: "login" | "page_view" | "heartbeat" | "logout", route: string) {
  try {
    await fetch("/api/activity/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, route }),
      keepalive: eventType === "logout",
    });
  } catch {
    // Monitoring must never block UX
  }
}

export function useUserActivityTracker() {
  const auth = useAuth();
  const pathname = usePathname();
  const lastPageViewRef = useRef<number>(0);

  useEffect(() => {
    if (auth.status !== "authed") return;

    let mounted = true;
    const checkEnabled = async () => {
      try {
        const res = await fetch("/api/activity/tracking-status", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { tracked?: boolean };
        const tracked = data.tracked === true;
        sessionStorage.setItem(TRACK_ENABLED_KEY, tracked ? "1" : "0");
        if (!mounted || !tracked) return;

        if (sessionStorage.getItem(LOGIN_SENT_KEY) !== "1") {
          await sendActivity("login", pathname);
          sessionStorage.setItem(LOGIN_SENT_KEY, "1");
        }
      } catch {
        sessionStorage.setItem(TRACK_ENABLED_KEY, "0");
      }
    };

    void checkEnabled();
    return () => {
      mounted = false;
    };
  }, [auth.status, pathname]);

  useEffect(() => {
    if (auth.status !== "authed") return;
    if (sessionStorage.getItem(TRACK_ENABLED_KEY) !== "1") return;

    const now = Date.now();
    if (now - lastPageViewRef.current < PAGE_VIEW_THROTTLE_MS) return;
    lastPageViewRef.current = now;
    void sendActivity("page_view", pathname);
  }, [auth.status, pathname]);

  useEffect(() => {
    if (auth.status !== "authed") return;
    if (sessionStorage.getItem(TRACK_ENABLED_KEY) !== "1") return;

    const id = setInterval(() => {
      void sendActivity("heartbeat", pathname);
    }, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [auth.status, pathname]);

}
