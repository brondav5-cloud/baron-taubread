"use client";

import { useState, useEffect, useCallback } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type PushState = "unsupported" | "denied" | "prompt" | "subscribed" | "unsubscribed" | "loading";

export function usePushNotifications() {
  const [state, setState] = useState<PushState>("loading");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    navigator.serviceWorker
      .getRegistration("/sw.js")
      .then(async (reg) => {
        if (!reg) {
          reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        }
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          setSubscription(sub);
          setState("subscribed");
        } else {
          setState(Notification.permission === "granted" ? "unsubscribed" : "prompt");
        }
      })
      .catch(() => {
        setState("unsupported");
      });
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    try {
      if (!VAPID_PUBLIC_KEY) return false;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return false;
      }

      let reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (!reg) {
        reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: {
            endpoint: sub.endpoint,
            keys: {
              p256dh: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(sub.getKey("p256dh")!)))),
              auth: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(sub.getKey("auth")!)))),
            },
          },
        }),
      });

      if (res.ok) {
        setSubscription(sub);
        setState("subscribed");
        return true;
      }
      return false;
    } catch (err) {
      console.error("[usePushNotifications] subscribe error:", err);
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      if (!subscription) return false;

      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      await subscription.unsubscribe();
      setSubscription(null);
      setState("unsubscribed");
      return true;
    } catch (err) {
      console.error("[usePushNotifications] unsubscribe error:", err);
      return false;
    }
  }, [subscription]);

  return {
    state,
    isSubscribed: state === "subscribed",
    isSupported: state !== "unsupported",
    subscribe,
    unsubscribe,
  };
}
