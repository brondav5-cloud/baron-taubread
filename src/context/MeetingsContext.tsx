"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Meeting, MeetingTaskRecord, MeetingTaskMention } from "@/types/meeting";
import type { MeetingInsert } from "@/types/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  getMeetings,
  insertMeeting,
  updateMeeting,
  deleteMeeting,
  getMeetingTasks,
  insertMeetingTask,
} from "@/lib/supabase/meetings.queries";
import { dbMeetingToMeeting, dbMeetingTaskToRecord } from "@/lib/supabase/meetings.mappers";
import { insertTask } from "@/lib/supabase/tasks.queries";
import { taskToDbTask } from "@/lib/supabase/tasks.mappers";
import type { Task } from "@/types/task";
import { generateHistoryId, calculateDueDate } from "@/types/task";
import { sendNotification, sendNotificationAsync } from "@/lib/notifications/notify";

// ── Context type ─────────────────────────────────────────────

interface MeetingsContextType {
  meetings: Meeting[];
  loading: boolean;
  getMeetingById: (id: string) => Meeting | undefined;
  createMeeting: (
    input: Omit<MeetingInsert, "company_id" | "created_by" | "created_by_name">,
    pendingTasks: MeetingTaskMention[],
    createdBy: string,
    createdByName: string,
  ) => Promise<{ meetingId: string | null; error: string | null }>;
  saveMeeting: (
    meetingId: string,
    updates: Partial<MeetingInsert>,
    pendingTasks?: MeetingTaskMention[],
  ) => Promise<boolean>;
  removeMeeting: (meetingId: string) => Promise<boolean>;
  getMeetingTaskRecords: (meetingId: string) => Promise<MeetingTaskRecord[]>;
  refetch: () => void;
}

const MeetingsContext = createContext<MeetingsContextType | null>(null);

export function MeetingsProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    if (!companyId) return;
    setLoading(true);
    getMeetings(companyId)
      .then((rows) => setMeetings(rows.map(dbMeetingToMeeting)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [companyId]);

  useEffect(() => {
    if (auth.status === "loading") return;
    if (!companyId) { setLoading(false); return; }
    refetch();
  }, [auth.status, companyId, refetch]);

  const getMeetingById = useCallback(
    (id: string) => meetings.find((m) => m.id === id),
    [meetings],
  );

  const createMeeting = useCallback(
    async (
      input: Omit<MeetingInsert, "company_id" | "created_by" | "created_by_name">,
      pendingTasks: MeetingTaskMention[],
      createdBy: string,
      createdByName: string,
    ): Promise<{ meetingId: string | null; error: string | null }> => {
      if (!companyId) return { meetingId: null, error: "לא נבחרה חברה" };

      const { data, error } = await insertMeeting({
        ...input,
        company_id: companyId,
        created_by: createdBy,
        created_by_name: createdByName,
      });

      if (error || !data) return { meetingId: null, error: error?.message ?? "שגיאה" };

      const meetingId = data.id;
      const meeting = dbMeetingToMeeting(data);
      setMeetings((prev) => [meeting, ...prev]);

      const meetingTitle = typeof input.title === "string" ? input.title : "";

      // Await task creation so tasks exist before navigation happens
      if (pendingTasks.length) {
        const isRestrictedMeeting = (input.visibility ?? "public") === "restricted";
        await _createPendingTasks(
          pendingTasks,
          meetingId,
          companyId,
          createdBy,
          createdByName,
          meetingTitle,
          isRestrictedMeeting,
        ).catch((e) => console.error("[createMeeting] task creation error:", e));
      }

      return { meetingId, error: null };
    },
    [companyId],
  );

  const saveMeeting = useCallback(
    async (
      meetingId: string,
      updates: Partial<MeetingInsert>,
      pendingTasks?: MeetingTaskMention[],
    ): Promise<boolean> => {
      if (!companyId) return false;
      const ok = await updateMeeting(meetingId, updates as never);
      if (!ok) return false;

      setMeetings((prev) =>
        prev.map((m) =>
          m.id === meetingId
            ? { ...m, ...dbMeetingToMeeting({ ...m, ...updates } as never) }
            : m,
        ),
      );

      const meeting = meetings.find((m) => m.id === meetingId);
      const meetingTitle = meeting?.title ?? "";
      const meetingCreatedBy = meeting?.createdBy ?? "";
      const meetingCreatedByName = meeting?.createdByName ?? "";

      if (pendingTasks?.length) {
        const isRestrictedMeeting =
          (updates.visibility ?? meeting?.visibility ?? "public") === "restricted";
        await _createPendingTasks(
          pendingTasks,
          meetingId,
          meeting?.companyId ?? companyId,
          meetingCreatedBy,
          meetingCreatedByName,
          meetingTitle,
          isRestrictedMeeting,
        ).catch((e) => console.error("[saveMeeting] task creation error:", e));
      }

      _notifyMeetingParticipants(
        meeting?.participants as { userId?: string; isExternal?: boolean }[] | null,
        meetingId,
        meetingTitle,
        meetingCreatedBy,
        meetingCreatedByName,
      );

      return true;
    },
    [companyId, meetings],
  );

  const removeMeeting = useCallback(
    async (meetingId: string): Promise<boolean> => {
      const ok = await deleteMeeting(meetingId);
      if (ok) setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
      return ok;
    },
    [],
  );

  const getMeetingTaskRecords = useCallback(
    async (meetingId: string): Promise<MeetingTaskRecord[]> => {
      const rows = await getMeetingTasks(meetingId);
      return rows.map(dbMeetingTaskToRecord);
    },
    [],
  );

  return (
    <MeetingsContext.Provider
      value={{
        meetings,
        loading,
        getMeetingById,
        createMeeting,
        saveMeeting,
        removeMeeting,
        getMeetingTaskRecords,
        refetch,
      }}
    >
      {children}
    </MeetingsContext.Provider>
  );
}

