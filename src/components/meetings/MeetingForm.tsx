"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Plus, Trash2, ChevronDown, ChevronUp, Calendar, MapPin, Users } from "lucide-react";
import type {
  MeetingFormInput,
  MeetingType,
  MeetingTaskMention,
  AgendaItem,
  MeetingParticipant,
} from "@/types/meeting";
import { MEETING_TYPE_CONFIG, MEETING_PRIORITY_CONFIG } from "@/types/meeting";
import { useMeetings } from "@/context/MeetingsContext";
import { useAuth } from "@/hooks/useAuth";
import { useUsers } from "@/context/UsersContext";

const MeetingEditor = dynamic(() => import("./MeetingEditor"), { ssr: false });

interface MeetingFormProps {
  initialData?: Partial<MeetingFormInput>;
  meetingId?: string;
  mode: "create" | "edit";
  companyLogo?: string | null;
}

const newAgendaItem = (index: number): AgendaItem => ({
  id: `agenda_${Date.now()}_${index}`,
  title: "",
  content: {},
});

export default function MeetingForm({
  initialData,
  meetingId,
  mode,
  companyLogo,
}: MeetingFormProps) {
  const router = useRouter();
  const { createMeeting, saveMeeting } = useMeetings();
  const auth = useAuth();
  const { users } = useUsers();

  const userOptions = users
    .filter((u) => u.isActive)
    .map((u) => ({ id: u.id, name: u.name }));

  const now = new Date();
  const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const [form, setForm] = useState<MeetingFormInput>({
    title: initialData?.title ?? "",
    meetingType: initialData?.meetingType ?? "team",
    meetingDate: initialData?.meetingDate?.slice(0, 16) ?? defaultDate,
    location: initialData?.location ?? "",
    participants: initialData?.participants ?? [],
    agendaItems: initialData?.agendaItems?.length
      ? initialData.agendaItems
      : [newAgendaItem(0)],
    decisions: initialData?.decisions ?? "",
    nextMeetingDate: initialData?.nextMeetingDate?.slice(0, 10) ?? "",
    pendingTasks: initialData?.pendingTasks ?? [],
  });

  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    new Set(form.agendaItems.map((i) => i.id)),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const currentUser =
    auth.status === "authed"
      ? { id: auth.user.userId, name: auth.user.userName }
      : { id: "", name: "" };

  // ── Participants ──────────────────────────────────────────

  const toggleParticipant = (userId: string, name: string) => {
    setForm((f) => {
      const exists = f.participants.some((p) => p.userId === userId);
      return {
        ...f,
        participants: exists
          ? f.participants.filter((p) => p.userId !== userId)
          : [...f.participants, { userId, name }],
      };
    });
  };

  const addExternalParticipant = () => {
    const name = window.prompt("שם המשתתף החיצוני:");
    if (!name?.trim()) return;
    setForm((f) => ({
      ...f,
      participants: [
        ...f.participants,
        { name: name.trim(), isExternal: true },
      ],
    }));
  };

  // ── Agenda items ──────────────────────────────────────────

  const addAgendaItem = () => {
    const item = newAgendaItem(form.agendaItems.length);
    setForm((f) => ({ ...f, agendaItems: [...f.agendaItems, item] }));
    setExpandedItems((s) => new Set([...s, item.id]));
  };

  const removeAgendaItem = (id: string) => {
    setForm((f) => ({
      ...f,
      agendaItems: f.agendaItems.filter((i) => i.id !== id),
    }));
  };

  const updateAgendaTitle = (id: string, title: string) => {
    setForm((f) => ({
      ...f,
      agendaItems: f.agendaItems.map((i) =>
        i.id === id ? { ...i, title } : i,
      ),
    }));
  };

  const updateAgendaContent = (id: string, content: Record<string, unknown>) => {
    setForm((f) => ({
      ...f,
      agendaItems: f.agendaItems.map((i) =>
        i.id === id ? { ...i, content } : i,
      ),
    }));
  };

  const handleTaskCreated = useCallback((task: MeetingTaskMention) => {
    setForm((f) => ({ ...f, pendingTasks: [...f.pendingTasks, task] }));
  }, []);

  const removePendingTask = (taskId: string) => {
    setForm((f) => ({
      ...f,
      pendingTasks: f.pendingTasks.filter((t) => t.id !== taskId),
    }));
  };

  // ── Submit ────────────────────────────────────────────────

  const handleSubmit = async (finalStatus: "draft" | "final") => {
    if (!form.title.trim()) { setError("נא להזין כותרת לישיבה"); return; }
    if (!form.meetingDate) { setError("נא לבחור תאריך"); return; }

    setSaving(true);
    setError("");

    const payload = {
      title: form.title.trim(),
      meeting_type: form.meetingType,
      meeting_date: new Date(form.meetingDate).toISOString(),
      location: form.location || null,
      participants: form.participants,
      agenda_items: form.agendaItems,
      decisions: form.decisions || null,
      next_meeting_date: form.nextMeetingDate
        ? new Date(form.nextMeetingDate).toISOString()
        : null,
      status: finalStatus,
    };

    if (mode === "create") {
      const { meetingId: newId, error: err } = await createMeeting(
        payload,
        form.pendingTasks,
        currentUser.id,
        currentUser.name,
      );
      if (err || !newId) { setError(err ?? "שגיאה בשמירה"); setSaving(false); return; }
      router.push(`/dashboard/meetings/${newId}`);
    } else if (meetingId) {
      const ok = await saveMeeting(meetingId, payload, form.pendingTasks);
      if (!ok) { setError("שגיאה בשמירה"); setSaving(false); return; }
      router.push(`/dashboard/meetings/${meetingId}`);
    }
  };

  const priorityTasks = form.pendingTasks.filter(t => t.priority === "urgent");
  const otherTasks = form.pendingTasks.filter(t => t.priority !== "urgent");
  const allTasks = [...priorityTasks, ...otherTasks];

  return (
    <div className="max-w-3xl mx-auto pb-20">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
        <div className="flex items-start gap-4">
          {companyLogo && (
            <img
              src={companyLogo}
              alt="לוגו חברה"
              className="w-12 h-12 object-contain rounded-lg flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <input
              type="text"
              placeholder="כותרת הישיבה..."
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full text-xl font-bold text-gray-900 border-0 border-b-2 border-gray-200 pb-1 focus:outline-none focus:border-blue-500 bg-transparent"
            />
          </div>
        </div>

        {/* Meeting type */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.entries(MEETING_TYPE_CONFIG) as [MeetingType, typeof MEETING_TYPE_CONFIG[MeetingType]][]).map(
            ([type, cfg]) => (
              <button
                key={type}
                onClick={() => setForm((f) => ({ ...f, meetingType: type }))}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  form.meetingType === type
                    ? cfg.color + " ring-2 ring-offset-1 ring-current"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cfg.icon} {cfg.label}
              </button>
            ),
          )}
        </div>

        {/* Date + location */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type="datetime-local"
              value={form.meetingDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, meetingDate: e.target.value }))
              }
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="מיקום / פלטפורמה"
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </label>
        </div>
      </div>

      {/* Participants */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
          <Users size={18} className="text-gray-400" /> משתתפים
        </h2>
        <div className="flex flex-wrap gap-2">
          {userOptions.map((u) => {
            const selected = form.participants.some((p) => p.userId === u.id);
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
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-dashed border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600"
          >
            <Plus size={14} /> חיצוני
          </button>
        </div>
        {form.participants.filter(p => p.isExternal).map((p, i) => (
          <span key={i} className="inline-flex items-center gap-1 mt-2 mr-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
            🌐 {p.name}
          </span>
        ))}
      </div>

      {/* Agenda Items */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">📋 סדר יום</h2>
          <span className="text-xs text-gray-400">הקלד @ להקצאת משימה</span>
        </div>

        {form.agendaItems.map((item, idx) => {
          const isOpen = expandedItems.has(item.id);
          const itemTasks = form.pendingTasks.filter(
            (t) => t.agendaItemIndex === idx,
          );

          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="flex items-center gap-2 p-4">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  placeholder={`סעיף ${idx + 1}...`}
                  value={item.title}
                  onChange={(e) => updateAgendaTitle(item.id, e.target.value)}
                  className="flex-1 text-sm font-medium text-gray-800 border-0 focus:outline-none bg-transparent"
                />
                <div className="flex items-center gap-1">
                  {itemTasks.length > 0 && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">
                      {itemTasks.length} משימות
                    </span>
                  )}
                  <button
                    onClick={() =>
                      setExpandedItems((s) => {
                        const n = new Set(s);
                        isOpen ? n.delete(item.id) : n.add(item.id);
                        return n;
                      })
                    }
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {form.agendaItems.length > 1 && (
                    <button
                      onClick={() => removeAgendaItem(item.id)}
                      className="p-1 text-gray-300 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-gray-50">
                  <div className="pt-3">
                    <MeetingEditor
                      content={item.content}
                      placeholder={`תוכן הסעיף... (הקלד @ להקצאת משימה)`}
                      agendaItemIndex={idx}
                      users={userOptions}
                      onUpdate={(json) => updateAgendaContent(item.id, json)}
                      onTaskCreated={handleTaskCreated}
                    />
                  </div>

                  {/* Tasks for this agenda item */}
                  {itemTasks.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {itemTasks.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 text-sm"
                        >
                          <span className="text-orange-400 text-xs">📌</span>
                          <span className="font-medium text-orange-800 text-xs">
                            @{t.assigneeName}
                          </span>
                          <span className="text-gray-700 flex-1 text-xs">{t.taskTitle}</span>
                          <span className="text-gray-400 text-xs">
                            {t.dueDate
                              ? new Date(t.dueDate).toLocaleDateString("he-IL")
                              : ""}
                          </span>
                          <span className="text-xs">
                            {MEETING_PRIORITY_CONFIG[t.priority].icon}
                          </span>
                          <button
                            onClick={() => removePendingTask(t.id)}
                            className="text-gray-300 hover:text-red-500"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <button
          onClick={addAgendaItem}
          className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-1"
        >
          <Plus size={16} /> הוסף סעיף
        </button>
      </div>

      {/* Decisions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
        <h2 className="font-semibold text-gray-800 mb-2">✅ החלטות</h2>
        <textarea
          rows={3}
          placeholder="סכם את ההחלטות שהתקבלו..."
          value={form.decisions}
          onChange={(e) =>
            setForm((f) => ({ ...f, decisions: e.target.value }))
          }
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
        />
      </div>

      {/* All pending tasks summary */}
      {allTasks.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="font-semibold text-gray-800 mb-3">
            📌 משימות שהוקצו ({allTasks.length})
          </h2>
          <div className="space-y-2">
            {allTasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl text-sm"
              >
                <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {t.assigneeName.charAt(0)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-xs">{t.taskTitle}</p>
                  <p className="text-gray-400 text-xs">@{t.assigneeName}</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {t.dueDate && (
                    <span className="text-gray-400">
                      {new Date(t.dueDate).toLocaleDateString("he-IL")}
                    </span>
                  )}
                  <span>{MEETING_PRIORITY_CONFIG[t.priority].icon}</span>
                  <button
                    onClick={() => removePendingTask(t.id)}
                    className="text-gray-300 hover:text-red-500"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next meeting */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Calendar size={16} className="text-gray-400" />
          ישיבה הבאה (אופציונלי)
          <input
            type="date"
            value={form.nextMeetingDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, nextMeetingDate: e.target.value }))
            }
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </label>
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-600 text-sm text-center mb-3">{error}</p>
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
