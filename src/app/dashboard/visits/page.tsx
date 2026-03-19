"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ClipboardList, Search, Filter, Plus, X, Calendar } from "lucide-react";

import { useVisits } from "@/context/VisitsContext";
import {
  VisitsTabs,
  VisitCard,
  VisitDetailModal,
  StoresVisitsTab,
  VisitHistoryTable,
  type VisitsTabType,
} from "@/components/visits";
import type { Visit } from "@/context/VisitsContext";

export default function VisitsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeFilterFromUrl = searchParams.get("store");
  const storeIdFromUrl = storeFilterFromUrl ? Number(storeFilterFromUrl) : null;

  const { visits, stats, getStoresWithVisitInfo, isLoading } = useVisits();

  // Tab state
  const [activeTab, setActiveTab] = useState<VisitsTabType>("visits");

  // Filters state
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [agentFilter, setAgentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState<number | null>(storeIdFromUrl);
  const [dateFilter, setDateFilter] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });

  useEffect(() => {
    if (storeIdFromUrl != null && !Number.isNaN(storeIdFromUrl)) {
      setStoreFilter(storeIdFromUrl);
    }
  }, [storeIdFromUrl]);

  // Modal state
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  // Get unique agents from visits
  const agents = useMemo(() => {
    const agentSet = new Set(visits.map((v) => v.agentName));
    return Array.from(agentSet).sort((a, b) => a.localeCompare(b, "he"));
  }, [visits]);

  // Filter all visits together (store + general)
  const filteredVisits = useMemo(() => {
    return visits.filter((visit) => {
      // Date filter
      if (dateFilter && visit.date !== dateFilter) return false;
      // Store filter — applies only to store visits
      if (
        storeFilter != null &&
        (visit.visitType !== "store" || visit.storeId !== storeFilter)
      )
        return false;
      // Search: match store name/city, general activity label, or notes
      if (search) {
        const searchLower = search.toLowerCase();
        const storeMatch =
          visit.storeName?.toLowerCase().includes(searchLower) ||
          visit.storeCity?.toLowerCase().includes(searchLower);
        const generalMatch = visit.generalActivityLabel
          ?.toLowerCase()
          .includes(searchLower);
        const notesMatch = visit.notes.toLowerCase().includes(searchLower);
        if (!storeMatch && !generalMatch && !notesMatch) return false;
      }
      if (agentFilter && visit.agentName !== agentFilter) return false;
      if (statusFilter && visit.status !== statusFilter) return false;
      return true;
    });
  }, [visits, search, agentFilter, statusFilter, storeFilter, dateFilter]);

  // Get stores with visit info for second tab
  const storesWithVisitInfo = useMemo(
    () => getStoresWithVisitInfo(),
    [getStoresWithVisitInfo],
  );

  const activeFiltersCount = [
    agentFilter,
    statusFilter,
    storeFilter != null,
  ].filter(Boolean).length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full" />
        <p className="mt-4 text-gray-500">טוען ביקורים...</p>
      </div>
    );
  }

  const clearFilters = () => {
    setAgentFilter("");
    setStatusFilter("");
    setStoreFilter(null);
    if (storeFilterFromUrl) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("store");
      router.replace(
        `/dashboard/visits${params.toString() ? `?${params}` : ""}`,
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-xl">
            <ClipboardList className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ביקורים</h1>
            <p className="text-gray-500 text-sm">
              {stats.total} ביקורים | {storesWithVisitInfo.length} חנויות
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/visits/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          הוסף ביקור
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-500">סה&quot;כ ביקורים</p>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          <p className="text-sm text-gray-500">הושלמו</p>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">
            {stats.withPhotos}
          </p>
          <p className="text-sm text-gray-500">עם תמונות</p>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {stats.totalPhotos}
          </p>
          <p className="text-sm text-gray-500">תמונות סה&quot;כ</p>
        </div>
      </div>

      {/* Tabs */}
      <VisitsTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        visitsCount={visits.length}
        storesCount={storesWithVisitInfo.length}
      />

      {/* Tab Content */}
      {activeTab === "visits" && (
        <>
          {/* Date selector bar */}
          <div className="bg-white rounded-2xl shadow-card p-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary-500 shrink-0" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="flex-1 bg-gray-50 border-0 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter("")}
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                  כל הזמנים
                </button>
              )}
              <span className="text-sm text-gray-500 shrink-0">
                {filteredVisits.length} ביקורים
              </span>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-2xl shadow-card p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="חיפוש לפי חנות, עיר, הערות..."
                  className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  showFilters || activeFiltersCount > 0
                    ? "bg-primary-100 text-primary-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Filter className="w-4 h-4" />
                סינון
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            {storeFilter != null && (
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <span className="text-sm text-gray-600">
                  מסנן לפי חנות:{" "}
                  {visits.find(
                    (v) =>
                      v.visitType === "store" && v.storeId === storeFilter,
                  )?.storeName ?? `#${storeFilter}`}
                </span>
                <button
                  onClick={() => {
                    setStoreFilter(null);
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete("store");
                    router.replace(
                      `/dashboard/visits${params.toString() ? `?${params}` : ""}`,
                    );
                  }}
                  className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> הסר
                </button>
              </div>
            )}
            {showFilters && (
              <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-100">
                <select
                  value={agentFilter}
                  onChange={(e) => setAgentFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-50 rounded-xl text-sm border-0 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">כל הסוכנים</option>
                  {agents.map((agent) => (
                    <option key={agent} value={agent}>
                      {agent}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-50 rounded-xl text-sm border-0 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">כל הסטטוסים</option>
                  <option value="completed">הושלם</option>
                  <option value="draft">טיוטה</option>
                </select>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl text-sm transition-colors"
                  >
                    <X className="w-4 h-4" />
                    נקה הכל
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Visits List */}
          <div className="space-y-4">
            {filteredVisits.map((visit) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                onViewDetails={setSelectedVisit}
              />
            ))}
          </div>

          {filteredVisits.length === 0 && (
            <div className="bg-white rounded-2xl shadow-card p-12 text-center">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">לא נמצאו ביקורים</p>
            </div>
          )}
        </>
      )}

      {activeTab === "stores" && (
        <StoresVisitsTab storesInfo={storesWithVisitInfo} />
      )}

      {activeTab === "history" && <VisitHistoryTable />}

      {/* Visit Detail Modal */}
      {selectedVisit && (
        <VisitDetailModal
          visit={selectedVisit}
          onClose={() => setSelectedVisit(null)}
        />
      )}
    </div>
  );
}