export function useMeetings() {
  const ctx = useContext(MeetingsContext);
  if (!ctx) throw new Error("useMeetings must be used inside MeetingsProvider");
  return ctx;
}

// ── Internal helpers ──────────────────────────────────────────

/** Notify all internal participants (with userId, non-external) when a meeting is saved. */
function _notifyMeetingParticipants(
  participants: { userId?: string; isExternal?: boolean }[] | null | undefined,
  meetingId: string,
  meetingTitle: string,
  createdBy: string,
  createdByName: string,
): void {
  if (!Array.isArray(participants)) return;
  const recipientUserIds = participants
    .filter((p) => !!p.userId && !p.isExternal && p.userId !== createdBy)
    .map((p) => p.userId as string);
  if (!recipientUserIds.length) return;

  sendNotification({
    recipientUserIds,
    type: "general",
    title: `סיכום ישיבה: ${meetingTitle}`,
    body: `${createdByName} שמר סיכום ישיבה. לחץ לצפייה.`,
    url: `/dashboard/meetings/${meetingId}`,
    referenceId: meetingId,
    sendEmail: true,
    sendSms: true,
  });
}

async function _createPendingTasks(
  pendingTasks: MeetingTaskMention[],
  meetingId: string,
  companyId: string,
  createdBy: string,
  createdByName: string,
  meetingTitle: string,
  isPrivate: boolean,
) {
  if (!pendingTasks.length) return;

  // Load already-created tasks for this meeting to avoid duplicates on re-save
  const existingMeetingTasks = await getMeetingTasks(meetingId);

  const alreadyCreated = new Set(
    existingMeetingTasks.map(
      (mt) => `${mt.assignee_user_id}::${mt.task_title}`,
    ),
  );

  const newTasks = pendingTasks.filter(
    (pt) => !alreadyCreated.has(`${pt.assigneeUserId}::${pt.taskTitle}`),
  );

  if (!newTasks.length) return;

  // Await notification so it is guaranteed to send before page navigation
  const recipientUserIds = Array.from(
    new Set(newTasks.map((pt) => pt.assigneeUserId).filter(Boolean)),
  );
  if (recipientUserIds.length) {
    await sendNotificationAsync({
      recipientUserIds,
      type: "task_assigned",
      title: "משימה חדשה מישיבה",
      body: `הוקצתה לך משימה מישיבת: ${meetingTitle}`,
      url: `/dashboard/meetings/${meetingId}`,
      referenceId: meetingId,
      referenceType: "task",
      sendEmail: true,
      sendSms: true,
    });
  }

  // Create tasks in parallel (faster than sequential)
  const now = new Date().toISOString();
  await Promise.all(
    newTasks.map(async (pt) => {
      const dueDate = pt.dueDate || calculateDueDate("normal");

      const taskInput: Omit<Task, "id"> & { id: string } = {
        id: "",
        taskType: "general",
        createdBy,
        createdByName,
        createdAt: now,
        updatedAt: now,
        assignees: [
          {
            userId: pt.assigneeUserId,
            userName: pt.assigneeName,
            role: "primary",
            status: "new",
          },
        ],
        categoryId: "meeting",
        categoryName: "ישיבה",
        categoryIcon: "📋",
        priority: pt.priority,
        title: pt.taskTitle,
        description: `נוצר בישיבה: ${meetingTitle}`,
        photos: [],
        status: "new",
        checklist: [],
        comments: [],
        history: [
          {
            id: generateHistoryId(),
            action: "created",
            userId: createdBy,
            userName: createdByName,
            timestamp: now,
            details: `נוצר מישיבת צוות: ${meetingTitle}`,
          },
        ],
        handlerPhotos: [],
        dueDate,
        isPrivate,
      };

      const dbTask = taskToDbTask(taskInput, companyId);
      const { data: createdTask, error: taskError } = await insertTask(dbTask);

      if (taskError || !createdTask) {
        console.error("[_createPendingTasks] insertTask failed:", taskError?.message, "for:", pt.taskTitle);
        return;
      }

      const { error: mtError } = await insertMeetingTask({
        meeting_id: meetingId,
        agenda_item_index: pt.agendaItemIndex ?? null,
        task_id: createdTask.id,
        assignee_user_id: pt.assigneeUserId,
        assignee_name: pt.assigneeName,
        task_title: pt.taskTitle,
        due_date: dueDate,
        priority: pt.priority,
        company_id: companyId,
      });

      if (mtError) {
        console.error("[_createPendingTasks] insertMeetingTask failed:", mtError.message);
      }
    }),
  );
}
