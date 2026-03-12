"use client";

import { useMemo } from "react";
import type { DbStore } from "@/types/supabase";
import type {
  TopStore,
  StatusDistributionItem,
  CitySalesData,
} from "./useDashboardSupabase";

const STATUS_DISPLAY: Record<string, string> = {
  עליה_חדה: "עליה חדה",
  צמיחה: "צמיחה",
  יציב: "יציב",
  ירידה: "ירידה",
  התרסקות: "התרסקות",
};

export function useDashboardStoreStats(
  stores: DbStore[],
  productsCount: number,
) {
  const stats = useMemo(
    () => ({
      totalStores: stores.length,
      totalProducts: productsCount,
    }),
    [stores.length, productsCount],
  );

  const topStores = useMemo((): TopStore[] => {
    return [...stores]
      .sort(
        (a, b) =>
          (b.metrics?.metric_12v12 || 0) - (a.metrics?.metric_12v12 || 0),
      )
      .slice(0, 20)
      .map((s) => ({
        id: s.external_id,
        name: s.name,
        city: s.city || "",
        metric_12v12: s.metrics?.metric_12v12 || 0,
        sales: s.metrics?.sales_current_year || 0,
        status: s.metrics?.status_long || "יציב",
      }));
  }, [stores]);

  const bottomStores = useMemo((): TopStore[] => {
    return [...stores]
      .sort(
        (a, b) =>
          (a.metrics?.metric_12v12 || 0) - (b.metrics?.metric_12v12 || 0),
      )
      .slice(0, 20)
      .map((s) => ({
        id: s.external_id,
        name: s.name,
        city: s.city || "",
        metric_12v12: s.metrics?.metric_12v12 || 0,
        sales: s.metrics?.sales_current_year || 0,
        status: s.metrics?.status_long || "יציב",
      }));
  }, [stores]);

  const alertStores = useMemo(() => {
    return stores.filter(
      (s) =>
        s.metrics?.status_long === "התרסקות" ||
        s.metrics?.status_long === "ירידה",
    );
  }, [stores]);

  const statusDistribution = useMemo((): StatusDistributionItem[] => {
    const counts: Record<string, number> = {
      עליה_חדה: 0,
      צמיחה: 0,
      יציב: 0,
      ירידה: 0,
      התרסקות: 0,
    };
    stores.forEach((s) => {
      const status = s.metrics?.status_long || "יציב";
      if (counts[status] !== undefined) counts[status]++;
    });
    return Object.entries(counts).map(([status, value]) => ({
      name: STATUS_DISPLAY[status] || status,
      value,
      status,
    }));
  }, [stores]);

  const citySales = useMemo((): CitySalesData[] => {
    const cityMap: Record<
      string,
      { qty: number; sales: number; stores: number }
    > = {};
    stores.forEach((s) => {
      const city = s.city || "לא ידוע";
      if (!cityMap[city]) cityMap[city] = { qty: 0, sales: 0, stores: 0 };
      cityMap[city].qty += s.metrics?.qty_current_year || 0;
      cityMap[city].sales += s.metrics?.sales_current_year || 0;
      cityMap[city].stores++;
    });
    return Object.entries(cityMap)
      .map(([city, data]) => ({ city, ...data }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  }, [stores]);

  return { stats, topStores, bottomStores, alertStores, statusDistribution, citySales };
}
