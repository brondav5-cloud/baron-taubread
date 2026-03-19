"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Clock,
  Search,
  Filter,
  Calendar,
  Store,
  ChevronLeft,
  LayoutList,
} from "lucide-react";
import { clsx } from "clsx";
import { useVisits } from "@/context/VisitsContext";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function daysSince(dateStr: string): number {
  const visitDate = new Date(dateStr);
  const today = new Date();
  const diff = today.getTime() - visitDate.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function VisitHistoryTable() {
  const { visits, stores } = useVisits();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [sortBy, setSortBy] = useState<"date" | "visits">("date");

  const cities = useMemo(() => {
    const citySet = new Set(stores.map((s) => s.city).filter(Boolean));
    return Array.from(citySet).sort((a, b) => a.localeCompare(b, "he"));
  }, [stores]);

  const agents = useMemo(() => {
    const agentSet = new Set(stores.map((s) => s.agent).filter(Boolean));
    return Array.from(agentSet).sort((a, b) => a.localeCompare(b, "he"));
  }, [stores]);

  // Group visits by store
  const storeVisitData = useMemo(() => {
    const storeMap = new Map<
      number,
      {
        storeId: number;
        storeName: string;
        storeCity: string;
        agentName: string;
        visitCount: number;
        lastVisit: string | null;
        visits: typeof visits;
      }
    >();

    visits
      .filter((v) => v.visitType === "store" && v.storeId != null)
      .forEach((v) => {
        const sid = v.storeId!;
        if (!storeMap.has(sid)) {
          storeMap.set(sid, {
            storeId: sid,
            storeName: v.storeName ?? "",
            storeCity: v.storeCity ?? "",
            agentName: v.agentName,
            visitCount: 0,
            lastVisit: null,
            visits: [],
          });
        }
        const data = storeMap.get(sid)!;
        data.visitCount++;
        data.visits.push(v);
        if (!data.lastVisit || new Date(v.date) > new Date(data.lastVisit)) {
          data.lastVisit = v.date;
        }
      });

    return Array.from(storeMap.values());
  }, [visits]);

  // Filter and sort
  const filteredData = useMemo(() => {
    let result = storeVisitData;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.storeName.toLowerCase().includes(term) ||
          s.storeCity.toLowerCase().includes(term) ||
          s.agentName.toLowerCase().includes(term),
      );
    }

    if (selectedCity) {
      result = result.filter((s) => s.storeCity === selectedCity);
    }

    if (selectedAgent) {
      result = result.filter((s) => s.agentName === selectedAgent);
    }

    if (sortBy === "date") {
      result = [...result].sort((a, b) => {
        if (!a.lastVisit) return 1;
        if (!b.lastVisit) return -1;
        return (
          new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime()
        );
      });
    } else {
      result = [...result].sort((a, b) => b.visitCount - a.visitCount);
    }

    return result;
  }, [storeVisitData, searchTerm, selectedCity, selectedAgent, sortBy]);

  const [expandedStore, setExpandedStore] = useState<number | null>(null);

  if (visits.length === 0) {
    return (
      <div className="border rounded-xl p-8 text-center bg-gray-50">
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">אין היסטוריית ביקורים</p>
      </div>
    );
  }

  return (
    <div className="border rounded-xl overflow-hidden bg-white">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-blue-500" />
          <h3 className="font-bold">היסטוריית ביקורים בחנויות</h3>
          <span className="text-sm text-gray-500">
            ({visits.length} ביקורים ב־{storeVisitData.length} חנויות)
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="חיפוש לפי שם חנות, עיר או סוכן..."
              className="w-full pr-10 pl-4 py-2 border rounded-lg text-sm"
            />
          </div>

          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm min-w-[120px]"
          >
            <option value="">כל הערים</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm min-w-[120px]"
          >
            <option value="">כל הסוכנים</option>
            {agents.map((agent) => (
              <option key={agent} value={agent}>
                {agent}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "date" | "visits")}
            className="px-3 py-2 border rounded-lg text-sm min-w-[140px]"
          >
            <option value="date">מיון לפי תאריך</option>
            <option value="visits">מיון לפי כמות ביקורים</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="max-h-[500px] overflow-y-auto">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0">
            <tr className="text-right text-sm text-gray-600">
              <th className="px-4 py-3 font-medium">חנות</th>
              <th className="px-4 py-3 font-medium">עיר</th>
              <th className="px-4 py-3 font-medium">סוכן</th>
              <th className="px-4 py-3 font-medium text-center">ביקורים</th>
              <th className="px-4 py-3 font-medium">ביקור אחרון</th>
              <th className="px-4 py-3 font-medium text-center">ימים מאז</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((store) => {
              const isExpanded = expandedStore === store.storeId;
              const days = store.lastVisit ? daysSince(store.lastVisit) : null;

              return (
                <>
                  <tr
                    key={store.storeId}
                    onClick={() =>
                      setExpandedStore(isExpanded ? null : store.storeId)
                    }
                    className={clsx(
                      "border-t cursor-pointer transition-colors",
                      isExpanded ? "bg-blue-50" : "hover:bg-gray-50",
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{store.storeName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {store.storeCity}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {store.agentName}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={clsx(
                          "px-2 py-1 rounded-full text-sm font-bold",
                          store.visitCount >= 5
                            ? "bg-green-100 text-green-700"
                            : store.visitCount >= 3
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700",
                        )}
                      >
                        {store.visitCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {store.lastVisit ? formatDate(store.lastVisit) : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {days !== null && (
                        <span
                          className={clsx(
                            "px-2 py-1 rounded text-sm",
                            days > 30
                              ? "bg-red-100 text-red-700"
                              : days > 14
                                ? "bg-amber-100 text-amber-700"
                                : "bg-green-100 text-green-700",
                          )}
                        >
                          {days} ימים
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/stores/${store.storeId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-gray-400" />
                      </Link>
                    </td>
                  </tr>

                  {isExpanded && store.visits.length > 0 && (
                    <tr key={`${store.storeId}-details`}>
                      <td colSpan={7} className="bg-gray-50 px-4 py-3">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            פירוט ביקורים:
                          </p>
                          {store.visits
                            .sort(
                              (a, b) =>
                                new Date(b.date).getTime() -
                                new Date(a.date).getTime(),
                            )
                            .map((visit) => (
                              <div
                                key={visit.id}
                                className="flex items-center gap-4 p-2 bg-white rounded-lg text-sm"
                              >
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="font-medium">
                                  {formatDate(visit.date)}
                                </span>
                                {visit.time && (
                                  <span className="text-gray-500">
                                    {visit.time}
                                  </span>
                                )}
                                {visit.notes && (
                                  <span
                                    className="text-gray-600 truncate max-w-[300px]"
                                    title={visit.notes}
                                  >
                                    {visit.notes}
                                  </span>
                                )}
                                <span
                                  className={clsx(
                                    "px-2 py-0.5 rounded text-xs",
                                    visit.status === "completed"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-amber-100 text-amber-700",
                                  )}
                                >
                                  {visit.status === "completed"
                                    ? "הושלם"
                                    : "טיוטה"}
                                </span>
                              </div>
                            ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Filter className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>לא נמצאו תוצאות לפי הסינון</p>
          </div>
        )}
      </div>

      {/* General visits section */}
      <GeneralVisitsSection visits={visits} />
    </div>
  );
}

function GeneralVisitsSection({
  visits,
}: {
  visits: ReturnType<typeof useVisits>["visits"];
}) {
  const generalVisits = useMemo(
    () =>
      visits
        .filter((v) => v.visitType === "general")
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
    [visits],
  );

  if (generalVisits.length === 0) return null;

  return (
    <div className="border-t bg-gray-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <LayoutList className="w-5 h-5 text-purple-500" />
        <h3 className="font-bold text-gray-800">ביקורים כלליים</h3>
        <span className="text-sm text-gray-500">({generalVisits.length})</span>
      </div>
      <div className="space-y-2">
        {generalVisits.map((visit) => (
          <div
            key={visit.id}
            className="flex items-center gap-4 p-3 bg-white rounded-xl text-sm border border-gray-100"
          >
            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-gray-600 w-24 shrink-0">
              {formatDate(visit.date)}
            </span>
            <span className="font-medium text-purple-700 shrink-0">
              {visit.generalActivityLabel ?? "פעילות כללית"}
            </span>
            <span className="text-gray-500 shrink-0">{visit.agentName}</span>
            {visit.notes && (
              <span
                className="text-gray-500 truncate"
                title={visit.notes}
              >
                {visit.notes}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
