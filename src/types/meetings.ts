// ============================================
// Meetings database types
// ============================================

export interface DbMeeting {
  id: string;
  company_id: string;
  title: string;
  meeting_type: string;
  meeting_date: string;
  location: string | null;
  participants: unknown;
  agenda_items: unknown;
  decisions: string | null;
  next_meeting_date: string | null;
  status: string;
  visibility: string;
  allowed_viewers: unknown;
  prev_meeting_id: string | null;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface DbMeetingTask {
  id: string;
  meeting_id: string;
  agenda_item_index: number | null;
  task_id: string;
  assignee_user_id: string;
  assignee_name: string;
  assignee_user_ids: string[] | null;
  assignee_names: string[] | null;
  task_title: string;
  due_date: string | null;
  priority: string;
  company_id: string;
  created_at: string;
}

export interface MeetingInsert {
  company_id: string;
  title: string;
  meeting_type: string;
  meeting_date: string;
  location?: string | null;
  participants?: unknown;
  agenda_items?: unknown;
  decisions?: string | null;
  next_meeting_date?: string | null;
  status?: string;
  visibility?: string;
  allowed_viewers?: unknown;
  prev_meeting_id?: string | null;
  created_by: string;
  created_by_name: string;
  created_at?: string;
  updated_at?: string;
}

export interface MeetingTaskInsert {
  meeting_id: string;
  agenda_item_index?: number | null;
  task_id: string;
  assignee_user_id: string;
  assignee_name: string;
  assignee_user_ids: string[];
  assignee_names: string[];
  task_title: string;
  due_date?: string | null;
  priority?: string;
  company_id: string;
}
