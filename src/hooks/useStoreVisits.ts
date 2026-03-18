"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Visit } from "@/context/VisitsContext";
import type { DbVisit } from "@/types/supabase";

function dbToVisit(db: DbVisit): Visit {
  return {
    id: db.id,
    storeId: db.store_external_id,
    storeName: db.store_name,
    storeCity: db.store_city,
    agentName: db.agent_name,
    date: db.date,
    time: db.time ?? undefined,
    notes: db.notes,
    checklist: db.checklist ?? [],
    competitors: db.competitors ?? [],
    photos: db.photos ?? [],
    status: db.status,
    createdAt: db.created_at,
    syncStatus: "synced",
  };
}

export function useStoreVisits(storeExternalId: number | null, limit = 10) {
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;

  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVisits = useCallback(async () => {
    if (!companyId || !storeExternalId) return;

    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("visits")
      .select("*")
      .eq("company_id", companyId)
      .eq("store_external_id", storeExternalId)
      .order("date", { ascending: false })
      .limit(limit);

    if (fetchError) {
      setError("שגיאה בטעינת תעודות הביקור");
    } else {
      setVisits((data ?? []).map(dbToVisit));
    }

    setIsLoading(false);
  }, [companyId, storeExternalId, limit]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  return { visits, isLoading, error, refetch: fetchVisits };
}
