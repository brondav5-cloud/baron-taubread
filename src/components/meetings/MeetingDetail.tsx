"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Users,
  Edit,
  Trash2,
  Download,
  CheckCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import type { Meeting, MeetingTaskRecord } from "@/types/meeting";
import { MEETING_TYPE_CONFIG, MEETING_PRIORITY_CONFIG } from "@/types/meeting";

import { useMeetings } from "@/context/MeetingsContext";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/context/TasksContext";
import { DecisionsPanel } from "./SmartMeetingEditor";
import type { ParsedDecision, ParsedTask } from "./meetingParser";

interface MeetingDetailProps {
  meeting: Meeting;
  companyLogo?: string | null;
}

export default function MeetingDetail({ meeting, companyLogo }: MeetingDetailProps) {
  const router = useRouter();
  const { removeMeeting, getMeetingTaskRecords } = useMeetings();
  const { tasks } = useTasks();
  const auth = useAuth();
  const [taskRecords, setTaskRecords] = useState<MeetingTaskRecord[]>([]);
  const [deleting, setDeleting] = useState(false);

  const isOwner =
    auth.status === "authed" && auth.user.userId === meeting.createdBy;
  const canEdit =
    auth.status === "authed" &&
    (auth.user.role === "admin" ||
      auth.user.role === "super_admin" ||
      isOwner);

  const loadTasks = useCallback(async () => {
    const records = await getMeetingTaskRecords(meeting.id);
    setTaskRecords(records);
  }, [meeting.id, getMeetingTaskRecords]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleDelete = async () => {
    if (!window.confirm("האם למחוק את הסיכום?")) return;
    setDeleting(true);
    const ok = await removeMeeting(meeting.id);
    if (ok) router.push("/dashboard/meetings");
    else setDeleting(false);
  };

  // Extract raw content from agenda_items
  const rawContent = (() => {
    try {
      const settings = (meeting as unknown as { settings?: { rawContent?: string } }).settings;
      if (settings?.rawContent) return settings.rawContent;
      // Fallback: extract text from agenda items
      const first = meeting.agendaItems[0];
      if (!first) return "";
      const content = first.content as { content?: { content?: { text?: string }[] }[] };
      return content?.content?.[0]?.content?.[0]?.text ?? "";
    } catch {
      return "";
    }
  })();

  // Re-parse for display (no users needed for display, just show extracted)
  const decisionsFromText: ParsedDecision[] = meeting.decisions
    ? meeting.decisions.split("\n").filter(Boolean).map((text, i) => ({
        id: `d_${i}`,
        text,
        lineIndex: i,
      }))
    : [];

  const cfg = MEETING_TYPE_CONFIG[meeting.meetingType];

  const dateStr = new Date(meeting.meetingDate).toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Convert meeting task records to ParsedTask for display
  const displayTasks: ParsedTask[] = taskRecords.map((t) => ({
    id: t.id,
    userId: t.assigneeUserId,
    userName: t.assigneeName,
    title: t.taskTitle,
    dueDate: t.dueDate ?? "",
    priority: t.priority,
    lineIndex: t.agendaItemIndex ?? 0,
  }));

  return (
    <div className="max-w-3xl mx-auto pb-20">
      {/* Top bar — hidden on print */}
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Link
          href="/dashboard/meetings"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowRight size={16} /> כל הישיבות
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            <Download size={15} /> הדפס / PDF
          </button>
          {canEdit && (
            <>
              <Link
                href={`/dashboard/meetings/${meeting.id}/edit`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                <Edit size={15} /> ערוך
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={15} /> מחק
              </button>
            </>
          )}
        </div>
      </div>

      {/* Meeting header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4 print:shadow-none">
        <div className="flex items-start gap-4">
          {companyLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={companyLogo}
              alt="לוגו"
              className="w-14 h-14 object-contain rounded-lg flex-shrink-0"
            />
          )}
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className={`text-sm px-3 py-1 rounded-full font-medium ${cfg.color}`}>
                {cfg.icon} {cfg.label}
              </span>
              {meeting.status === "final" ? (
                <span className="text-sm px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium flex items-center gap-1">
                  <CheckCircle size={13} /> סוכם
                </span>
              ) : (
                <span className="text-sm px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium flex items-center gap-1">
                  <Clock size={13} /> טיוטה
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{meeting.title}</h1>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Calendar size={15} /> {dateStr}
              </span>
              {meeting.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={15} /> {meeting.location}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Participants */}
        {meeting.participants.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 flex-wrap">
              <Users size={15} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-600">משתתפים:</span>
              {meeting.participants.map((p, i) => (
                <span
                  key={i}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    p.isExternal
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {p.isExternal ? "🌐 " : ""}
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Full meeting notes */}
      {rawContent && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="font-semibold text-gray-800 mb-3">📝 סיכום הישיבה</h2>
          <div
            className="text-sm text-gray-700 leading-7 whitespace-pre-wrap font-inherit"
            dir="rtl"
          >
            {rawContent.split("\n").map((line, i) => {
              const isDecision = /^(החלטה[:.\-\s]|✅|⚡)/.test(line.trim());
              const isTask = /^@\S/.test(line.trim());
              return (
                <div
                  key={i}
                  className={`py-0.5 px-2 rounded-lg my-0.5 ${
                    isDecision
                      ? "bg-emerald-50 text-emerald-900 font-medium"
                      : isTask
                      ? "bg-orange-50 text-orange-900 font-medium"
                      : ""
                  }`}
                >
                  {line || "\u00A0"}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Decisions panel */}
      {decisionsFromText.length > 0 && (
        <div className="mb-4">
          <DecisionsPanel decisions={decisionsFromText} />
        </div>
      )}

      {/* Tasks panel with live status */}
      {displayTasks.length > 0 && (
        <div className="mb-4">
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <h3 className="font-semibold text-orange-800 mb-2 flex items-center gap-2 text-sm">
              📌 משימות שהוקצו
              <span className="bg-orange-200 text-orange-800 text-xs px-1.5 py-0.5 rounded-full font-bold">
                {displayTasks.length}
              </span>
            </h3>
            <div className="space-y-2">
              {displayTasks.map((t) => {
                const liveTask = tasks.find((tk) => tk.id === taskRecords.find((r) => r.id === t.id)?.taskId);
                const isOverdue = t.dueDate && new Date(t.dueDate) < new Date();
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 bg-white rounded-xl px-3 py-2 border border-orange-100"
                  >
                    <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {t.userName.charAt(0)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                      <p className="text-xs text-gray-500">@{t.userName}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs flex-shrink-0">
                      {t.dueDate && (
                        <span className={`font-medium ${isOverdue ? "text-red-600" : "text-gray-500"}`}>
                          {isOverdue ? "⚠️ " : ""}
                          {new Date(t.dueDate).toLocaleDateString("he-IL")}
                        </span>
                      )}
                      <span>{MEETING_PRIORITY_CONFIG[t.priority].icon}</span>
                      {liveTask && (
                        <span
                          className={`px-2 py-0.5 rounded-full font-medium text-xs ${
                            liveTask.status === "approved"
                              ? "bg-green-100 text-green-700"
                              : liveTask.status === "done"
                              ? "bg-emerald-100 text-emerald-700"
                              : liveTask.status === "in_progress"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {liveTask.status === "approved"
                            ? "✔ אושר"
                            : liveTask.status === "done"
                            ? "✅ טופל"
                            : liveTask.status === "in_progress"
                            ? "🔧 בטיפול"
                            : "🆕 חדש"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Next meeting */}
      {meeting.nextMeetingDate && (
        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4 mb-4 flex items-center gap-3">
          <Calendar size={18} className="text-blue-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800">ישיבה הבאה</p>
            <p className="text-sm text-blue-600">
              {new Date(meeting.nextMeetingDate).toLocaleDateString("he-IL", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      )}

      {/* Print footer */}
      <p className="hidden print:block text-center text-xs text-gray-400 mt-8">
        סיכום ישיבה — נוצר ע&quot;י {meeting.createdByName} |{" "}
        {new Date(meeting.createdAt).toLocaleDateString("he-IL")}
      </p>
    </div>
  );
}
