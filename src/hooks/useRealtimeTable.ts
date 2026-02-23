"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Subscribes to INSERT / UPDATE / DELETE on a Supabase table,
 * filtered by company_id. Calls `onSync` whenever a change arrives
 * so the consumer can refetch or patch state.
 */
export function useRealtimeTable(
  table: string,
  companyId: string | null,
  onSync: () => void,
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!companyId) return;

    const supabase = createClient();
    const channelName = `realtime:${table}:${companyId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          console.log(`[Realtime] ${table} change:`, payload.eventType);
          onSync();
        },
      )
      .subscribe((status) => {
        console.log(`[Realtime] ${table} channel status:`, status);
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [table, companyId, onSync]);
}
