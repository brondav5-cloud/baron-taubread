"use client";

import { useState, useMemo } from "react";
import { getAgents } from "@/lib/dataLoader";

// ============================================
// TYPES
// ============================================

export interface Visit {
  id: string;
  storeId: string;
  storeName: string;
  storeCity: string;
  agentName: string;
  date: string;
  notes: string;
  status: "completed" | "draft";
  hasPhotos: boolean;
  photosCount: number;
}

// ============================================
// DEMO DATA
// ============================================

export const DEMO_VISITS: Visit[] = [
  {
    id: "1",
    storeId: "217",
    storeName: "טבע גדרה בעמ",
    storeCity: "גדרה",
    agentName: "נחמן",
    date: "2026-01-22",
    notes: "ביקור שגרתי. מדפים מלאים, הכל תקין. הלקוח מרוצה מהשירות.",
    status: "completed",
    hasPhotos: true,
    photosCount: 2,
  },
  {
    id: "2",
    storeId: "196",
    storeName: "פניני טבע מודיעין",
    storeCity: "מודיעין",
    agentName: "נחמן",
    date: "2026-01-21",
    notes: "בדיקת מלאי והזמנה חדשה. ביקשו להגדיל את הכמות של פיתות כוסמין.",
    status: "completed",
    hasPhotos: true,
    photosCount: 3,
  },
  {
    id: "3",
    storeId: "184",
    storeName: "מאפיית הנשיא",
    storeCity: "ירושלים",
    agentName: "נחמן",
    date: "2026-01-20",
    notes: "תלונה על איחור באספקה - טופל. הובטח שיפור.",
    status: "completed",
    hasPhotos: false,
    photosCount: 0,
  },
  {
    id: "4",
    storeId: "177",
    storeName: "מעדני רוגלית",
    storeCity: "תל אביב",
    agentName: "ניקול",
    date: "2026-01-19",
    notes: "פגישה עם מנהל החנות. דנו בהרחבת מגוון המוצרים.",
    status: "completed",
    hasPhotos: true,
    photosCount: 1,
  },
  {
    id: "5",
    storeId: "154",
    storeName: "שורשים יבנה",
    storeCity: "יבנה",
    agentName: "ניקול",
    date: "2026-01-18",
    notes: "ביקור שגרתי. החנות במצב טוב.",
    status: "completed",
    hasPhotos: false,
    photosCount: 0,
  },
  {
    id: "6",
    storeId: "1",
    storeName: "טבע רמות",
    storeCity: "ירושלים",
    agentName: "נחמן",
    date: "2026-01-17",
    notes: "עדכון מחירון והסכמה על תנאי תשלום חדשים.",
    status: "completed",
    hasPhotos: true,
    photosCount: 2,
  },
];

// ============================================
// HOOK
// ============================================

export function useVisitsPage() {
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ agent: "", status: "" });

  // Load agents list
  const agents = useMemo(() => getAgents(), []);

  // Filter visits
  const filteredVisits = useMemo(() => {
    return DEMO_VISITS.filter((visit) => {
      if (search) {
        const searchLower = search.toLowerCase();
        if (
          !visit.storeName.toLowerCase().includes(searchLower) &&
          !visit.storeCity.toLowerCase().includes(searchLower) &&
          !visit.notes.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      if (filters.agent && visit.agentName !== filters.agent) return false;
      if (filters.status && visit.status !== filters.status) return false;
      return true;
    });
  }, [search, filters]);

  // Stats
  const stats = useMemo(
    () => ({
      total: DEMO_VISITS.length,
      completed: DEMO_VISITS.filter((v) => v.status === "completed").length,
      withPhotos: DEMO_VISITS.filter((v) => v.hasPhotos).length,
      totalPhotos: DEMO_VISITS.reduce((sum, v) => sum + v.photosCount, 0),
    }),
    [],
  );

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  const clearFilters = () => {
    setFilters({ agent: "", status: "" });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("he-IL");
  };

  return {
    // State
    search,
    setSearch,
    showFilters,
    setShowFilters,
    filters,
    setFilters,

    // Data
    agents,
    filteredVisits,
    stats,
    activeFiltersCount,

    // Actions
    clearFilters,
    formatDate,
  };
}
