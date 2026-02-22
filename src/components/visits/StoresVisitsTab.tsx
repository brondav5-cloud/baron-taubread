"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  X,
  Calendar,
  AlertTriangle,
  ChevronLeft,
  Clock,
} from "lucide-react";
import { clsx } from "clsx";
import type { StoreVisitInfo } from "@/context/VisitsContext";

interface StoresVisitsTabProps {
  storesInfo: StoreVisitInfo[];
}

type FilterType = "all" | "never" | "over30" | "over14" | "recent";

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all", label: "כל החנויות" },
  { value: "never", label: "ללא ביקור" },
  { value: "over30", label: "מעל 30 יום" },
  { value: "over14", label: "מעל 14 יום" },
  { value: "recent", label: "ביקור אחרון (7 ימים)" },
];

export function StoresVisitsTab({ storesInfo }: StoresVisitsTabProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [showFilters, setShowFilters] = useState(false);

  const filteredStores = useMemo(() => {
    let result = storesInfo;

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.storeName.toLowerCase().includes(searchLower) ||
          s.storeCity.toLowerCase().includes(searchLower) ||
          s.agentName.toLowerCase().includes(searchLower),
      );
    }

    // Visit status filter
    switch (filter) {
      case "never":
        result = result.filter((s) => s.lastVisitDate === null);
        break;
      case "over30":
        result = result.filter(
          (s) => s.daysSinceVisit === null || s.daysSinceVisit > 30,
        );
        break;
      case "over14":
        result = result.filter(
          (s) => s.daysSinceVisit === null || s.daysSinceVisit > 14,
        );
        break;
      case "recent":
        result = result.filter(
          (s) => s.daysSinceVisit !== null && s.daysSinceVisit <= 7,
        );
        break;
    }

    // Sort: stores without visits first, then by days since visit
    return result.sort((a, b) => {
      if (a.daysSinceVisit === null && b.daysSinceVisit === null) return 0;
      if (a.daysSinceVisit === null) return -1;
      if (b.daysSinceVisit === null) return 1;
      return b.daysSinceVisit - a.daysSinceVisit;
    });
  }, [storesInfo, search, filter]);

  const stats = useMemo(() => {
    const never = storesInfo.filter((s) => s.lastVisitDate === null).length;
    const over30 = storesInfo.filter(
      (s) => s.daysSinceVisit !== null && s.daysSinceVisit > 30,
    ).length;
    const over14 = storesInfo.filter(
      (s) => s.daysSinceVisit !== null && s.daysSinceVisit > 14,
    ).length;
    return { never, over30, over14 };
  }, [storesInfo]);

  const getDaysColor = (days: number | null): string => {
    if (days === null) return "text-gray-400";
    if (days <= 7) return "text-green-600";
    if (days <= 14) return "text-blue-600";
    if (days <= 30) return "text-amber-600";
    return "text-red-600";
  };

  const getDaysBg = (days: number | null): string => {
    if (days === null) return "bg-gray-100";
    if (days <= 7) return "bg-green-50";
    if (days <= 14) return "bg-blue-50";
    if (days <= 30) return "bg-amber-50";
    return "bg-red-50";
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setFilter(filter === "never" ? "all" : "never")}
          className={clsx(
            "p-3 rounded-xl text-center transition-all",
            filter === "never"
              ? "ring-2 ring-red-500 bg-red-50"
              : "bg-red-50 hover:bg-red-100",
          )}
        >
          <AlertTriangle className="w-5 h-5 text-red-600 mx-auto mb-1" />
          <p className="text-xl font-bold text-red-700">{stats.never}</p>
          <p className="text-xs text-red-600">ללא ביקור</p>
        </button>
        <button
          onClick={() => setFilter(filter === "over30" ? "all" : "over30")}
          className={clsx(
            "p-3 rounded-xl text-center transition-all",
            filter === "over30"
              ? "ring-2 ring-amber-500 bg-amber-50"
              : "bg-amber-50 hover:bg-amber-100",
          )}
        >
          <Clock className="w-5 h-5 text-amber-600 mx-auto mb-1" />
          <p className="text-xl font-bold text-amber-700">{stats.over30}</p>
          <p className="text-xs text-amber-600">מעל 30 יום</p>
        </button>
        <button
          onClick={() => setFilter(filter === "over14" ? "all" : "over14")}
          className={clsx(
            "p-3 rounded-xl text-center transition-all",
            filter === "over14"
              ? "ring-2 ring-blue-500 bg-blue-50"
              : "bg-blue-50 hover:bg-blue-100",
          )}
        >
          <Calendar className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <p className="text-xl font-bold text-blue-700">{stats.over14}</p>
          <p className="text-xs text-blue-600">מעל 14 יום</p>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl shadow-card p-4 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש חנות, עיר, סוכן..."
              className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
              showFilters || filter !== "all"
                ? "bg-primary-100 text-primary-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
          >
            <Filter className="w-4 h-4" />
            סינון
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 pt-3 border-t">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  filter === option.value
                    ? "bg-primary-100 text-primary-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500">
        מציג {filteredStores.length} מתוך {storesInfo.length} חנויות
      </p>

      {/* Stores List */}
      <div className="space-y-2">
        {filteredStores.map((store) => (
          <Link
            key={store.storeId}
            href={`/dashboard/stores/${store.storeId}`}
            className="block bg-white rounded-xl shadow-card p-4 hover:shadow-elevated transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">
                    {store.storeName}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-gray-500">
                    {store.storeCity}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>סוכן: {store.agentName}</span>
                  {store.totalVisits > 0 && (
                    <span>{store.totalVisits} ביקורים</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    "px-3 py-2 rounded-lg text-center min-w-[100px]",
                    getDaysBg(store.daysSinceVisit),
                  )}
                >
                  {store.lastVisitDate ? (
                    <>
                      <p
                        className={clsx(
                          "text-lg font-bold",
                          getDaysColor(store.daysSinceVisit),
                        )}
                      >
                        {store.daysSinceVisit} ימים
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(store.lastVisitDate).toLocaleDateString(
                          "he-IL",
                        )}
                      </p>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-gray-400 mx-auto" />
                      <p className="text-xs text-gray-500">ללא ביקור</p>
                    </>
                  )}
                </div>
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredStores.length === 0 && (
        <div className="bg-white rounded-2xl shadow-card p-12 text-center">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">לא נמצאו חנויות</p>
        </div>
      )}
    </div>
  );
}
