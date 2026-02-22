"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Clock,
  ChevronDown,
  ChevronUp,
  Store,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getStoreTreatmentHistory } from "@/lib/supabase/treatment.queries";
import type { DbStoreTreatmentHistory } from "@/types/supabase";

const EVENT_LABELS: Record<string, string> = {
  added: "נוסף לטיפול",
  status_updated: "עדכון סטטוס",
  notes_updated: "עדכון הערות",
  resolved: "טופל",
  removed: "הוסר",
};

const EVENT_COLORS: Record<string, string> = {
  added: "bg-blue-100 text-blue-700",
  status_updated: "bg-amber-100 text-amber-700",
  notes_updated: "bg-gray-100 text-gray-700",
  resolved: "bg-green-100 text-green-700",
  removed: "bg-red-100 text-red-700",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateForQuery(iso: string): string {
  return new Date(iso).toISOString().split("T")[0] ?? iso;
}

interface TreatmentPeriod {
  startDate: string | null;
  endDate: string | null;
}

interface StoreHistoryGroup {
  storeId: number;
  storeName: string;
  events: DbStoreTreatmentHistory[];
  lastEvent: DbStoreTreatmentHistory;
  treatmentPeriod: TreatmentPeriod;
}

export function TreatmentHistorySection() {
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<DbStoreTreatmentHistory[]>([]);
  const [expandedStores, setExpandedStores] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!companyId || !expanded) return;
    getStoreTreatmentHistory(companyId, undefined, 200).then(setHistory);
  }, [companyId, expanded]);

  const groupedByStore = useMemo(() => {
    const groups: Map<number, StoreHistoryGroup> = new Map();

    history.forEach((h) => {
      if (!groups.has(h.store_id)) {
        groups.set(h.store_id, {
          storeId: h.store_id,
          storeName: h.store_name,
          events: [],
          lastEvent: h,
          treatmentPeriod: { startDate: null, endDate: null },
        });
      }
      groups.get(h.store_id)!.events.push(h);
    });

    // Calculate treatment period for each store
    groups.forEach((group) => {
      const sortedEvents = [...group.events].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      const addedEvent = sortedEvents.find((e) => e.event_type === "added");
      const resolvedEvent = sortedEvents.find(
        (e) => e.event_type === "resolved",
      );

      group.treatmentPeriod = {
        startDate:
          addedEvent?.created_at || sortedEvents[0]?.created_at || null,
        endDate: resolvedEvent?.created_at || null,
      };
    });

    return Array.from(groups.values()).sort(
      (a, b) =>
        new Date(b.lastEvent.created_at).getTime() -
        new Date(a.lastEvent.created_at).getTime(),
    );
  }, [history]);

  const toggleStoreExpand = (storeId: number) => {
    setExpandedStores((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) {
        next.delete(storeId);
      } else {
        next.add(storeId);
      }
      return next;
    });
  };

  if (!companyId) return null;

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="flex items-center gap-2 font-medium">
          <Clock className="w-5 h-5 text-gray-500" />
          היסטוריית טיפולים
        </span>
        {expanded ? (
          <ChevronUp className="w-5 h-5" />
        ) : (
          <ChevronDown className="w-5 h-5" />
        )}
      </button>
      {expanded && (
        <div className="p-4 max-h-[500px] overflow-y-auto">
          {groupedByStore.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              אין רשומות היסטוריה
            </p>
          ) : (
            <div className="space-y-2">
              {groupedByStore.map((group) => {
                const isStoreExpanded = expandedStores.has(group.storeId);
                return (
                  <div
                    key={group.storeId}
                    className="border rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleStoreExpand(group.storeId)}
                      className="w-full flex items-center justify-between p-3 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Store className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {group.storeName}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({group.events.length} אירועים)
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${EVENT_COLORS[group.lastEvent.event_type] || "bg-gray-100"}`}
                        >
                          {EVENT_LABELS[group.lastEvent.event_type] ||
                            group.lastEvent.event_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {formatDate(group.lastEvent.created_at)}
                        </span>
                        {isStoreExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {isStoreExpanded && (
                      <div className="border-t bg-gray-50 p-3 space-y-3">
                        {/* Link to visit reports for this store during treatment */}
                        {group.treatmentPeriod.startDate && (
                          <Link
                            href={`/dashboard/stores/${group.storeId}?tab=visits&from=${formatDateForQuery(group.treatmentPeriod.startDate)}${group.treatmentPeriod.endDate ? `&to=${formatDateForQuery(group.treatmentPeriod.endDate)}` : ""}`}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-sm font-medium transition-colors"
                          >
                            <ClipboardList className="w-4 h-4" />
                            צפה בתעודות ביקור בתקופת הטיפול
                            <span className="text-xs text-amber-600 font-normal">
                              (
                              {
                                formatDate(
                                  group.treatmentPeriod.startDate,
                                ).split(",")[0]
                              }
                              {group.treatmentPeriod.endDate
                                ? ` - ${formatDate(group.treatmentPeriod.endDate).split(",")[0]}`
                                : " - היום"}
                              )
                            </span>
                          </Link>
                        )}

                        <div className="space-y-2">
                          {group.events.map((event) => (
                            <div
                              key={event.id}
                              className="flex flex-wrap items-center gap-2 py-2 px-3 bg-white rounded-lg text-sm"
                            >
                              <span
                                className={`px-2 py-0.5 rounded text-xs ${EVENT_COLORS[event.event_type] || "bg-gray-100"}`}
                              >
                                {EVENT_LABELS[event.event_type] ||
                                  event.event_type}
                              </span>
                              {event.old_status && event.new_status && (
                                <span className="text-gray-600">
                                  {event.old_status} → {event.new_status}
                                </span>
                              )}
                              {event.reason && (
                                <span className="text-gray-500">
                                  סיבה: {event.reason}
                                </span>
                              )}
                              {event.notes && (
                                <span
                                  className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded"
                                  title={event.notes}
                                >
                                  {event.notes.length > 50
                                    ? event.notes.slice(0, 50) + "..."
                                    : event.notes}
                                </span>
                              )}
                              <span className="text-gray-400 text-xs mr-auto">
                                {formatDate(event.created_at)}
                                {event.created_by_name &&
                                  ` • ${event.created_by_name}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
