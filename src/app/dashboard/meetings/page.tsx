"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Calendar,
  LayoutList,
  SortAsc,
  Lock,
  Globe,
  Users,
  ChevronDown,
} from "lucide-react";
import { useMeetings } from "@/context/MeetingsContext";
import MeetingCard from "@/components/meetings/MeetingCard";
import MeetingCalendar from "@/components/meetings/MeetingCalendar";
import { useMeetingsFilter } from "@/hooks/useMeetingsFilter";
import type { MeetingType, MeetingVisibility } from "@/types/meeting";
import { MEETING_TYPE_CONFIG } from "@/types/meeting";

const SORT_OPTIONS = [
  { value: "date_desc", label: "חדשות ראשון" },
  { value: "date_asc", label: "ישנות ראשון" },
  { value: "creator", label: "לפי יוצר" },
] as const;

const VISIBILITY_FILTERS: { value: MeetingVisibility | "all"; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "כל הנראות", icon: null },
  { value: "public", label: "פתוחות", icon: <Globe size={11} /> },
  { value: "participants_only", label: "משתתפים", icon: <Users size={11} /> },
  { value: "restricted", label: "מוגבלות", icon: <Lock size={11} /> },
];

export default function MeetingsPage() {
  const { meetings, loading } = useMeetings();
  const [showSortMenu, setShowSortMenu] = useState(false);

  const {
    search, setSearch,
    typeFilter, setTypeFilter,
    statusFilter, setStatusFilter,
    visibilityFilter, setVisibilityFilter,
    sortBy, setSortBy,
    viewMode, setViewMode,
    filtered,
    paginated,
    hasMore,
    loadMore,
    total,
  } = useMeetingsFilter({ meetings });

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">סיכומי ישיבות</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? "טוען..." : `${total} ישיבות${total !== meetings.length ? ` מתוך ${meetings.length}` : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 transition-colors ${viewMode === "list" ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
              title="תצוגת רשימה"
            >
              <LayoutList size={16} />
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`p-2 transition-colors ${viewMode === "calendar" ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
              title="תצוגת לוח שנה"
            >
              <Calendar size={16} />
            </button>
          </div>
          <Link
            href="/dashboard/meetings/new"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-blue-700 shadow-sm"
          >
            <Plus size={18} /> ישיבה חדשה
          </Link>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="חיפוש בכותרת, תוכן, החלטות..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        {/* Sort dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSortMenu((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 bg-white"
          >
            <SortAsc size={15} />
            <span className="hidden sm:inline">
              {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
            </span>
            <ChevronDown size={13} />
          </button>
          {showSortMenu && (
            <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-20 min-w-[140px]">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }}
                  className={`w-full text-right px-4 py-2.5 text-sm hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl ${sortBy === opt.value ? "text-blue-600 font-medium" : "text-gray-700"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Type + Status + Visibility filters */}
      <div className="space-y-2 mb-5">
        {/* Meeting type */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTypeFilter("all")}
            className={`text-xs px-3 py-1.5 rounded-full transition-all ${typeFilter === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            הכל
          </button>
          {(Object.entries(MEETING_TYPE_CONFIG) as [MeetingType, typeof MEETING_TYPE_CONFIG[MeetingType]][]).map(
            ([type, cfg]) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`text-xs px-3 py-1.5 rounded-full transition-all ${typeFilter === type ? cfg.color + " font-medium" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {cfg.icon} {cfg.label}
              </button>
            ),
          )}
        </div>

        {/* Status + Visibility */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setStatusFilter("all")} className={`text-xs px-3 py-1.5 rounded-full transition-all ${statusFilter === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>כל הסטטוסים</button>
          <button onClick={() => setStatusFilter("draft")} className={`text-xs px-3 py-1.5 rounded-full transition-all ${statusFilter === "draft" ? "bg-yellow-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>טיוטות</button>
          <button onClick={() => setStatusFilter("final")} className={`text-xs px-3 py-1.5 rounded-full transition-all ${statusFilter === "final" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>סוכמו</button>
          <div className="h-5 w-px bg-gray-200 self-center" />
          {VISIBILITY_FILTERS.map((vf) => (
            <button
              key={vf.value}
              onClick={() => setVisibilityFilter(vf.value)}
              className={`text-xs px-3 py-1.5 rounded-full transition-all flex items-center gap-1 ${visibilityFilter === vf.value ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {vf.icon}{vf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : viewMode === "calendar" ? (
        <MeetingCalendar meetings={filtered} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Calendar size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {meetings.length === 0 ? "אין ישיבות עדיין" : "לא נמצאו תוצאות"}
          </p>
          {meetings.length === 0 && (
            <Link
              href="/dashboard/meetings/new"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
            >
              <Plus size={14} /> צור סיכום ישיבה ראשון
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map((m) => (
              <MeetingCard key={m.id} meeting={m} />
            ))}
          </div>
          {hasMore && (
            <div className="text-center mt-5">
              <button
                onClick={loadMore}
                className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                טען עוד ({filtered.length - paginated.length} נשארו)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
