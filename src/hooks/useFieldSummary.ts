"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseData } from "./useSupabaseData";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import {
  getVisitsSummary,
  type VisitSummaryRow,
} from "@/lib/supabase/queries";
import { getStoreTreatments } from "@/lib/supabase/treatment.queries";
import { getAllWorkPlanItems } from "@/lib/supabase/work-plan.queries";

export interface StoreActionCounts {
  storeId: string;
  externalId: number;
  name: string;
  city: string;
  network: string;
  agent: string;
  driver: string;
  visitsCount: number;
  treatmentCount: number;
  workPlanVisitsCount: number;
  workPlanTasksCount: number;
  competitors: string[];
  lastVisitDate: string | null;
  daysSinceLastVisit: number | null;
}

export type FieldSummaryFilters = {
  cities: string[];
  networks: string[];
  agents: string[];
  drivers: string[];
};

export type ActivityFilter =
  | "all" // כל החנויות
  | "with_actions" // עם פעולות בלבד
  | "no_visit" // ללא תעודת ביקור
  | "no_treatment" // ללא טיפול
  | "inactive_3" // ללא פעולה 3+ חודשים
  | "inactive_4"; // ללא פעולה 4+ חודשים

export type ColumnFilter = "all" | "has" | "none";

export type ColumnFilters = {
  visits: ColumnFilter;
  treatment: ColumnFilter;
  workPlanVisits: ColumnFilter;
  workPlanTasks: ColumnFilter;
};

