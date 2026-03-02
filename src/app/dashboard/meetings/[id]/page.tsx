"use client";

import { useMeetings } from "@/context/MeetingsContext";
import MeetingDetail from "@/components/meetings/MeetingDetail";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface Props {
  params: { id: string };
}

export default function MeetingPage({ params }: Props) {
  const { id } = params;
  const { meetings, loading } = useMeetings();
  const meeting = meetings.find((m) => m.id === id);

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="p-6 text-center">
        <div className="inline-flex flex-col items-center bg-amber-50 border border-amber-200 rounded-2xl px-8 py-8 max-w-sm">
          <span className="text-4xl mb-3">🔒</span>
          <p className="font-semibold text-gray-800 mb-1">אין גישה לסיכום זה</p>
          <p className="text-sm text-gray-500 mb-4">
            הישיבה לא נמצאה או שאינך מורשה לצפות בה.
          </p>
          <Link href="/dashboard/meetings" className="inline-flex items-center gap-1 text-blue-600 text-sm hover:underline">
            <ArrowRight size={14} /> חזור לרשימה
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <MeetingDetail meeting={meeting} />
    </div>
  );
}
