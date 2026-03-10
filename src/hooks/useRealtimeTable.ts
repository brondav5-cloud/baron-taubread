"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Subscribes to INSERT / UPDATE / DELETE on a Supabase table,
 * filtered by company_id. Accepts one or more company IDs.
 * Calls `onSync` whenever a change arrives so the consumer can refetch.
 */
export function useRealtimeTable(
  table: string,
  companyIds: string[],
  onSync: () => void,
) {
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const idsKey = companyIds.join(",");

  useEffect(() => {
    if (!idsKey) return;

    const supabase = createClient();
    const channels: RealtimeChannel[] = [];

    for (const companyId of idsKey.split(",")) {
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
          () => onSync(),
        )
        .subscribe();
      channels.push(channel);
    }

    channelsRef.current = channels;

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, [table, idsKey, onSync]);
}