export function useFieldSummary() {
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;
  const {
    stores: allStores,
    filters: dbFilters,
    isLoading: storesLoading,
  } = useSupabaseData();

  const [visits, setVisits] = useState<VisitSummaryRow[]>([]);
  const [treatments, setTreatments] = useState<Array<{ store_id: number }>>([]);
  const [workPlanItems, setWorkPlanItems] = useState<
    Array<{ store_id: number | null; item_type: string }>
  >([]);
  const [isLoadingActions, setIsLoadingActions] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FieldSummaryFilters>({
    cities: [],
    networks: [],
    agents: [],
    drivers: [],
  });

  const fetchActions = useCallback(() => {
    if (!companyId) {
      setIsLoadingActions(false);
      return;
    }
    setIsLoadingActions(true);
    Promise.all([
      getVisitsSummary(companyId),
      getStoreTreatments(companyId),
      getAllWorkPlanItems(companyId),
    ])
      .then(([v, t, w]) => {
        setVisits(v);
        setTreatments(t);
        setWorkPlanItems(w);
      })
      .catch((err) => {
        console.error("[useFieldSummary] Error fetching actions:", err);
      })
      .finally(() => {
        setIsLoadingActions(false);
      });
  }, [companyId]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  useRealtimeTable("visits", companyId ? [companyId] : [], fetchActions);
  useRealtimeTable("store_treatments", companyId ? [companyId] : [], fetchActions);
  useRealtimeTable("work_plan_items", companyId ? [companyId] : [], fetchActions);

  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
    visits: "all",
    treatment: "all",
    workPlanVisits: "all",
    workPlanTasks: "all",
  });

  const filterOptions = useMemo(
    (): {
      cities: string[];
      networks: string[];
      agents: string[];
      drivers: string[];
    } => ({
      cities: dbFilters?.cities?.length
        ? dbFilters.cities
        : Array.from(
            new Set(
              allStores.map((s) => s.city).filter((x): x is string => !!x),
            ),
          ).sort((a, b) => a.localeCompare(b, "he")),
      networks: dbFilters?.networks?.length
        ? dbFilters.networks
        : Array.from(
            new Set(
              allStores.map((s) => s.network).filter((x): x is string => !!x),
            ),
          ).sort((a, b) => a.localeCompare(b, "he")),
      agents: dbFilters?.agents?.length
        ? dbFilters.agents
        : Array.from(
            new Set(
              allStores.map((s) => s.agent).filter((x): x is string => !!x),
            ),
          ).sort((a, b) => a.localeCompare(b, "he")),
      drivers: dbFilters?.drivers?.length
        ? dbFilters.drivers
        : Array.from(
            new Set(
              allStores.map((s) => s.driver).filter((x): x is string => !!x),
            ),
          ).sort((a, b) => a.localeCompare(b, "he")),
    }),
    [allStores, dbFilters],
  );

  const storeActionData = useMemo((): StoreActionCounts[] => {
    const visitsByStore = new Map<
      number,
      { count: number; lastDate: string }
    >();
    visits.forEach((v) => {
      const prev = visitsByStore.get(v.store_external_id);
      const newLastDate =
        !prev || v.date > prev.lastDate ? v.date : prev.lastDate;
      visitsByStore.set(v.store_external_id, {
        count: (prev?.count ?? 0) + 1,
        lastDate: newLastDate,
      });
    });

    const treatmentStoreIds = new Set(treatments.map((t) => t.store_id));

    const wpVisitsByStore = new Map<number, number>();
    const wpTasksByStore = new Map<number, number>();
    workPlanItems.forEach((w) => {
      if (w.store_id && w.item_type === "visit") {
        wpVisitsByStore.set(
          w.store_id,
          (wpVisitsByStore.get(w.store_id) ?? 0) + 1,
        );
      }
      if (w.item_type === "task") {
        const sid = w.store_id ?? 0;
        if (sid) wpTasksByStore.set(sid, (wpTasksByStore.get(sid) ?? 0) + 1);
      }
    });

    const competitorsByStore = new Map<number, Set<string>>();
    visits.forEach((v) => {
      const comps = (v.competitors as Array<{ name?: string }> | null) ?? [];
      const names = comps.map((c) => c?.name).filter(Boolean) as string[];
      if (names.length > 0) {
        const set = competitorsByStore.get(v.store_external_id) ?? new Set();
        names.forEach((n) => set.add(n));
        competitorsByStore.set(v.store_external_id, set);
      }
    });

    const today = new Date();
    const daysSince = (dateStr: string) =>
      Math.floor(
        (today.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24),
      );

    return allStores.map((store) => {
      const visitInfo = visitsByStore.get(store.external_id);
      const visitsCount = visitInfo?.count ?? 0;
      const lastVisitDate = visitInfo?.lastDate ?? null;
      const daysSinceLastVisit = lastVisitDate
        ? daysSince(lastVisitDate)
        : null;
      return {
        storeId: store.id,
        externalId: store.external_id,
        name: store.name,
        city: store.city || "",
        network: store.network || "",
        agent: store.agent || "",
        driver: store.driver || "",
        visitsCount,
        treatmentCount: treatmentStoreIds.has(store.external_id) ? 1 : 0,
        workPlanVisitsCount: wpVisitsByStore.get(store.external_id) ?? 0,
        workPlanTasksCount: wpTasksByStore.get(store.external_id) ?? 0,
        competitors: Array.from(
          competitorsByStore.get(store.external_id) ?? [],
        ),
        lastVisitDate,
        daysSinceLastVisit,
      };
    });
  }, [allStores, visits, treatments, workPlanItems]);

  const filteredStores = useMemo(() => {
    return storeActionData.filter((store) => {
      if (search) {
        const s = search.toLowerCase();
        if (
          !store.name.toLowerCase().includes(s) &&
          !store.city.toLowerCase().includes(s)
        )
          return false;
      }
      if (filters.cities.length && !filters.cities.includes(store.city))
        return false;
      if (filters.networks.length && !filters.networks.includes(store.network))
        return false;
      if (filters.agents.length && !filters.agents.includes(store.agent))
        return false;
      if (filters.drivers.length && !filters.drivers.includes(store.driver))
        return false;

      const hasAction =
        store.visitsCount > 0 ||
        store.treatmentCount > 0 ||
        store.workPlanVisitsCount > 0 ||
        store.workPlanTasksCount > 0;
      const days = store.daysSinceLastVisit ?? 9999;

      if (activityFilter === "with_actions" && !hasAction) return false;
      if (activityFilter === "no_visit" && store.visitsCount > 0) return false;
      if (activityFilter === "no_treatment" && store.treatmentCount > 0)
        return false;
      if (activityFilter === "inactive_3") {
        if (!store.lastVisitDate || days < 90) return false;
      }
      if (activityFilter === "inactive_4") {
        if (!store.lastVisitDate || days < 120) return false;
      }

      if (columnFilters.visits === "has" && store.visitsCount === 0)
        return false;
      if (columnFilters.visits === "none" && store.visitsCount > 0)
        return false;
      if (columnFilters.treatment === "has" && store.treatmentCount === 0)
        return false;
      if (columnFilters.treatment === "none" && store.treatmentCount > 0)
        return false;
      if (
        columnFilters.workPlanVisits === "has" &&
        store.workPlanVisitsCount === 0
      )
        return false;
      if (
        columnFilters.workPlanVisits === "none" &&
        store.workPlanVisitsCount > 0
      )
        return false;
      if (
        columnFilters.workPlanTasks === "has" &&
        store.workPlanTasksCount === 0
      )
        return false;
      if (
        columnFilters.workPlanTasks === "none" &&
        store.workPlanTasksCount > 0
      )
        return false;

      return true;
    });
  }, [storeActionData, search, filters, activityFilter, columnFilters]);

  const updateFilter = useCallback(
    <K extends keyof FieldSummaryFilters>(
      key: K,
      value: FieldSummaryFilters[K],
    ) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setFilters({ cities: [], networks: [], agents: [], drivers: [] });
    setActivityFilter("all");
    setColumnFilters({
      visits: "all",
      treatment: "all",
      workPlanVisits: "all",
      workPlanTasks: "all",
    });
  }, []);

  const activeFiltersCount = useMemo(() => {
    const filterCount = Object.values(filters).filter(
      (arr) => arr.length > 0,
    ).length;
    const colCount = Object.values(columnFilters).filter(
      (v) => v !== "all",
    ).length;
    return filterCount + (activityFilter !== "all" ? 1 : 0) + colCount;
  }, [filters, columnFilters, activityFilter]);

  return {
    stores: filteredStores,
    isLoading: storesLoading || isLoadingActions,
    search,
    setSearch,
    filters,
    filterOptions,
    updateFilter,
    clearFilters,
    activeFiltersCount,
    activityFilter,
    setActivityFilter,
    columnFilters,
    setColumnFilters,
    refetch: fetchActions,
  };
}
