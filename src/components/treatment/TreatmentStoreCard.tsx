"use client";

import Link from "next/link";
import { ChevronLeft, Trash2, Calendar } from "lucide-react";
import { clsx } from "clsx";
import { formatPercent, getMetricColor } from "@/lib/calculations";
import {
  type ManualTreatmentStore,
  type TreatmentStatus,
  TREATMENT_REASON_CONFIG,
  TREATMENT_STATUS_CONFIG,
} from "@/context/TreatmentContext";

interface TreatmentStoreCardProps {
  store: ManualTreatmentStore;
  onStatusChange: (storeId: number, status: TreatmentStatus) => void;
  onRemove: (storeId: number) => void;
  onResolve: (storeId: number) => void;
  onAddToWorkPlan: (storeId: number) => void;
}

export function TreatmentStoreCard({
  store,
  onStatusChange,
  onRemove,
  onResolve,
  onAddToWorkPlan,
}: TreatmentStoreCardProps) {
  const reasonConfig = TREATMENT_REASON_CONFIG[store.reason];
  const statusConfig = TREATMENT_STATUS_CONFIG[store.treatmentStatus];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("he-IL");
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow-card hover:shadow-elevated transition-shadow">
      <div className="flex items-start gap-4">
        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/dashboard/stores/${store.id}`}
              className="font-bold text-gray-900 hover:text-primary-600 transition-colors"
            >
              {store.name}
            </Link>
            <span
              className={clsx(
                "text-xs px-2 py-0.5 rounded-full",
                reasonConfig.bgColor,
                reasonConfig.color,
              )}
            >
              {reasonConfig.label}
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-2">
            {store.city} | סוכן: {store.agent}
          </p>

          {/* Notes */}
          {store.notes && (
            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg mb-2">
              {store.notes}
            </p>
          )}

          {/* Dates */}
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>נוסף: {formatDate(store.addedAt)}</span>
            {store.lastUpdated !== store.addedAt && (
              <span>עודכן: {formatDate(store.lastUpdated)}</span>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="hidden sm:flex items-center gap-3 text-center">
          <div className="px-3">
            <p className="text-xs text-gray-500">12v12</p>
            <p
              className={clsx("font-bold", getMetricColor(store.metric_12v12))}
            >
              {formatPercent(store.metric_12v12)}
            </p>
          </div>
          <div className="px-3">
            <p className="text-xs text-gray-500">2v2</p>
            <p className={clsx("font-bold", getMetricColor(store.metric_2v2))}>
              {formatPercent(store.metric_2v2)}
            </p>
          </div>
          <div className="px-3">
            <p className="text-xs text-gray-500">החזרות</p>
            <p
              className={clsx(
                "font-bold",
                store.returns_pct_last6 > 15 ? "text-red-600" : "text-gray-600",
              )}
            >
              {store.returns_pct_last6.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex flex-col items-end gap-2">
          <select
            value={store.treatmentStatus}
            onChange={(e) => {
              const newStatus = e.target.value as TreatmentStatus;
              if (newStatus === "resolved") {
                onResolve(store.id);
              } else {
                onStatusChange(store.id, newStatus);
              }
            }}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-sm font-medium border-0 cursor-pointer",
              statusConfig.bgColor,
              statusConfig.color,
            )}
          >
            <option value="pending">ממתין לטיפול</option>
            <option value="in_progress">בטיפול</option>
            <option value="resolved">טופל</option>
          </select>

          {/* Add to Work Plan - Prominent Button */}
          <button
            onClick={() => onAddToWorkPlan(store.id)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            <Calendar className="w-4 h-4" />
            הוסף ללוח
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onRemove(store.id)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="הסר מרשימת הטיפול"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <Link
              href={`/dashboard/stores/${store.id}`}
              className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
