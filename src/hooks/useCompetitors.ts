"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseData } from "./useSupabaseData";
import { getVisits } from "@/lib/supabase/queries";
import type { DbVisit } from "@/types/supabase";

export interface CompetitorStoreInfo {
  id: number;
  name: string;
  city: string;
  count: number;
  lastSeen: string;
  metric_6v6: number;
  metric_2v2: number;
}

export interface CompetitorStats {
  name: string;
  totalSightings: number;
  storeCount: number;
  stores: CompetitorStoreInfo[];
  lastSeen: string;
  recentNotes: string[];
  avgMetric6v6: number;
  avgMetric2v2: number;
}

export function useCompetitors() {
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;
  const { stores, metadata, isLoading: storesLoading } = useSupabaseData();

  const [visits, setVisits] = useState<DbVisit[]>([]);
  const [isLoadingVisits, setIsLoadingVisits] = useState(true);
  const [competitorFilter, setCompetitorFilter] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!companyId) return;
    setIsLoadingVisits(true);
    getVisits(companyId).then((v) => {
      setVisits(v);
      setIsLoadingVisits(false);
    });
  }, [companyId]);

  const storesByExternalId = useMemo(() => {
    const map = new Map<number, (typeof stores)[0]>();
    stores.forEach((s) => map.set(s.external_id, s));
    return map;
  }, [stores]);

  const competitorStats = useMemo((): CompetitorStats[] => {
    const stats: Record<string, CompetitorStats> = {};

    visits.forEach((visit) => {
      const comps =
        (visit.competitors as Array<{
          id?: string;
          name?: string;
          notes?: string;
        }> | null) ?? [];
      comps.forEach((c) => {
        const name = c?.name?.trim();
        if (!name) return;

        if (!stats[name]) {
          stats[name] = {
            name,
            totalSightings: 0,
            storeCount: 0,
            stores: [],
            lastSeen: visit.date,
            recentNotes: [],
            avgMetric6v6: 0,
            avgMetric2v2: 0,
          };
        }

        const comp = stats[name];
        comp.totalSightings++;
        if (visit.date > comp.lastSeen) comp.lastSeen = visit.date;
        if (c.notes?.trim()) comp.recentNotes.push(c.notes.trim());

        const store = storesByExternalId.get(visit.store_external_id);
        const existingStore = comp.stores.find(
          (s) => s.id === visit.store_external_id,
        );
        if (existingStore) {
          existingStore.count++;
          if (visit.date > existingStore.lastSeen)
            existingStore.lastSeen = visit.date;
        } else {
          comp.stores.push({
            id: visit.store_external_id,
            name: visit.store_name,
            city: visit.store_city || "",
            count: 1,
            lastSeen: visit.date,
            metric_6v6: store?.metrics?.metric_6v6 ?? 0,
            metric_2v2: store?.metrics?.metric_2v2 ?? 0,
          });
        }
      });
    });

    return Object.values(stats)
      .map((comp) => {
        const storeCount = comp.stores.length;
        const avg6v6 =
          storeCount > 0
            ? comp.stores.reduce((s, st) => s + st.metric_6v6, 0) / storeCount
            : 0;
        const avg2v2 =
          storeCount > 0
            ? comp.stores.reduce((s, st) => s + st.metric_2v2, 0) / storeCount
            : 0;
        return {
          ...comp,
          stores: comp.stores.sort((a, b) => b.count - a.count),
          recentNotes: comp.recentNotes.slice(0, 5),
          avgMetric6v6: Math.round(avg6v6 * 10) / 10,
          avgMetric2v2: Math.round(avg2v2 * 10) / 10,
        };
      })
      .sort((a, b) => b.storeCount - a.storeCount);
  }, [visits, storesByExternalId]);

  const allCompetitorNames = useMemo(
    () =>
      competitorStats
        .map((c) => c.name)
        .sort((a, b) => a.localeCompare(b, "he")),
    [competitorStats],
  );

  const filteredCompetitors = useMemo(() => {
    let result = competitorStats;
    if (competitorFilter.length > 0) {
      result = result.filter((c) => competitorFilter.includes(c.name));
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(s));
    }
    return result;
  }, [competitorStats, competitorFilter, search]);

  return {
    competitorStats: filteredCompetitors,
    allCompetitorNames,
    competitorFilter,
    setCompetitorFilter,
    search,
    setSearch,
    isLoading: storesLoading || isLoadingVisits,
    periodLabels: metadata?.metrics_months?.length
      ? {
          halfYear: "חצי שנה מול חצי שנה (6v6)",
          twoMonths: "2 חודשים אחרונים מול 2 קודמים (2v2)",
        }
      : null,
  };
}
