"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Search, Store, ChevronDown, ChevronUp } from "lucide-react";
import { clsx } from "clsx";
import { Card, CardContent, CardHeader, PageHeader } from "@/components/ui";
import { MultiSelect } from "@/components/ui";
import { LoadingState } from "@/components/common";
import { useCompetitors } from "@/hooks/useCompetitors";
import { formatPercent, getMetricColor } from "@/lib/calculations";

export default function CompetitorsPage() {
  const {
    competitorStats,
    allCompetitorNames,
    competitorFilter,
    setCompetitorFilter,
    search,
    setSearch,
    isLoading,
  } = useCompetitors();

  const [expandedCompetitor, setExpandedCompetitor] = useState<string | null>(
    null,
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("he-IL");
  };

  const daysSince = (dateStr: string) => {
    return Math.floor(
      (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24),
    );
  };

  const totalSightings = competitorStats.reduce(
    (s, c) => s + c.totalSightings,
    0,
  );
  const uniqueStores = new Set(
    competitorStats.flatMap((c) => c.stores.map((s) => s.id)),
  ).size;
  const uniqueCities = new Set(
    competitorStats.flatMap((c) => c.stores.map((s) => s.city)),
  ).size;

  if (isLoading) {
    return (
      <div className="flex justify-center min-h-[400px] items-center">
        <LoadingState message="טוען נתוני מתחרים..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="מתחרים"
        subtitle={`${competitorStats.length} מתחרים זוהו • חצי שנה מול חצי שנה • 2 חודשים מול 2 קודמים`}
        icon={<Users className="w-6 h-6 text-orange-500" />}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-orange-50 rounded-xl text-center">
          <p className="text-2xl font-bold text-orange-700">
            {competitorStats.length}
          </p>
          <p className="text-sm text-orange-600">מתחרים</p>
        </div>
        <div className="p-4 bg-blue-50 rounded-xl text-center">
          <p className="text-2xl font-bold text-blue-700">{uniqueStores}</p>
          <p className="text-sm text-blue-600">חנויות עם מתחרים</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-xl text-center">
          <p className="text-2xl font-bold text-purple-700">{totalSightings}</p>
          <p className="text-sm text-purple-600">תיעודים</p>
        </div>
        <div className="p-4 bg-green-50 rounded-xl text-center">
          <p className="text-2xl font-bold text-green-700">{uniqueCities}</p>
          <p className="text-sm text-green-600">ערים</p>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חפש מתחרה..."
                className="w-full pr-10 pl-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <MultiSelect
              label="סנן לפי מתחרים"
              options={allCompetitorNames}
              selected={competitorFilter}
              onChange={setCompetitorFilter}
              placeholder="כל המתחרים"
            />
            {competitorFilter.length > 0 && (
              <button
                onClick={() => setCompetitorFilter([])}
                className="self-end px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl text-sm"
              >
                נקה סינון
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Competitors List */}
      <Card>
        <CardHeader className="pb-2">
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-500" />
              רשימת מתחרים
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              מדדים 6v6 (חצי שנה) ו-2v2 (2 חודשים) ממוצעים על חנויות בהן נצפה
              המתחרה
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {competitorStats.map((comp) => (
              <div
                key={comp.name}
                className="border rounded-xl overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedCompetitor(
                      expandedCompetitor === comp.name ? null : comp.name,
                    )
                  }
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-right"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-xl font-bold text-orange-600">
                        {comp.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-lg">
                        {comp.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        נצפה ב-{comp.storeCount} חנויות • {comp.totalSightings}{" "}
                        תיעודים
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">חצי שנה (6v6)</p>
                      <p
                        className={clsx(
                          "font-bold",
                          getMetricColor(comp.avgMetric6v6),
                        )}
                      >
                        {formatPercent(comp.avgMetric6v6)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">2v2</p>
                      <p
                        className={clsx(
                          "font-bold",
                          getMetricColor(comp.avgMetric2v2),
                        )}
                      >
                        {formatPercent(comp.avgMetric2v2)}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-gray-500">נצפה לאחרונה</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(comp.lastSeen)}
                      </p>
                    </div>
                    {expandedCompetitor === comp.name ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {expandedCompetitor === comp.name && (
                  <div className="border-t bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      חנויות בהן נצפה {comp.name} (מדדים ממוצעים: 6v6{" "}
                      {formatPercent(comp.avgMetric6v6)} | 2v2{" "}
                      {formatPercent(comp.avgMetric2v2)}):
                    </p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {comp.stores.map((store) => (
                        <Link
                          key={store.id}
                          href={`/dashboard/stores/${store.id}`}
                          className="p-3 bg-white rounded-lg border hover:border-primary-300 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Store className="w-4 h-4 text-gray-400" />
                            <p className="font-medium text-gray-900 text-sm">
                              {store.name}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500">{store.city}</p>
                          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t text-xs">
                            <span className="text-gray-500">
                              נצפה {store.count} פעמים
                            </span>
                            <span
                              className={clsx(
                                daysSince(store.lastSeen) <= 7
                                  ? "text-green-600"
                                  : daysSince(store.lastSeen) <= 30
                                    ? "text-amber-600"
                                    : "text-red-600",
                              )}
                            >
                              לפני {daysSince(store.lastSeen)} ימים
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs">
                            <span
                              className={clsx(
                                "font-medium",
                                getMetricColor(store.metric_6v6),
                              )}
                            >
                              6v6: {formatPercent(store.metric_6v6)}
                            </span>
                            <span
                              className={clsx(
                                "font-medium",
                                getMetricColor(store.metric_2v2),
                              )}
                            >
                              2v2: {formatPercent(store.metric_2v2)}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                    {comp.recentNotes.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          הערות אחרונות:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {comp.recentNotes.map((note, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-1 bg-white rounded border text-gray-600"
                            >
                              {note}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {competitorStats.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">לא נמצאו מתחרים</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
