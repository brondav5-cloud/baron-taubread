"use client";

import { use } from "react";
import { useMeetings } from "@/context/MeetingsContext";
import MeetingForm from "@/components/meetings/MeetingForm";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditMeetingPage({ params }: Props) {
  const { id } = use(params);
  const { meetings, loading } = useMeetings();
  const meeting = meetings.find((m) => m.id === id);

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
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
      <div className="flex items-center gap-2 mb-5">
        <Link href={`/dashboard/meetings/${id}`} className="text-gray-400 hover:text-gray-600">
          <ArrowRight size={18} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">עריכת ישיבה</h1>
      </div>
      <MeetingForm
        mode="edit"
        meetingId={id}
        initialData={{
          title: meeting.title,
          meetingType: meeting.meetingType,
          meetingDate: meeting.meetingDate,
          location: meeting.location,
          participants: meeting.participants,
          rawContent: (() => {
            try {
              const first = meeting.agendaItems[0];
              if (!first) return "";
              const item = first as unknown as { rawContent?: string };
              if (item.rawContent) return item.rawContent;
              const c = first.content as { content?: { content?: { text?: string }[] }[] };
              return c?.content?.[0]?.content?.[0]?.text ?? "";
            } catch { return ""; }
          })(),
          nextMeetingDate: meeting.nextMeetingDate,
        }}
      />
    </div>
  );
}
