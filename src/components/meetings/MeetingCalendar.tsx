"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Meeting } from "@/types/meeting";
import { MEETING_TYPE_CONFIG } from "@/types/meeting";

interface MeetingCalendarProps {
  meetings: Meeting[];
}

const DAYS_HE = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const MONTHS_HE = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  // 0=Sun, 1=Mon... Hebrew calendar starts Sunday
  return new Date(year, month, 1).getDay();
}

export default function MeetingCalendar({ meetings }: MeetingCalendarProps) {
  const router = useRouter();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  // Group meetings by day
  const meetingsByDay = new Map<number, Meeting[]>();
  for (const m of meetings) {
    const d = new Date(m.meetingDate);
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
      const day = d.getDate();
      if (!meetingsByDay.has(day)) meetingsByDay.set(day, []);
      meetingsByDay.get(day)!.push(m);
    }
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  // Build calendar grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <button
          onClick={prevMonth}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight size={18} className="text-gray-500" />
        </button>
        <h2 className="font-bold text-gray-900">
          {MONTHS_HE[viewMonth]} {viewYear}
        </h2>
        <button
          onClick={nextMonth}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft size={18} className="text-gray-500" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAYS_HE.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="divide-y divide-gray-50">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 divide-x divide-gray-50">
            {week.map((day, di) => {
              const isToday =
                day === today.getDate() &&
                viewMonth === today.getMonth() &&
                viewYear === today.getFullYear();
              const dayMeetings = day ? (meetingsByDay.get(day) ?? []) : [];

              return (
                <div
                  key={di}
                  className={`min-h-[72px] p-1.5 ${day ? "bg-white" : "bg-gray-50/50"}`}
                >
                  {day && (
                    <>
                      <span
                        className={`text-xs font-medium mb-1 flex items-center justify-center w-6 h-6 rounded-full ${
                          isToday
                            ? "bg-blue-600 text-white"
                            : "text-gray-600"
                        }`}
                      >
                        {day}
                      </span>
                      <div className="space-y-0.5">
                        {dayMeetings.slice(0, 3).map((m) => {
                          const cfg = MEETING_TYPE_CONFIG[m.meetingType];
                          return (
                            <button
                              key={m.id}
                              onClick={() => router.push(`/dashboard/meetings/${m.id}`)}
                              className={`w-full text-right text-[10px] px-1.5 py-0.5 rounded truncate leading-4 hover:opacity-80 transition-opacity ${cfg.color}`}
                              title={m.title}
                            >
                              {cfg.icon} {m.title}
                            </button>
                          );
                        })}
                        {dayMeetings.length > 3 && (
                          <p className="text-[10px] text-gray-400 px-1">
                            +{dayMeetings.length - 3} עוד
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap gap-3">
        {Object.entries(MEETING_TYPE_CONFIG).map(([type, cfg]) => {
          const count = meetings.filter(
            (m) => m.meetingType === type &&
              new Date(m.meetingDate).getFullYear() === viewYear &&
              new Date(m.meetingDate).getMonth() === viewMonth,
          ).length;
          if (count === 0) return null;
          return (
            <span key={type} className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
              {cfg.icon} {cfg.label}: {count}
            </span>
          );
        })}
      </div>
    </div>
  );
}
