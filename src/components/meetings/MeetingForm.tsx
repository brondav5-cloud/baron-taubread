"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Calendar, MapPin, Users } from "lucide-react";
import type { MeetingType, MeetingTaskMention } from "@/types/meeting";
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

interface MeetingFormProps {
  initialData?: {
    title?: string;
    meetingType?: MeetingType;
    meetingDate?: string;
    location?: string;
    participants?: { userId?: string; name: string; isExternal?: boolean }[];
    rawContent?: string;
    nextMeetingDate?: string;
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
  const { createMeeting, saveMeeting } = useMeetings();
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
  const [participants, setParticipants] = useState(
    initialData?.participants ?? [],
  );
  const [rawContent, setRawContent] = useState(initialData?.rawContent ?? "");
  const [nextMeetingDate, setNextMeetingDate] = useState(
    initialData?.nextMeetingDate?.slice(0, 10) ?? "",
  );

  // Live parsed state
  const [parsedDecisions, setParsedDecisions] = useState<ParsedDecision[]>([]);
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);

  // Allow editing task details inline (due date / priority override)
  const [taskOverrides, setTaskOverrides] = useState<
    Record<string, { dueDate?: string; priority?: MeetingTaskMention["priority"] }>
  >({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const currentUser =
    auth.status === "authed"
      ? { id: auth.user.userId ?? "", name: auth.user.userName ?? "" }
      : { id: "", name: "" };

  // ── Participants ─────────────────────────────────────────

  const toggleParticipant = (userId: string, name: string) => {
    setParticipants((prev) => {
      const exists = prev.some((p) => p.userId === userId);
      return exists
        ? prev.filter((p) => p.userId !== userId)
        : [...prev, { userId, name }];
    });
  };

  const addExternalParticipant = () => {
    const name = window.prompt("שם המשתתף החיצוני:");
    if (name?.trim()) {
      setParticipants((prev) => [
        ...prev,
        { name: name.trim(), isExternal: true },
      ]);
    }
  };

  const removeParticipant = (idx: number) => {
    setParticipants((prev) => prev.filter((_, i) => i !== idx));
  };

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

  // Merge parsed tasks with overrides
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

    setSaving(true);
    setError("");

    const pendingTasks: MeetingTaskMention[] = finalTasks.map((t) =>
      parsedTaskToMention(t),
    );

    const payload = {
      title: title.trim(),
      meeting_type: meetingType,
      meeting_date: new Date(meetingDate).toISOString(),
      location: location || null,
      participants,
      // Store rawContent inside agenda_items JSONB (no extra column needed)
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
      router.push(`/dashboard/meetings/${newId}`);
    } else if (meetingId) {
      const ok = await saveMeeting(meetingId, payload, pendingTasks);
      if (!ok) {
        setError("שגיאה בשמירה");
        setSaving(false);
        return;
      }
      router.push(`/dashboard/meetings/${meetingId}`);
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

      {/* Participants */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-3 text-sm">
          <Users size={16} className="text-gray-400" /> משתתפים
        </h2>
        <div className="flex flex-wrap gap-2">
          {userOptions.map((u) => {
            const selected = participants.some((p) => p.userId === u.id);
            return (
              <button
                key={u.id}
                onClick={() => toggleParticipant(u.id, u.name)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                  selected
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                  {u.name.charAt(0)}
                </span>
                {u.name}
              </button>
            );
          })}
          <button
            onClick={addExternalParticipant}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600"
          >
            <Plus size={14} /> חיצוני
          </button>
        </div>

        {/* External participants */}
        {participants.filter((p) => p.isExternal).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {participants
              .filter((p) => p.isExternal)
              .map((p, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full"
                >
                  🌐 {p.name}
                  <button
                    onClick={() =>
                      removeParticipant(
                        participants.findIndex(
                          (pp) => pp.isExternal && pp.name === p.name,
                        ),
                      )
                    }
                    className="text-yellow-400 hover:text-yellow-700"
                  >
                    <Trash2 size={10} />
                  </button>
                </span>
              ))}
          </div>
        )}
      </div>

      {/* ── Smart editor ─────────────────────────────────── */}
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

      {/* ── Live panels ──────────────────────────────────── */}
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

      {/* Error */}
      {error && (
        <p className="text-red-600 text-sm text-center">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50"
        >
          ביטול
        </button>
        <button
          onClick={() => handleSubmit("draft")}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
        >
          שמור טיוטה
        </button>
        <button
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
