"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useStoresAndProducts } from "@/context/StoresAndProductsContext";
import { useAuth } from "@/hooks/useAuth";
import {
  getVisits,
  insertVisit,
  updateVisit as updateVisitInDb,
  deleteVisit as deleteVisitInDb,
} from "@/lib/supabase/queries";
import { toast } from "@/providers/ToastProvider";
import type { DbVisit } from "@/types/supabase";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import {
  enqueueOfflineVisit,
  listOfflineVisitsByCompany,
  removeOfflineVisit,
  updateOfflineVisit,
  type OfflineVisitQueueItem,
} from "@/lib/offline/visitQueue";

// ============================================
// TYPES
// ============================================

export interface VisitChecklist {
  id: string;
  label: string;
  checked: boolean;
}

export interface VisitCompetitor {
  id: string;
  name: string;
  notes: string;
}

export interface VisitPhoto {
  id: string;
  name: string;
  url?: string;
}

export interface Visit {
  id: string;
  storeId: number;
  storeName: string;
  storeCity: string;
  agentName: string;
  date: string;
  time?: string; // שעת הביקור
  notes: string;
  checklist: VisitChecklist[];
  competitors: VisitCompetitor[];
  photos: VisitPhoto[];
  status: "completed" | "draft";
  createdAt: string;
  syncStatus?: "synced" | "pending" | "failed";
  syncError?: string;
}

export interface StoreVisitInfo {
  storeId: number;
  storeName: string;
  storeCity: string;
  agentName: string;
  lastVisitDate: string | null;
  daysSinceVisit: number | null;
  totalVisits: number;
}

interface VisitsContextValue {
  visits: Visit[];
  stores: Array<{
    external_id: number;
    name: string;
    city: string;
    network: string;
    agent: string;
  }>;
  isLoading: boolean;
  addVisit: (visit: Omit<Visit, "id" | "createdAt">) => Visit;
  updateVisit: (id: string, updates: Partial<Visit>) => void;
  deleteVisit: (id: string) => void;
  getVisitById: (id: string) => Visit | undefined;
  getVisitsByStore: (storeId: number) => Visit[];
  getStoresWithVisitInfo: () => StoreVisitInfo[];
  stats: {
    total: number;
    completed: number;
    draft: number;
    withPhotos: number;
    totalPhotos: number;
  };
}

interface VisitsProviderProps {
  children: ReactNode;
}

// ============================================
// HELPERS
// ============================================

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

function isLikelyNetworkError(message: string): boolean {
  const text = message.toLowerCase();
  return (
    text.includes("failed to fetch") ||
    text.includes("fetch failed") ||
    text.includes("network") ||
    text.includes("timeout") ||
    text.includes("offline")
  );
}

function queuedToVisit(item: OfflineVisitQueueItem): Visit {
  return {
    id: item.tempId,
    storeId: item.payload.store_external_id,
    storeName: item.payload.store_name,
    storeCity: item.payload.store_city,
    agentName: item.payload.agent_name,
    date: item.payload.date,
    time: item.payload.time ?? undefined,
    notes: item.payload.notes,
    checklist: item.payload.checklist ?? [],
    competitors: item.payload.competitors ?? [],
    photos: item.payload.photos ?? [],
    status: item.payload.status,
    createdAt: item.createdAt,
    syncStatus: "pending",
  };
}

function mergeServerAndQueuedVisits(
  serverVisits: Visit[],
  queued: OfflineVisitQueueItem[],
): Visit[] {
  const queuedVisits = queued.map(queuedToVisit);
  const queuedIds = new Set(queuedVisits.map((v) => v.id));
  const filteredServer = serverVisits.filter((v) => !queuedIds.has(v.id));
  return [...queuedVisits, ...filteredServer];
}

// ============================================
// CONTEXT
// ============================================

const VisitsContext = createContext<VisitsContextValue | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

