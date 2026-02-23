"use client";

import { createContext, useContext, type ReactNode } from "react";
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
  const push = usePushNotifications();

  return (
    <PushContext.Provider value={push}>{children}</PushContext.Provider>
  );
}

export function usePush() {
  return useContext(PushContext);
}
