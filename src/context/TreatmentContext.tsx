"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import { useStoresAndProducts } from "@/context/StoresAndProductsContext";
import { useAuth } from "@/hooks/useAuth";
import {
  getStoreTreatments,
  addStoreTreatment,
  updateStoreTreatment,
  removeStoreTreatment,
} from "@/lib/supabase/treatment.queries";
import type { StatusLong } from "@/types/data";

// ============================================
// TYPES
// ============================================

export type TreatmentStatus = "pending" | "in_progress" | "resolved";
export type TreatmentReason =
  | "manual"
  | "crash"
  | "decline"
  | "returns"
  | "short_term"
  | "other";

export interface ManualTreatmentStore {
  id: number;
  name: string;
  city: string;
  agent: string;
  status_long: StatusLong;
  metric_12v12: number;
  metric_2v2: number;
  returns_pct_last6: number;
  reason: TreatmentReason;
  treatmentStatus: TreatmentStatus;
  notes: string;
  addedAt: string;
  lastUpdated: string;
}

interface TreatmentContextValue {
  stores: ManualTreatmentStore[];
  isLoading: boolean;
  addStore: (
    storeId: number,
    reason: TreatmentReason,
    notes?: string,
  ) => Promise<boolean>;
  removeStore: (storeId: number) => void;
  updateStoreStatus: (storeId: number, status: TreatmentStatus) => void;
  updateStoreNotes: (storeId: number, notes: string) => void;
  resolveStore: (storeId: number, resolutionNotes: string) => void;
  isStoreInTreatment: (storeId: number) => boolean;
  getStoreById: (storeId: number) => ManualTreatmentStore | undefined;
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
  };
}

interface TreatmentProviderProps {
  children: ReactNode;
}

function dbToStore(row: {
  store_id: number;
  store_name: string;
  store_city: string;
  store_agent: string;
  status_long: string;
  metric_12v12: number;
  metric_2v2: number;
  returns_pct: number;
  reason: string;
  treatment_status: string;
  notes: string;
  added_at: string;
  updated_at: string;
}): ManualTreatmentStore {
  return {
    id: row.store_id,
    name: row.store_name,
    city: row.store_city,
    agent: row.store_agent,
    status_long: row.status_long as ManualTreatmentStore["status_long"],
    metric_12v12: row.metric_12v12,
    metric_2v2: row.metric_2v2,
    returns_pct_last6: row.returns_pct,
    reason: row.reason as TreatmentReason,
    treatmentStatus: row.treatment_status as TreatmentStatus,
    notes: row.notes || "",
    addedAt: row.added_at,
    lastUpdated: row.updated_at,
  };
}

// ============================================
// REASON CONFIG
// ============================================

export const TREATMENT_REASON_CONFIG: Record<
  TreatmentReason,
  {
    label: string;
    color: string;
    bgColor: string;
  }
