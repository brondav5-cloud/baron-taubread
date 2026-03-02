"use client";

import Link from "next/link";
import { Calendar, MapPin, Users, CheckCircle, FileText } from "lucide-react";
import type { Meeting } from "@/types/meeting";
import { MEETING_TYPE_CONFIG } from "@/types/meeting";

interface MeetingCardProps {
  meeting: Meeting;
}

export default function MeetingCard({ meeting }: MeetingCardProps) {
  const cfg = MEETING_TYPE_CONFIG[meeting.meetingType];
  const dateStr = new Date(meeting.meetingDate).toLocaleDateString("he-IL", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isDraft = meeting.status === "draft";

  return (
    <Link href={`/dashboard/meetings/${meeting.id}`}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                {cfg.icon} {cfg.label}
              </span>
              {isDraft && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                  טיוטה
                </span>
              )}
              {!isDraft && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium flex items-center gap-1">
                  <CheckCircle size={10} /> סוכם
                </span>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 truncate">{meeting.title}</h3>
            <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar size={12} /> {dateStr}
              </span>
              {meeting.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {meeting.location}
                </span>
              )}
              {meeting.participants.length > 0 && (
                <span className="flex items-center gap-1">
                  <Users size={12} /> {meeting.participants.length} משתתפים
                </span>
              )}
              {meeting.agendaItems.length > 0 && (
                <span className="flex items-center gap-1">
                  <FileText size={12} /> {meeting.agendaItems.filter(i => i.title).length} סעיפים
                </span>
              )}
            </div>
          </div>
          <div className="text-xs text-gray-400 flex-shrink-0 text-left">
            {meeting.createdByName}
          </div>
        </div>
      </div>
    </Link>
  );
}
