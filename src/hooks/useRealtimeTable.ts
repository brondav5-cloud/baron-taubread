"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Subscribes to INSERT / UPDATE / DELETE on a Supabase table,
 * filtered by company_id. Accepts one or more company IDs.
 * Calls `onSync` whenever a change arrives so the consumer can refetch.
 *
 * Uses a ref for onSync so the subscription is never torn down due to
 * callback reference changes — only table/company changes rebuild it.
 */
export function useRealtimeTable(
  table: string,
  companyIds: string[],
  onSync: () => void,
) {
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const onSyncRef = useRef(onSync);
  const idsKey = companyIds.join(",");

  // Keep the ref pointing at the latest callback without rebuilding channels
  useEffect(() => {
    onSyncRef.current = onSync;
  });

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
          () => onSyncRef.current(),
        )
        .subscribe();
      channels.push(channel);
    }

    channelsRef.current = channels;

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, [table, idsKey]);
}
