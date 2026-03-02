"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Calendar } from "lucide-react";
import { useMeetings } from "@/context/MeetingsContext";
import MeetingCard from "@/components/meetings/MeetingCard";
import type { MeetingType } from "@/types/meeting";
import { MEETING_TYPE_CONFIG } from "@/types/meeting";

export default function MeetingsPage() {
  const { meetings, loading } = useMeetings();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MeetingType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "final">("all");

  const filtered = meetings.filter((m) => {
    if (typeFilter !== "all" && m.meetingType !== typeFilter) return false;
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (search && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">סיכומי ישיבות</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {meetings.length} ישיבות
          </p>
        </div>
        <Link
          href="/dashboard/meetings/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-blue-700 shadow-sm"
        >
          <Plus size={18} /> ישיבה חדשה
        </Link>
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-5">
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="חיפוש לפי כותרת..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTypeFilter("all")}
            className={`text-xs px-3 py-1.5 rounded-full transition-all ${
              typeFilter === "all"
                ? "bg-gray-800 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            הכל
          </button>
          {(Object.entries(MEETING_TYPE_CONFIG) as [MeetingType, typeof MEETING_TYPE_CONFIG[MeetingType]][]).map(
            ([type, cfg]) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                  typeFilter === type
                    ? cfg.color + " font-medium"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cfg.icon} {cfg.label}
              </button>
            ),
          )}
          <div className="h-5 w-px bg-gray-200 self-center" />
          <button
            onClick={() => setStatusFilter("all")}
            className={`text-xs px-3 py-1.5 rounded-full transition-all ${
              statusFilter === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            כל הסטטוסים
          </button>
          <button
            onClick={() => setStatusFilter("draft")}
            className={`text-xs px-3 py-1.5 rounded-full transition-all ${
              statusFilter === "draft" ? "bg-yellow-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            טיוטות
          </button>
          <button
            onClick={() => setStatusFilter("final")}
            className={`text-xs px-3 py-1.5 rounded-full transition-all ${
              statusFilter === "final" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            סוכמו
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
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
        <div className="space-y-3">
          {filtered.map((m) => (
            <MeetingCard key={m.id} meeting={m} />
          ))}
        </div>
      )}
    </div>
  );
}
