"use client";

import { useState, useEffect, useMemo } from "react";
import { Users, Calendar } from "lucide-react";
import { clsx } from "clsx";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";

// ============================================
// TYPES
// ============================================

interface CompetitorVisit {
  date: string;
  competitorName: string;
  notes: string;
}

interface CompetitorSummary {
  name: string;
  count: number;
  lastSeen: string;
  notes: string[];
}

interface StoreCompetitorsTabProps {
  storeId: number;
  storeName: string;
}

// ============================================
// STORAGE KEY
// ============================================

const VISITS_STORAGE_KEY = "store_competitor_visits";

// ============================================
// DEMO DATA (for testing)
// ============================================

const DEMO_VISITS: Record<number, CompetitorVisit[]> = {
  1: [
    { date: "2026-01-20", competitorName: "אנג'ל", notes: "מבצע 1+1" },
    { date: "2026-01-20", competitorName: "ברמן", notes: "מחיר נמוך" },
    { date: "2026-01-15", competitorName: "אנג'ל", notes: "" },
    { date: "2026-01-10", competitorName: "לחם הארץ", notes: "מדף גדול" },
    { date: "2026-01-05", competitorName: "אנג'ל", notes: "" },
  ],
  217: [
    {
      date: "2026-01-22",
      competitorName: "בייגל בייגל",
      notes: "פינת לחמים חדשה",
    },
    { date: "2026-01-18", competitorName: "אנג'ל", notes: "" },
  ],
  196: [
    { date: "2026-01-21", competitorName: "ברמן", notes: "מבצע שבועי" },
    { date: "2026-01-21", competitorName: "מאפיית ברדה", notes: "" },
    { date: "2026-01-14", competitorName: "ברמן", notes: "" },
  ],
};

// ============================================
// COMPONENT
// ============================================

export function StoreCompetitorsTab({
  storeId,
  storeName,
}: StoreCompetitorsTabProps) {
  const [visits, setVisits] = useState<CompetitorVisit[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load visits from storage or use demo data
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(VISITS_STORAGE_KEY);
      if (stored) {
        const allVisits = JSON.parse(stored) as Record<
          number,
          CompetitorVisit[]
        >;
        setVisits(allVisits[storeId] || []);
      } else {
        // Use demo data
        setVisits(DEMO_VISITS[storeId] || []);
      }
    } catch {
      setVisits(DEMO_VISITS[storeId] || []);
    }
    setIsLoaded(true);
  }, [storeId]);

  // Calculate competitor summary
  const competitorSummary = useMemo((): CompetitorSummary[] => {
    const summary: Record<string, CompetitorSummary> = {};

    visits.forEach((visit) => {
      if (!summary[visit.competitorName]) {
        summary[visit.competitorName] = {
          name: visit.competitorName,
          count: 0,
          lastSeen: visit.date,
          notes: [],
        };
      }

      const comp = summary[visit.competitorName];
      if (comp) {
        comp.count++;
        if (visit.date > comp.lastSeen) {
          comp.lastSeen = visit.date;
        }
        if (visit.notes) {
          comp.notes.push(visit.notes);
        }
      }
    });

    return Object.values(summary).sort((a, b) => b.count - a.count);
  }, [visits]);

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("he-IL");
  };

  // Calculate days since last seen
  const daysSince = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const diff = Math.floor(
      (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diff;
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (visits.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              אין נתוני מתחרים
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              עדיין לא תועדו מתחרים בחנות זו. כאשר תבצע ביקור ותסמן מתחרים, הם
              יופיעו כאן.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-orange-50 rounded-xl text-center">
          <p className="text-2xl font-bold text-orange-700">
            {competitorSummary.length}
          </p>
          <p className="text-sm text-orange-600">מתחרים זוהו</p>
        </div>
        <div className="p-4 bg-blue-50 rounded-xl text-center">
          <p className="text-2xl font-bold text-blue-700">{visits.length}</p>
          <p className="text-sm text-blue-600">תיעודים</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-xl text-center">
          <p className="text-2xl font-bold text-purple-700">
            {competitorSummary[0]?.name || "-"}
          </p>
          <p className="text-sm text-purple-600">מתחרה עיקרי</p>
        </div>
        <div className="p-4 bg-green-50 rounded-xl text-center">
          <p className="text-2xl font-bold text-green-700">
            {visits[0] ? daysSince(visits[0].date) : "-"}
          </p>
          <p className="text-sm text-green-600">ימים מאז תיעוד</p>
        </div>
      </div>

      {/* Competitors List */}
      <Card>
        <CardHeader>
          <CardTitle icon={<Users className="w-5 h-5 text-orange-500" />}>
            מתחרים בחנות {storeName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {competitorSummary.map((comp) => (
              <div key={comp.name} className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-orange-600">
                        {comp.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{comp.name}</p>
                      <p className="text-sm text-gray-500">
                        נצפה {comp.count} פעמים
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-gray-600">נצפה לאחרונה</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(comp.lastSeen)}
                    </p>
                    <p
                      className={clsx(
                        "text-xs",
                        daysSince(comp.lastSeen) <= 7
                          ? "text-green-600"
                          : daysSince(comp.lastSeen) <= 30
                            ? "text-amber-600"
                            : "text-red-600",
                      )}
                    >
                      לפני {daysSince(comp.lastSeen)} ימים
                    </p>
                  </div>
                </div>

                {comp.notes.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-500 mb-1">הערות אחרונות:</p>
                    <div className="flex flex-wrap gap-2">
                      {comp.notes.slice(0, 3).map((note, idx) => (
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
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Visits Timeline */}
      <Card>
        <CardHeader>
          <CardTitle icon={<Calendar className="w-5 h-5 text-blue-500" />}>
            היסטוריית תיעוד
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {visits.slice(0, 10).map((visit, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
              >
                <div className="text-center min-w-[60px]">
                  <p className="text-sm font-bold text-gray-900">
                    {formatDate(visit.date)}
                  </p>
                </div>
                <div className="w-px h-8 bg-gray-300" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {visit.competitorName}
                  </p>
                  {visit.notes && (
                    <p className="text-sm text-gray-500">{visit.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
