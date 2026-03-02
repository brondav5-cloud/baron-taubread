import type { DbMeeting, DbMeetingTask } from "@/types/supabase";
import type { Meeting, MeetingTaskRecord, AgendaItem, MeetingParticipant } from "@/types/meeting";

export function dbMeetingToMeeting(db: DbMeeting): Meeting {
  return {
    id: db.id,
    companyId: db.company_id,
    title: db.title,
    meetingType: db.meeting_type as Meeting["meetingType"],
    meetingDate: db.meeting_date,
    location: db.location ?? undefined,
    participants: (db.participants as MeetingParticipant[]) || [],
    agendaItems: (db.agenda_items as AgendaItem[]) || [],
    decisions: db.decisions ?? undefined,
    nextMeetingDate: db.next_meeting_date ?? undefined,
    status: db.status as Meeting["status"],
    createdBy: db.created_by,
    createdByName: db.created_by_name,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function dbMeetingTaskToRecord(db: DbMeetingTask): MeetingTaskRecord {
  return {
    id: db.id,
    meetingId: db.meeting_id,
    agendaItemIndex: db.agenda_item_index ?? undefined,
    taskId: db.task_id,
    assigneeUserId: db.assignee_user_id,
    assigneeName: db.assignee_name,
    taskTitle: db.task_title,
    dueDate: db.due_date ?? undefined,
    priority: db.priority as MeetingTaskRecord["priority"],
    createdAt: db.created_at,
  };
}
