"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface PushContextValue {
  isSubscribed: boolean;
  isSupported: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  state: string;
}

const PushContext = createContext<PushContextValue | null>(null);

export function PushNotificationProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const push = usePushNotifications();

  const { isSupported, state: pushState, subscribe: pushSubscribe } = push;

  useEffect(() => {
    if (
      auth.status !== "authed" ||
      !isSupported ||
      pushState !== "prompt"
    ) {
      return;
    }
    const timer = setTimeout(() => {
      pushSubscribe();
    }, 3000);
    return () => clearTimeout(timer);
  }, [auth.status, isSupported, pushState, pushSubscribe]);

  return (
    <PushContext.Provider value={push}>{children}</PushContext.Provider>
  );
}

export function usePush() {
  return useContext(PushContext);
}
