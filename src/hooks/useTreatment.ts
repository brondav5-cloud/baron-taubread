"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  TrendingDown,
  RotateCcw,
  Clock,
  Phone,
  CheckCircle,
} from "lucide-react";
import { useStoresAndProducts } from "@/context/StoresAndProductsContext";
import { type StatusLong } from "@/types/data";

// ============================================
// TYPES
// ============================================

export type TreatmentStatus = "pending" | "in_progress" | "resolved";
export type AlertType = "crash" | "decline" | "returns" | "short_term";

export interface TreatmentStore {
  id: number;
  name: string;
  city: string;
  agent: string;
  status_long: StatusLong;
  metric_12v12: number;
  metric_2v2: number;
  returns_pct_last6: number;
  alertType: AlertType;
  treatmentStatus: TreatmentStatus;
  lastContact?: string;
  notes?: string;
}

// ============================================
// CONSTANTS
// ============================================

export const ALERT_CONFIG: Record<
  AlertType,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  crash: {
    label: "התרסקות",
    icon: AlertTriangle,
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
  decline: {
    label: "ירידה משמעותית",
    icon: TrendingDown,
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
  returns: {
    label: "החזרות גבוהות",
    icon: RotateCcw,
    color: "text-amber-700",
    bgColor: "bg-amber-100",
  },
  short_term: {
    label: "ירידה חדה (2v2)",
    icon: TrendingDown,
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
};

export const TREATMENT_STATUS_CONFIG: Record<
  TreatmentStatus,
  { label: string; icon: React.ElementType; color: string }
> = {
  pending: { label: "ממתין לטיפול", icon: Clock, color: "text-gray-600" },
  in_progress: { label: "בטיפול", icon: Phone, color: "text-blue-600" },
  resolved: { label: "טופל", icon: CheckCircle, color: "text-green-600" },
};

// ============================================
// HOOK
// ============================================

export function useTreatment() {
  const { stores } = useStoresAndProducts();
  const [filterType, setFilterType] = useState<AlertType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<TreatmentStatus | "all">(
    "all",
  );

  const treatmentStores = useMemo(() => {
    const alertStores: TreatmentStore[] = [];

    stores.forEach((s) => {
      const m = s.metrics || {};
      const metric_12v12 = m.metric_12v12 ?? 0;
      const metric_2v2 = m.metric_2v2 ?? 0;
      const returns_pct_last6 = m.returns_pct_current ?? 0;

      let alertType: AlertType | null = null;
      if (metric_12v12 < -30) alertType = "crash";
      else if (metric_12v12 < -10) alertType = "decline";
      else if (returns_pct_last6 > 20) alertType = "returns";
      else if (metric_2v2 < -25) alertType = "short_term";

      if (alertType) {
        alertStores.push({
          id: s.external_id,
          name: s.name,
          city: s.city || "",
          agent: s.agent || "",
          status_long:
            (m.status_long as TreatmentStore["status_long"]) || "יציב",
          metric_12v12,
          metric_2v2,
          returns_pct_last6,
          alertType,
          treatmentStatus: "pending",
        });
      }
    });

    return alertStores.sort((a, b) => {
      const priorityOrder: AlertType[] = [
        "crash",
        "short_term",
        "decline",
        "returns",
      ];
      const aPriority = priorityOrder.indexOf(a.alertType);
      const bPriority = priorityOrder.indexOf(b.alertType);
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.metric_12v12 - b.metric_12v12;
    });
  }, [stores]);

  // Apply filters
  const filteredStores = useMemo(() => {
    return treatmentStores.filter((store) => {
      if (filterType !== "all" && store.alertType !== filterType) return false;
      if (filterStatus !== "all" && store.treatmentStatus !== filterStatus)
        return false;
      return true;
    });
  }, [treatmentStores, filterType, filterStatus]);

  // Stats
  const stats = useMemo(
    () => ({
      total: treatmentStores.length,
      crash: treatmentStores.filter((s) => s.alertType === "crash").length,
      decline: treatmentStores.filter((s) => s.alertType === "decline").length,
      returns: treatmentStores.filter((s) => s.alertType === "returns").length,
      shortTerm: treatmentStores.filter((s) => s.alertType === "short_term")
        .length,
    }),
    [treatmentStores],
  );

  const clearFilters = () => {
    setFilterType("all");
    setFilterStatus("all");
  };

  const toggleFilterType = (type: AlertType) => {
    setFilterType(filterType === type ? "all" : type);
  };

  return {
    // State
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,

    // Data
    treatmentStores,
    filteredStores,
    stats,

    // Actions
    clearFilters,
    toggleFilterType,
  };
}
