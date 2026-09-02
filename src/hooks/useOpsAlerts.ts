"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DataMetadata, DbProduct, DbStore } from "@/types/db";
import {
  buildProductMetricAlerts,
  buildStoreMetricAlerts,
  buildWeeklyStoreAlerts,
  formatFreshnessTime,
  mergeOpsAlerts,
  type OpsAlert,
  type WeeklyStoreQty,
} from "@/lib/opsAlerts";
import { currentMonthKeyJerusalem } from "@/lib/storeActivity";

interface UseOpsAlertsArgs {
  companyId: string | null;
  stores: DbStore[];
  products: DbProduct[];
  metadata: DataMetadata | null;
}

export function useOpsAlerts({
  companyId,
  stores,
  products,
  metadata,
}: UseOpsAlertsArgs) {
  const [weeklyRows, setWeeklyRows] = useState<WeeklyStoreQty[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  useEffect(() => {
    if (!companyId) {
      setWeeklyRows([]);
      return;
    }
    let cancelled = false;
    setWeeklyLoading(true);
    const supabase = createClient();
    supabase
      .from("store_deliveries")
      .select("store_external_id, year, month, week, total_quantity")
      .eq("company_id", companyId)
      .not("week", "is", null)
      .order("year", { ascending: false })
      .order("week", { ascending: false })
      .limit(8000)
      .then(({ data, error }) => {
        if (cancelled) return;
        setWeeklyLoading(false);
        if (error || !data) {
          setWeeklyRows([]);
          return;
        }
        setWeeklyRows(
          data
            .filter((row) => row.week != null)
            .map((row) => ({
              storeExternalId: Number(row.store_external_id),
              year: Number(row.year),
              month: Number(row.month),
              week: Number(row.week),
              qty: Number(row.total_quantity) || 0,
            })),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const storeNameById = useMemo(
    () => new Map(stores.map((store) => [store.external_id, store.name])),
    [stores],
  );

  const weekly = useMemo(
    () => buildWeeklyStoreAlerts(weeklyRows, storeNameById),
    [weeklyRows, storeNameById],
  );

  const alerts = useMemo(
    () =>
      mergeOpsAlerts(
        buildStoreMetricAlerts(stores),
        weekly.alerts,
        buildProductMetricAlerts(products),
      ),
    [stores, products, weekly.alerts],
  );

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  return {
    alerts,
    alertCount: alerts.length,
    criticalCount,
    warningCount,
    weeklyLoading,
    freshness: {
      lastUploadLabel: formatFreshnessTime(metadata?.last_upload_at ?? null),
      periodEnd: metadata?.period_end ?? null,
      latestClosedWeek: weekly.latestClosedWeek,
      currentMonthOpen: Boolean(currentMonthKeyJerusalem()),
    },
  };
}

export type { OpsAlert };
