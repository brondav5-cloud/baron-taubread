"use client";

import { useState, useMemo } from "react";
import type { Meeting, MeetingType, MeetingVisibility } from "@/types/meeting";

export type MeetingSortBy = "date_desc" | "date_asc" | "creator";
export type MeetingViewMode = "list" | "calendar";

const PAGE_SIZE = 12;

interface UseMeetingsFilterOptions {
  meetings: Meeting[];
}

export function useMeetingsFilter({ meetings }: UseMeetingsFilterOptions) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MeetingType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "final">("all");
  const [visibilityFilter, setVisibilityFilter] = useState<MeetingVisibility | "all">("all");
  const [sortBy, setSortBy] = useState<MeetingSortBy>("date_desc");
  const [viewMode, setViewMode] = useState<MeetingViewMode>("list");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    let result = meetings.filter((m) => {
      if (typeFilter !== "all" && m.meetingType !== typeFilter) return false;
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (visibilityFilter !== "all" && m.visibility !== visibilityFilter) return false;
      if (q) {
        // Full-text: title + decisions + raw content
        const rawContent = (() => {
          try {
            const first = m.agendaItems[0];
            if (!first) return "";
            const item = first as unknown as { rawContent?: string };
            return item.rawContent ?? "";
          } catch { return ""; }
        })();
        const haystack = [
          m.title,
          m.decisions ?? "",
          rawContent,
          m.createdByName,
          m.location ?? "",
        ].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "date_asc":
          return new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime();
        case "creator":
          return a.createdByName.localeCompare(b.createdByName, "he");
        case "date_desc":
        default:
          return new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime();
      }
    });

    return result;
  }, [meetings, search, typeFilter, statusFilter, visibilityFilter, sortBy]);

  // Reset page when filters change
  const resetPage = () => setPage(1);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;

  const loadMore = () => setPage((p) => p + 1);

  return {
    // State
    search, setSearch: (v: string) => { setSearch(v); resetPage(); },
    typeFilter, setTypeFilter: (v: MeetingType | "all") => { setTypeFilter(v); resetPage(); },
    statusFilter, setStatusFilter: (v: "all" | "draft" | "final") => { setStatusFilter(v); resetPage(); },
    visibilityFilter, setVisibilityFilter: (v: MeetingVisibility | "all") => { setVisibilityFilter(v); resetPage(); },
    sortBy, setSortBy: (v: MeetingSortBy) => { setSortBy(v); resetPage(); },
    viewMode, setViewMode,

    // Results
    filtered,
    paginated,
    hasMore,
    loadMore,
    total: filtered.length,
  };
}
