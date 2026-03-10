"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import type { MeetingType, MeetingTaskMention, MeetingVisibility } from "@/types/meeting";
import { MEETING_TYPE_CONFIG } from "@/types/meeting";
import { useMeetings } from "@/context/MeetingsContext";
import { useAuth } from "@/hooks/useAuth";
import { useUsers } from "@/context/UsersContext";
import SmartMeetingEditor, {
  DecisionsPanel,
  TasksPanel,
  parsedTaskToMention,
} from "./SmartMeetingEditor";
import type { ParsedDecision, ParsedTask } from "./meetingParser";
import MeetingParticipants, { type Participant } from "./MeetingParticipants";
import MeetingVisibilityPicker from "./MeetingVisibilityPicker";

interface MeetingFormProps {
  initialData?: {
    title?: string;
    meetingType?: MeetingType;
    meetingDate?: string;
    location?: string;
    participants?: Participant[];
    rawContent?: string;
    nextMeetingDate?: string;
    visibility?: MeetingVisibility;
    allowedViewers?: string[];
    prevMeetingId?: string;
  };
  meetingId?: string;
  mode: "create" | "edit";
  companyLogo?: string | null;
}

export default function MeetingForm({
  initialData,
  meetingId,
  mode,
  companyLogo,
}: MeetingFormProps) {
  const router = useRouter();
  const { createMeeting, saveMeeting, meetings } = useMeetings();
  const auth = useAuth();
  const { allUsers } = useUsers();

  const userOptions = allUsers.map((u) => ({ id: u.id, name: u.name }));

  const now = new Date();
  const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // ── State ────────────────────────────────────────────────
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [meetingType, setMeetingType] = useState<MeetingType>(
    initialData?.meetingType ?? "team",
  );
  const [meetingDate, setMeetingDate] = useState(
    initialData?.meetingDate?.slice(0, 16) ?? defaultDate,
  );
  const [location, setLocation] = useState(initialData?.location ?? "");
  const [participants, setParticipants] = useState<Participant[]>(
    initialData?.participants ?? [],
  );
  const [rawContent, setRawContent] = useState(initialData?.rawContent ?? "");
  const [nextMeetingDate, setNextMeetingDate] = useState(
    initialData?.nextMeetingDate?.slice(0, 10) ?? "",
  );
  const [visibility, setVisibility] = useState<MeetingVisibility>(
    initialData?.visibility ?? "public",
  );
  const [allowedViewers, setAllowedViewers] = useState<string[]>(
    initialData?.allowedViewers ?? [],
  );
  const [prevMeetingId, setPrevMeetingId] = useState<string>(
    initialData?.prevMeetingId ?? "",
  );

  // Live parsed state
  const [parsedDecisions, setParsedDecisions] = useState<ParsedDecision[]>([]);
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);

  const [taskOverrides, setTaskOverrides] = useState<
    Record<string, { dueDate?: string; priority?: MeetingTaskMention["priority"] }>
  >({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const currentUser =
    auth.status === "authed"
      ? { id: auth.user.userId ?? "", name: auth.user.userName ?? "" }
      : { id: "", name: "" };

  // ── Task overrides ───────────────────────────────────────

  const handleDueDateChange = useCallback((taskId: string, date: string) => {
    setTaskOverrides((prev) => ({
      ...prev,
      [taskId]: { ...prev[taskId], dueDate: date },
    }));
  }, []);

  const handlePriorityChange = useCallback(
    (taskId: string, priority: MeetingTaskMention["priority"]) => {
      setTaskOverrides((prev) => ({
        ...prev,
        [taskId]: { ...prev[taskId], priority },
      }));
    },
    [],
  );

  const finalTasks: ParsedTask[] = parsedTasks.map((t) => ({
    ...t,
    dueDate: taskOverrides[t.id]?.dueDate ?? t.dueDate,
    priority: taskOverrides[t.id]?.priority ?? t.priority,
  }));

  // ── Submit ────────────────────────────────────────────────

  const handleSubmit = async (status: "draft" | "final") => {
    if (!title.trim()) {
      setError("נא להזין כותרת לישיבה");
      return;
    }
    if (visibility === "restricted" && allowedViewers.length === 0) {
      setError("פגישה מוגבלת — נא לבחור לפחות אדם אחד שיוכל לראות");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const pendingTasks: MeetingTaskMention[] = finalTasks.map((t) =>
        parsedTaskToMention(t),
      );

      const payload = {
        title: title.trim(),
        meeting_type: meetingType,
        meeting_date: new Date(meetingDate).toISOString(),
        location: location || null,
        participants,
        agenda_items: [
          {
            id: "main",
            title: "סיכום",
            rawContent,
            content: {},
          },
        ],
        decisions: parsedDecisions.map((d) => d.text).join("\n"),
        next_meeting_date: nextMeetingDate
          ? new Date(nextMeetingDate).toISOString()
          : null,
        status,
        visibility,
        allowed_viewers: allowedViewers,
        prev_meeting_id: prevMeetingId || null,
      };

      if (mode === "create") {
        const { meetingId: newId, error: err } = await createMeeting(
          payload,
          pendingTasks,
          currentUser.id,
          currentUser.name,
        );
        if (err || !newId) {
          setError(err ?? "שגיאה בשמירה");
          setSaving(false);
          return;
        }
        // Navigate — setSaving stays true until page unmounts (intentional)
        router.push(`/dashboard/meetings/${newId}`);
      } else if (meetingId) {
        const ok = await saveMeeting(meetingId, payload, pendingTasks);
        if (!ok) {
          setError("שגיאה בשמירה");
          setSaving(false);
          return;
        }
        router.push(`/dashboard/meetings/${meetingId}`);
      } else {
        setSaving(false);
      }
    } catch (e) {
      console.error("handleSubmit error:", e);
      setError("שגיאה בשמירה — נסה שוב");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-20 space-y-4">
      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-start gap-4">
          {companyLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={companyLogo}
              alt="לוגו"
              className="w-12 h-12 object-contain rounded-lg flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <input
              type="text"
              placeholder="כותרת הישיבה..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xl font-bold text-gray-900 border-0 border-b-2 border-gray-200 pb-1 focus:outline-none focus:border-blue-500 bg-transparent"
            />
          </div>
        </div>

        {/* Meeting type */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            Object.entries(MEETING_TYPE_CONFIG) as [
              MeetingType,
              (typeof MEETING_TYPE_CONFIG)[MeetingType],
            ][]
          ).map(([type, cfg]) => (
            <button
              key={type}
              type="button"
              onClick={() => setMeetingType(type)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                meetingType === type
                  ? cfg.color + " ring-2 ring-offset-1 ring-current"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cfg.icon} {cfg.label}
            </button>
          ))}
        </div>

        {/* Date + Location */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type="datetime-local"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="מיקום / פלטפורמה"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </label>
        </div>
      </div>

      {/* Participants (extracted component) */}
      <MeetingParticipants
        participants={participants}
        userOptions={userOptions}
        onChange={setParticipants}
      />

      {/* Visibility picker (new) */}
      <MeetingVisibilityPicker
        visibility={visibility}
        allowedViewers={allowedViewers}
        userOptions={userOptions}
        onVisibilityChange={setVisibility}
        onAllowedViewersChange={setAllowedViewers}
      />

      {/* Continuation of previous meeting */}
      {meetings.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <ArrowRight size={15} className="text-gray-400" />
            המשך ישיבה קודמת (אופציונלי)
          </label>
          <select
            value={prevMeetingId}
            onChange={(e) => setPrevMeetingId(e.target.value)}
            className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          >
            <option value="">— ללא קישור —</option>
            {meetings
              .filter((m) => m.id !== meetingId)
              .slice(0, 20)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {new Date(m.meetingDate).toLocaleDateString("he-IL")} — {m.title}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Smart editor */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-3">📝 סיכום הישיבה</h2>
        <SmartMeetingEditor
          value={rawContent}
          onChange={setRawContent}
          users={userOptions}
          onDecisionsChange={setParsedDecisions}
          onTasksChange={setParsedTasks}
        />
      </div>

      {/* Live panels */}
      {parsedDecisions.length > 0 && (
        <DecisionsPanel decisions={parsedDecisions} />
      )}

      {finalTasks.length > 0 && (
        <TasksPanel
          tasks={finalTasks}
          onDueDateChange={handleDueDateChange}
          onPriorityChange={handlePriorityChange}
        />
      )}

      {/* Next meeting */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Calendar size={16} className="text-gray-400" />
          ישיבה הבאה (אופציונלי)
          <input
            type="date"
            value={nextMeetingDate}
            onChange={(e) => setNextMeetingDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </label>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-300 rounded-2xl px-4 py-3">
          <span className="text-red-500 text-lg flex-shrink-0">⚠️</span>
          <div className="flex-1">
            <p className="text-red-700 text-sm font-medium">{error}</p>
            <p className="text-red-500 text-xs mt-0.5">נסה שוב, או צור קשר עם התמיכה אם הבעיה חוזרת</p>
          </div>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-red-400 hover:text-red-600 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
        >
          ביטול
        </button>
        <button
          type="button"
          onClick={() => handleSubmit("draft")}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
        >
          {saving ? "שומר..." : "שמור טיוטה"}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit("final")}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shadow-sm"
        >
          {saving ? "שומר..." : "סיים וסגור ישיבה"}
        </button>
      </div>
    </div>
  );
}
