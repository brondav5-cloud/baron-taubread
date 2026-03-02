"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { generateHTML } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import {
  Calendar,
  MapPin,
  Users,
  Edit,
  Trash2,
  Printer,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";
import type { Meeting, MeetingTaskRecord } from "@/types/meeting";
import { MEETING_TYPE_CONFIG, MEETING_PRIORITY_CONFIG } from "@/types/meeting";
import { useMeetings } from "@/context/MeetingsContext";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/context/TasksContext";

interface MeetingDetailProps {
  meeting: Meeting;
  companyLogo?: string | null;
}

function renderContent(content: Record<string, unknown>): string {
  if (!content || !Object.keys(content).length) return "";
  try {
    return generateHTML(content as Parameters<typeof generateHTML>[0], [
      StarterKit,
      Mention.configure({ HTMLAttributes: { class: "mention-chip" } }),
    ]);
  } catch {
    return "";
  }
}

export default function MeetingDetail({ meeting, companyLogo }: MeetingDetailProps) {
  const router = useRouter();
  const { removeMeeting, getMeetingTaskRecords } = useMeetings();
  const { tasks } = useTasks();
  const auth = useAuth();
  const [taskRecords, setTaskRecords] = useState<MeetingTaskRecord[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(
    new Set(meeting.agendaItems.map((_, i) => i)),
  );
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

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleDelete = async () => {
    if (!window.confirm("האם למחוק את הסיכום?")) return;
    setDeleting(true);
    const ok = await removeMeeting(meeting.id);
    if (ok) router.push("/dashboard/meetings");
    else setDeleting(false);
  };

  const handlePrint = () => window.print();

  const cfg = MEETING_TYPE_CONFIG[meeting.meetingType];

  const dateStr = new Date(meeting.meetingDate).toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="max-w-3xl mx-auto pb-20">
      {/* Top bar - hidden on print */}
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Link
          href="/dashboard/meetings"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowRight size={16} /> כל הישיבות
        </Link>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            <Printer size={15} /> הדפס / PDF
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4 print:shadow-none print:border-0 print:rounded-none">
        <div className="flex items-start gap-4">
          {companyLogo && (
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
                  {p.isExternal ? "🌐 " : ""}{p.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Agenda items */}
      {meeting.agendaItems.length > 0 && (
        <div className="mb-4 space-y-3">
          <h2 className="font-semibold text-gray-800">📋 סדר יום</h2>
          {meeting.agendaItems.map((item, idx) => {
            if (!item.title && !Object.keys(item.content || {}).length) return null;
            const isOpen = expandedItems.has(idx);
            const itemTasks = taskRecords.filter((t) => t.agendaItemIndex === idx);
            const html = renderContent(item.content);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedItems((s) => {
                      const n = new Set(s);
                      isOpen ? n.delete(idx) : n.add(idx);
                      return n;
                    })
                  }
                  className="w-full flex items-center gap-3 p-4 text-right hover:bg-gray-50 transition-colors print:pointer-events-none"
                >
                  <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="flex-1 font-semibold text-gray-800">{item.title}</span>
                  {itemTasks.length > 0 && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                      {itemTasks.length} משימות
                    </span>
                  )}
                  <span className="text-gray-400 print:hidden">
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>

                {(isOpen || true) && html && (
                  <div
                    className="px-5 pb-4 prose prose-sm max-w-none text-gray-700 meeting-content"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                )}

                {isOpen && itemTasks.length > 0 && (
                  <div className="px-5 pb-4 space-y-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">משימות</p>
                    {itemTasks.map((t) => {
                      const liveTask = tasks.find((tk) => tk.id === t.taskId);
                      const isOverdue = t.dueDate && new Date(t.dueDate) < new Date();
                      return (
                        <div
                          key={t.id}
                          className="flex items-center gap-3 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2"
                        >
                          <span className="w-7 h-7 rounded-full bg-orange-200 text-orange-800 text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {t.assigneeName.charAt(0)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">{t.taskTitle}</p>
                            <p className="text-xs text-gray-500">@{t.assigneeName}</p>
                          </div>
                          <div className="flex items-center gap-2 text-xs flex-shrink-0">
                            {t.dueDate && (
                              <span
                                className={`font-medium ${
                                  isOverdue ? "text-red-600" : "text-gray-500"
                                }`}
                              >
                                {isOverdue ? "⚠️ " : ""}
                                {new Date(t.dueDate).toLocaleDateString("he-IL")}
                              </span>
                            )}
                            <span>{MEETING_PRIORITY_CONFIG[t.priority].icon}</span>
                            {liveTask && (
                              <span
                                className={`px-2 py-0.5 rounded-full font-medium ${
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
                                  ? "אושר"
                                  : liveTask.status === "done"
                                  ? "טופל"
                                  : liveTask.status === "in_progress"
                                  ? "בטיפול"
                                  : "חדש"}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Decisions */}
      {meeting.decisions && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="font-semibold text-gray-800 mb-2">✅ החלטות</h2>
          <p className="text-sm text-gray-700 whitespace-pre-line">{meeting.decisions}</p>
        </div>
      )}

      {/* All meeting tasks summary */}
      {taskRecords.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="font-semibold text-gray-800 mb-3">
            📌 כל המשימות שהוקצו ({taskRecords.length})
          </h2>
          <div className="space-y-2">
            {taskRecords.map((t) => {
              const liveTask = tasks.find((tk) => tk.id === t.taskId);
              const isOverdue = t.dueDate && new Date(t.dueDate) < new Date();
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl text-sm"
                >
                  <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {t.assigneeName.charAt(0)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm">{t.taskTitle}</p>
                    <p className="text-xs text-gray-400">@{t.assigneeName}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs flex-shrink-0">
                    {t.dueDate && (
                      <span
                        className={`font-medium ${
                          isOverdue ? "text-red-600" : "text-gray-500"
                        }`}
                      >
                        {isOverdue ? "⚠️ " : ""}
                        {new Date(t.dueDate).toLocaleDateString("he-IL")}
                      </span>
                    )}
                    <span>{MEETING_PRIORITY_CONFIG[t.priority].icon}</span>
                    {liveTask && (
                      <span
                        className={`px-2 py-0.5 rounded-full font-medium ${
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
                          ? "אושר"
                          : liveTask.status === "done"
                          ? "טופל"
                          : liveTask.status === "in_progress"
                          ? "בטיפול"
                          : "חדש"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
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

      {/* Footer */}
      <p className="text-center text-xs text-gray-400 print:block hidden">
        סיכום ישיבה — נוצר ע&quot;י {meeting.createdByName} |{" "}
        {new Date(meeting.createdAt).toLocaleDateString("he-IL")}
      </p>
    </div>
  );
}
