"use client";

import { use } from "react";
import { useMeetings } from "@/context/MeetingsContext";
import MeetingDetail from "@/components/meetings/MeetingDetail";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export default function MeetingPage({ params }: Props) {
  const { id } = use(params);
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
      <div className="p-6 text-center text-gray-500">
        <p>הישיבה לא נמצאה</p>
        <Link href="/dashboard/meetings" className="mt-3 inline-flex items-center gap-1 text-blue-600 text-sm hover:underline">
          <ArrowRight size={14} /> חזור לרשימה
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <MeetingDetail meeting={meeting} />
    </div>
  );
}