> = {
  manual: {
    label: "הוספה ידנית",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  crash: { label: "התרסקות", color: "text-red-700", bgColor: "bg-red-100" },
  decline: {
    label: "ירידה",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
  returns: {
    label: "החזרות גבוהות",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
  },
  short_term: {
    label: "ירידה חדה",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
  other: { label: "אחר", color: "text-gray-700", bgColor: "bg-gray-100" },
};

export const TREATMENT_STATUS_CONFIG: Record<
  TreatmentStatus,
  {
    label: string;
    color: string;
    bgColor: string;
  }
> = {
  pending: {
    label: "ממתין לטיפול",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  },
  in_progress: {
    label: "בטיפול",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  resolved: { label: "טופל", color: "text-green-600", bgColor: "bg-green-100" },
};

// ============================================
// CONTEXT
// ============================================

const TreatmentContext = createContext<TreatmentContextValue | undefined>(
  undefined,
);

// ============================================
// PROVIDER
// ============================================

export function TreatmentProvider({ children }: TreatmentProviderProps) {
  const auth = useAuth();
  const { getStoreByExternalId } = useStoresAndProducts();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;
  const userId = auth.status === "authed" ? auth.user.userId : "";
  const userName = auth.status === "authed" ? auth.user.userName : undefined;

  const [stores, setStores] = useState<ManualTreatmentStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (auth.status === "loading" || !companyId) {
      setStores([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    getStoreTreatments(companyId)
      .then((rows) => {
        // Filter out resolved stores - they should not appear in the list
        if (!cancelled)
          setStores(
            rows.map(dbToStore).filter((s) => s.treatmentStatus !== "resolved"),
          );
      })
      .catch(() => {
        if (!cancelled) setStores([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [auth.status, companyId]);

  const addStore = useCallback(
    async (
      storeId: number,
      reason: TreatmentReason,
      notes?: string,
    ): Promise<boolean> => {
      if (!companyId || !userId || stores.some((s) => s.id === storeId))
        return false;
      const dbStore = getStoreByExternalId(storeId);
      if (!dbStore) return false;
      const m = dbStore.metrics || {};
      const result = await addStoreTreatment({
        company_id: companyId,
        store_id: dbStore.external_id,
        store_name: dbStore.name,
        store_city: dbStore.city || "",
        store_agent: dbStore.agent || "",
        status_long: (m.status_long as string) || "יציב",
        metric_12v12: m.metric_12v12 ?? 0,
        metric_2v2: m.metric_2v2 ?? 0,
        returns_pct: m.returns_pct_current ?? 0,
        reason,
        notes,
        added_by: userId,
        added_by_name: userName,
      });
      if (result.error) return false;
      if (result.data) setStores((prev) => [dbToStore(result.data!), ...prev]);
      return true;
    },
    [companyId, userId, userName, stores, getStoreByExternalId],
  );

  const removeStore = useCallback(
    (storeId: number) => {
      const store = stores.find((s) => s.id === storeId);
      if (!store || !companyId || !userId) return;
      removeStoreTreatment(
        companyId,
        storeId,
        store.name,
        userId,
        userName,
      ).then((ok) => {
        if (ok) setStores((prev) => prev.filter((s) => s.id !== storeId));
      });
    },
    [companyId, userId, userName, stores],
  );

  const updateStoreStatus = useCallback(
    (storeId: number, status: TreatmentStatus) => {
      if (!companyId || !userId) return;
      setStores((prev) =>
        prev.map((s) =>
          s.id === storeId
            ? {
                ...s,
                treatmentStatus: status,
                lastUpdated: new Date().toISOString(),
              }
            : s,
        ),
      );
      updateStoreTreatment(
        companyId,
        storeId,
        { treatment_status: status },
        userId,
        userName,
      ).then((ok) => {
        if (!ok)
          getStoreTreatments(companyId).then((rows) =>
            setStores(rows.map(dbToStore)),
          );
      });
    },
    [companyId, userId, userName],
  );

  const updateStoreNotes = useCallback(
    (storeId: number, notes: string) => {
      if (!companyId || !userId) return;
      setStores((prev) =>
        prev.map((s) =>
          s.id === storeId
            ? { ...s, notes, lastUpdated: new Date().toISOString() }
            : s,
        ),
      );
      updateStoreTreatment(
        companyId,
        storeId,
        { notes },
        userId,
        userName,
      ).then((ok) => {
        if (!ok)
          getStoreTreatments(companyId).then((rows) =>
            setStores(rows.map(dbToStore)),
          );
      });
    },
    [companyId, userId, userName],
  );

  const resolveStore = useCallback(
    (storeId: number, resolutionNotes: string) => {
      if (!companyId || !userId) return;
      const store = stores.find((s) => s.id === storeId);
      if (!store) return;

      const fullNotes = store.notes
        ? `${store.notes}\n\n--- סיום טיפול ---\n${resolutionNotes}`
        : `--- סיום טיפול ---\n${resolutionNotes}`;

      // Remove from list immediately after resolving
      setStores((prev) => prev.filter((s) => s.id !== storeId));

      updateStoreTreatment(
        companyId,
        storeId,
        { treatment_status: "resolved", notes: fullNotes },
        userId,
        userName,
      ).then((ok) => {
        if (!ok)
          getStoreTreatments(companyId).then((rows) =>
            setStores(
              rows
                .map(dbToStore)
                .filter((s) => s.treatmentStatus !== "resolved"),
            ),
          );
      });
    },
    [companyId, userId, userName, stores],
  );

  const isStoreInTreatment = useCallback(
    (storeId: number): boolean => {
      return stores.some((s) => s.id === storeId);
    },
    [stores],
  );

  const getStoreByIdFromTreatment = useCallback(
    (storeId: number): ManualTreatmentStore | undefined => {
      return stores.find((s) => s.id === storeId);
    },
    [stores],
  );

  const stats = useMemo(
    () => ({
      total: stores.length,
      pending: stores.filter((s) => s.treatmentStatus === "pending").length,
      inProgress: stores.filter((s) => s.treatmentStatus === "in_progress")
        .length,
      resolved: 0, // Resolved stores are removed from list
    }),
    [stores],
  );

  const value: TreatmentContextValue = {
    stores,
    isLoading,
    addStore,
    removeStore,
    updateStoreStatus,
    updateStoreNotes,
    resolveStore,
    isStoreInTreatment,
    getStoreById: getStoreByIdFromTreatment,
    stats,
  };

  return (
    <TreatmentContext.Provider value={value}>
      {children}
    </TreatmentContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useTreatmentContext(): TreatmentContextValue {
  const context = useContext(TreatmentContext);

  if (context === undefined) {
    throw new Error(
      "useTreatmentContext must be used within a TreatmentProvider",
    );
  }

  return context;
}
