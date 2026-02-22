// ============================================
// STORE DELIVERIES HOOK
// נתוני אספקות לחנויות
// ============================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getDeliverySummaryByStore } from "@/lib/db/deliveries.repo";
import type { StoreDeliverySummary } from "@/types/deliveries";

interface UseStoreDeliveriesReturn {
  deliverySummaries: StoreDeliverySummary[];
  isLoading: boolean;
  error: string | null;
  getStoreDelivery: (
    storeExternalId: number,
  ) => StoreDeliverySummary | undefined;
  hasDeliveryData: boolean;
  refresh: () => Promise<void>;
}

export function useStoreDeliveries(): UseStoreDeliveriesReturn {
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;

  const [deliverySummaries, setDeliverySummaries] = useState<
    StoreDeliverySummary[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!companyId) {
      setDeliverySummaries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const summaries = await getDeliverySummaryByStore(companyId);
      setDeliverySummaries(summaries);
    } catch (err) {
      console.error("[useStoreDeliveries] Error:", err);
      setError(
        err instanceof Error ? err.message : "שגיאה בטעינת נתוני אספקות",
      );
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (auth.status === "loading") return;
    loadData();
  }, [auth.status, loadData]);

  const getStoreDelivery = useCallback(
    (storeExternalId: number) =>
      deliverySummaries.find((s) => s.storeExternalId === storeExternalId),
    [deliverySummaries],
  );

  const hasDeliveryData = deliverySummaries.length > 0;

  return {
    deliverySummaries,
    isLoading,
    error,
    getStoreDelivery,
    hasDeliveryData,
    refresh: loadData,
  };
}
