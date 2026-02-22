"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  Search,
  X,
  ChevronLeft,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle,
  Eye,
} from "lucide-react";
import { clsx } from "clsx";
import { useVisits } from "@/context/VisitsContext";
import { DEMO_VISITS } from "@/hooks/useVisitsPage";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";

interface StoreVisitInfo {
  storeId: number;
  storeName: string;
  storeCity: string;
  agent: string;
  totalVisits: number;
  lastVisitDate: string | null;
  daysSinceLastVisit: number | null;
  visits: typeof DEMO_VISITS;
}

export function StoreVisitsHistory() {
  const { stores: storesFromContext } = useVisits();
  const [search, setSearch] = useState("");
  const [filterAgent, setFilterAgent] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "recent" | "overdue" | "never"
  >("all");
  const [expandedStore, setExpandedStore] = useState<number | null>(null);

  const stores = useMemo(
    () =>
      storesFromContext.map((s) => ({
        id: s.external_id,
        name: s.name,
        city: s.city,
        agent: s.agent,
      })),
    [storesFromContext],
  );
  const agents = useMemo(
    () =>
      Array.from(new Set(stores.map((s) => s.agent).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b, "he"),
      ),
    [stores],
  );

  // Calculate days since last visit for each store
  const storeVisitInfo = useMemo((): StoreVisitInfo[] => {
    const today = new Date();

    return stores.map((store) => {
      // Find visits for this store
      const storeVisits = DEMO_VISITS.filter(
        (v) => v.storeId === String(store.id) || v.storeName === store.name,
      );

      // Get last visit date
      let lastVisitDate: string | null = null;
      let daysSince: number | null = null;

      if (storeVisits.length > 0) {
        // Sort by date descending
        const sorted = [...storeVisits].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        const firstVisit = sorted[0];
        if (firstVisit) {
          lastVisitDate = firstVisit.date;

          const lastDate = new Date(lastVisitDate);
          daysSince = Math.floor(
            (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
          );
        }
      }

      return {
        storeId: store.id,
        storeName: store.name,
        storeCity: store.city,
        agent: store.agent,
        totalVisits: storeVisits.length,
        lastVisitDate,
        daysSinceLastVisit: daysSince,
        visits: storeVisits,
      };
    });
  }, [stores]);

  // Filter stores
  const filteredStores = useMemo(() => {
    return storeVisitInfo
      .filter((store) => {
        // Search filter
        if (search) {
          const searchLower = search.toLowerCase();
          if (
            !store.storeName.toLowerCase().includes(searchLower) &&
            !store.storeCity.toLowerCase().includes(searchLower)
          ) {
            return false;
          }
        }

        // Agent filter
        if (filterAgent && store.agent !== filterAgent) {
          return false;
        }

        // Status filter
        if (filterStatus !== "all") {
          if (
            filterStatus === "recent" &&
            (store.daysSinceLastVisit === null || store.daysSinceLastVisit > 30)
          ) {
            return false;
          }
          if (
            filterStatus === "overdue" &&
            (store.daysSinceLastVisit === null ||
              store.daysSinceLastVisit <= 30)
          ) {
            return false;
          }
          if (filterStatus === "never" && store.totalVisits > 0) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by days since last visit (nulls last, then descending)
        if (a.daysSinceLastVisit === null && b.daysSinceLastVisit === null)
          return 0;
        if (a.daysSinceLastVisit === null) return 1;
        if (b.daysSinceLastVisit === null) return -1;
        return b.daysSinceLastVisit - a.daysSinceLastVisit;
      });
  }, [storeVisitInfo, search, filterAgent, filterStatus]);

  // Stats
  const stats = useMemo(
    () => ({
      total: stores.length,
      visited: storeVisitInfo.filter((s) => s.totalVisits > 0).length,
      recent: storeVisitInfo.filter(
        (s) => s.daysSinceLastVisit !== null && s.daysSinceLastVisit <= 30,
      ).length,
      overdue: storeVisitInfo.filter(
        (s) => s.daysSinceLastVisit !== null && s.daysSinceLastVisit > 30,
      ).length,
      never: storeVisitInfo.filter((s) => s.totalVisits === 0).length,
    }),
    [stores.length, storeVisitInfo],
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("he-IL");
  };

  const getStatusColor = (daysSince: number | null) => {
    if (daysSince === null) return "text-gray-400";
    if (daysSince <= 14) return "text-green-600";
    if (daysSince <= 30) return "text-amber-600";
    return "text-red-600";
  };

  const getStatusBg = (daysSince: number | null) => {
    if (daysSince === null) return "bg-gray-100";
    if (daysSince <= 14) return "bg-green-50";
    if (daysSince <= 30) return "bg-amber-50";
    return "bg-red-50";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<Calendar className="w-5 h-5 text-blue-500" />}>
          היסטוריית ביקורים לפי חנות
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => setFilterStatus("all")}
            className={clsx(
              "p-3 rounded-xl text-center transition-all",
              filterStatus === "all" ? "ring-2 ring-gray-400" : "",
            )}
          >
            <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-600">סה״כ חנויות</p>
          </button>
          <button
            onClick={() => setFilterStatus("recent")}
            className={clsx(
              "p-3 rounded-xl text-center transition-all bg-green-50",
              filterStatus === "recent" ? "ring-2 ring-green-500" : "",
            )}
          >
            <p className="text-xl font-bold text-green-700">{stats.recent}</p>
            <p className="text-xs text-green-600">ביקור ב-30 יום</p>
          </button>
          <button
            onClick={() => setFilterStatus("overdue")}
            className={clsx(
              "p-3 rounded-xl text-center transition-all bg-red-50",
              filterStatus === "overdue" ? "ring-2 ring-red-500" : "",
            )}
          >
            <p className="text-xl font-bold text-red-700">{stats.overdue}</p>
            <p className="text-xs text-red-600">מעל 30 יום</p>
          </button>
          <button
            onClick={() => setFilterStatus("never")}
            className={clsx(
              "p-3 rounded-xl text-center transition-all bg-gray-100",
              filterStatus === "never" ? "ring-2 ring-gray-500" : "",
            )}
          >
            <p className="text-xl font-bold text-gray-700">{stats.never}</p>
            <p className="text-xs text-gray-600">ללא ביקור</p>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש חנות..."
              className="w-full pr-10 pl-4 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute left-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="">כל הסוכנים</option>
            {agents.map((agent) => (
              <option key={agent} value={agent}>
                {agent}
              </option>
            ))}
          </select>
        </div>

        {/* Stores List */}
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filteredStores.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">לא נמצאו חנויות</p>
            </div>
          ) : (
            filteredStores.map((store) => (
              <div
                key={store.storeId}
                className="border rounded-xl overflow-hidden"
              >
                {/* Store Row */}
                <button
                  onClick={() =>
                    setExpandedStore(
                      expandedStore === store.storeId ? null : store.storeId,
                    )
                  }
                  className={clsx(
                    "w-full p-3 flex items-center gap-3 text-right transition-colors",
                    getStatusBg(store.daysSinceLastVisit),
                    "hover:bg-opacity-75",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">
                      {store.storeName}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {store.storeCity} | {store.agent}
                    </p>
                  </div>

                  <div className="text-center px-3">
                    <p className="text-sm font-bold text-gray-700">
                      {store.totalVisits}
                    </p>
                    <p className="text-xs text-gray-500">ביקורים</p>
                  </div>

                  <div className="text-center px-3">
                    {store.daysSinceLastVisit !== null ? (
                      <>
                        <p
                          className={clsx(
                            "text-sm font-bold",
                            getStatusColor(store.daysSinceLastVisit),
                          )}
                        >
                          {store.daysSinceLastVisit}
                        </p>
                        <p className="text-xs text-gray-500">ימים</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-gray-400">—</p>
                        <p className="text-xs text-gray-400">אין ביקור</p>
                      </>
                    )}
                  </div>

                  <ChevronLeft
                    className={clsx(
                      "w-5 h-5 text-gray-400 transition-transform",
                      expandedStore === store.storeId && "rotate-90",
                    )}
                  />
                </button>

                {/* Expanded Visits List */}
                {expandedStore === store.storeId && store.visits.length > 0 && (
                  <div className="border-t bg-white p-3 space-y-2">
                    {store.visits.map((visit) => (
                      <div
                        key={visit.id}
                        className="p-2 bg-gray-50 rounded-lg flex items-center gap-3"
                      >
                        <div
                          className={clsx(
                            "p-1.5 rounded-lg",
                            visit.status === "completed"
                              ? "bg-green-100"
                              : "bg-amber-100",
                          )}
                        >
                          {visit.status === "completed" ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-600 line-clamp-1">
                            {visit.notes}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{formatDate(visit.date)}</span>
                            <span>•</span>
                            <span>{visit.agentName}</span>
                            {visit.hasPhotos && (
                              <>
                                <span>•</span>
                                <span>{visit.photosCount} תמונות</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Link
                          href={`/dashboard/stores/${store.storeId}`}
                          className="p-2 hover:bg-gray-200 rounded-lg"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty state for expanded store with no visits */}
                {expandedStore === store.storeId &&
                  store.visits.length === 0 && (
                    <div className="border-t bg-white p-4 text-center">
                      <p className="text-sm text-gray-500">
                        אין ביקורים מתועדים
                      </p>
                      <Link
                        href="/dashboard/visits/new"
                        className="text-sm text-primary-600 hover:underline"
                      >
                        הוסף ביקור ראשון
                      </Link>
                    </div>
                  )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t text-center">
          <p className="text-sm text-gray-500">
            מציג {filteredStores.length} מתוך {stats.total} חנויות
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