export function VisitsProvider({ children }: VisitsProviderProps) {
  const { stores: dbStores } = useStoresAndProducts();
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;

  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isSyncingQueueRef = useRef(false);

  // Load visits from Supabase
  useEffect(() => {
    if (auth.status === "loading" || !companyId) {
      setVisits([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    Promise.all([getVisits(companyId), listOfflineVisitsByCompany(companyId)])
      .then(([dbVisits, queuedVisits]) => {
        if (!cancelled) {
          setVisits(
            mergeServerAndQueuedVisits(dbVisits.map(dbToVisit), queuedVisits),
          );
        }
      })
      .catch((err) => {
        console.error("[VisitsContext] fetch error:", err);
        if (!cancelled) setVisits([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [auth.status, companyId]);

  const refetchVisits = useCallback(() => {
    if (!companyId) return;
    Promise.all([getVisits(companyId), listOfflineVisitsByCompany(companyId)])
      .then(([dbVisits, queuedVisits]) =>
        setVisits(mergeServerAndQueuedVisits(dbVisits.map(dbToVisit), queuedVisits)),
      )
      .catch((err) => console.error("[VisitsContext] realtime refetch error:", err));
  }, [companyId]);

  useRealtimeTable("visits", companyId ? [companyId] : [], refetchVisits);

  const syncQueuedVisits = useCallback(async () => {
    if (!companyId) return;
    if (isSyncingQueueRef.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    isSyncingQueueRef.current = true;
    try {
      const queued = await listOfflineVisitsByCompany(companyId);
      if (queued.length === 0) return;

      let syncedCount = 0;
      let failedCount = 0;

      for (const item of queued) {
        const { data, error } = await insertVisit(item.payload);
        if (error) {
          if (isLikelyNetworkError(error.message)) {
            await updateOfflineVisit({
              ...item,
              attempts: item.attempts + 1,
              lastError: error.message,
            });
            break;
          }
          failedCount += 1;
          await removeOfflineVisit(item.id);
          setVisits((prev) =>
            prev.map((v) =>
              v.id === item.tempId
                ? {
                    ...v,
                    syncStatus: "failed",
                    syncError: error.message,
                  }
                : v,
            ),
          );
          continue;
        }

        if (data) {
          syncedCount += 1;
          await removeOfflineVisit(item.id);
          const syncedVisit = dbToVisit(data);
          setVisits((prev) =>
            prev.map((v) => (v.id === item.tempId ? syncedVisit : v)),
          );
        }
      }

      if (syncedCount > 0) {
        toast.success(`סונכרנו ${syncedCount} ביקורים ממתינים`);
      }
      if (failedCount > 0) {
        toast.error(`${failedCount} ביקורים לא סונכרנו (שגיאת נתונים)`);
      }
    } catch (error) {
      console.error("[VisitsContext] queue sync error:", error);
    } finally {
      isSyncingQueueRef.current = false;
    }
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    void syncQueuedVisits();
  }, [companyId, syncQueuedVisits]);

  useEffect(() => {
    if (!companyId) return;
    const onOnline = () => {
      void syncQueuedVisits();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [companyId, syncQueuedVisits]);

  const stores = useMemo(
    () =>
      dbStores.map((s) => ({
        external_id: s.external_id,
        name: s.name || "",
        city: s.city || "",
        network: s.network || "",
        agent: s.agent || "",
      })),
    [dbStores],
  );

  const addVisit = useCallback(
    (visitData: Omit<Visit, "id" | "createdAt">): Visit => {
      const tempId = `visit-${Date.now()}`;
      const optimistic: Visit = {
        ...visitData,
        id: tempId,
        createdAt: new Date().toISOString(),
        syncStatus: "pending",
      };
      setVisits((prev) => [optimistic, ...prev]);

      if (!companyId) {
        toast.error("לא ניתן לשמור: יש להתחבר למערכת");
        return optimistic;
      }

      const payload = {
        company_id: companyId,
        store_external_id: visitData.storeId,
        store_name: visitData.storeName,
        store_city: visitData.storeCity,
        agent_name: visitData.agentName,
        date: visitData.date,
        time: visitData.time ?? null,
        notes: visitData.notes,
        checklist: visitData.checklist ?? [],
        competitors: visitData.competitors ?? [],
        photos: visitData.photos ?? [],
        status: visitData.status,
      };

      void (async () => {
        const { data, error } = await insertVisit(payload);

        if (error) {
          if (isLikelyNetworkError(error.message)) {
            try {
              await enqueueOfflineVisit({
                companyId,
                tempId,
                createdAt: optimistic.createdAt,
                payload,
              });
              toast.success("אין קליטה - הביקור נשמר בתור וייסונכרן אוטומטית");
              return;
            } catch (queueError) {
              console.error("[VisitsContext] queue enqueue error:", queueError);
            }
          }

          const hint = error.message.includes("does not exist")
            ? " הרץ את המיגרציה: supabase db push או SQL מ-MIGRATION_VISITS.md"
            : "";
          setVisits((prev) =>
            prev.map((v) =>
              v.id === tempId
                ? { ...v, syncStatus: "failed", syncError: error.message }
                : v,
            ),
          );
          toast.error(`שגיאה בשמירת ביקור: ${error.message}${hint}`);
          return;
        }

        if (data) {
          const newVisit = dbToVisit(data);
          setVisits((prev) =>
            prev.map((v) => (v.id === tempId ? newVisit : v)),
          );
        }
      })();

      return optimistic;
    },
    [companyId],
  );

  const updateVisit = useCallback(
    (id: string, updates: Partial<Visit>) => {
      setVisits((prev) =>
        prev.map((v) => (v.id === id ? { ...v, ...updates } : v)),
      );
      const toDb: Partial<DbVisit> = {};
      if (updates.storeId !== undefined)
        toDb.store_external_id = updates.storeId;
      if (updates.storeName !== undefined) toDb.store_name = updates.storeName;
      if (updates.storeCity !== undefined) toDb.store_city = updates.storeCity;
      if (updates.agentName !== undefined) toDb.agent_name = updates.agentName;
      if (updates.date !== undefined) toDb.date = updates.date;
      if (updates.time !== undefined) toDb.time = updates.time ?? null;
      if (updates.notes !== undefined) toDb.notes = updates.notes;
      if (updates.checklist !== undefined) toDb.checklist = updates.checklist;
      if (updates.competitors !== undefined)
        toDb.competitors = updates.competitors;
      if (updates.photos !== undefined) toDb.photos = updates.photos;
      if (updates.status !== undefined) toDb.status = updates.status;

      if (
        companyId &&
        !id.startsWith("visit-") &&
        Object.keys(toDb).length > 0
      ) {
        updateVisitInDb(companyId, id, toDb).catch((err) => {
          console.error("[VisitsContext] update error:", err);
          getVisits(companyId).then((db) => setVisits(db.map(dbToVisit)));
        });
      }
    },
    [companyId],
  );

  const deleteVisit = useCallback(
    (id: string) => {
      setVisits((prev) => prev.filter((v) => v.id !== id));
      if (companyId && !id.startsWith("visit-")) {
        deleteVisitInDb(companyId, id).catch((err) => {
          console.error("[VisitsContext] delete error:", err);
          getVisits(companyId).then((db) => setVisits(db.map(dbToVisit)));
        });
      }
    },
    [companyId],
  );

  const getVisitById = useCallback(
    (id: string): Visit | undefined => {
      return visits.find((visit) => visit.id === id);
    },
    [visits],
  );

  const getVisitsByStore = useCallback(
    (storeId: number): Visit[] => {
      return visits.filter((visit) => visit.storeId === storeId);
    },
    [visits],
  );

  const getStoresWithVisitInfo = useCallback((): StoreVisitInfo[] => {
    const today = new Date();

    return stores.map((store) => {
      const storeVisits = visits.filter((v) => v.storeId === store.external_id);
      const sortedVisits = [...storeVisits].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      const lastVisit = sortedVisits[0];

      let daysSinceVisit: number | null = null;
      if (lastVisit) {
        const lastVisitDate = new Date(lastVisit.date);
        daysSinceVisit = Math.floor(
          (today.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24),
        );
      }

      return {
        storeId: store.external_id,
        storeName: store.name,
        storeCity: store.city,
        agentName: store.agent,
        lastVisitDate: lastVisit?.date ?? null,
        daysSinceVisit,
        totalVisits: storeVisits.length,
      };
    });
  }, [stores, visits]);

  const stats = useMemo(
    () => ({
      total: visits.length,
      completed: visits.filter((v) => v.status === "completed").length,
      draft: visits.filter((v) => v.status === "draft").length,
      withPhotos: visits.filter((v) => v.photos.length > 0).length,
      totalPhotos: visits.reduce((sum, v) => sum + v.photos.length, 0),
    }),
    [visits],
  );

  const value: VisitsContextValue = {
    visits,
    stores,
    isLoading,
    addVisit,
    updateVisit,
    deleteVisit,
    getVisitById,
    getVisitsByStore,
    getStoresWithVisitInfo,
    stats,
  };

  return (
    <VisitsContext.Provider value={value}>{children}</VisitsContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useVisits(): VisitsContextValue {
  const context = useContext(VisitsContext);

  if (context === undefined) {
    throw new Error("useVisits must be used within a VisitsProvider");
  }

  return context;
}
