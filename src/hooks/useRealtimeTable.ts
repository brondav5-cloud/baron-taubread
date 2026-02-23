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
    const channel = supabase
      .channel(`realtime:${table}:${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          onSync();
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [table, companyId, onSync]);
}
