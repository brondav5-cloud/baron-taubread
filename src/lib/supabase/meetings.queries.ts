import { createClient } from "./client";
import type {
  DbMeeting,
  DbMeetingTask,
  MeetingInsert,
  MeetingTaskInsert,
} from "@/types/supabase";

// ============================================
// MEETINGS
// ============================================

export async function getMeetings(companyId: string): Promise<DbMeeting[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("company_id", companyId)
    .order("meeting_date", { ascending: false });

  if (error) {
    console.error("[getMeetings]", error);
    return [];
  }
  return data || [];
}

export async function getMeetingById(id: string): Promise<DbMeeting | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[getMeetingById]", error);
    return null;
  }
  return data;
}

export async function insertMeeting(
  meeting: MeetingInsert,
): Promise<{ data: DbMeeting | null; error: { message: string } | null }> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("meetings")
    .insert({ ...meeting, created_at: now, updated_at: now })
    .select()
    .single();

  if (error) {
    console.error("[insertMeeting]", error);
    return { data: null, error: { message: error.message } };
  }
  return { data, error: null };
}

export async function updateMeeting(
  id: string,
  updates: Partial<Omit<DbMeeting, "id" | "company_id" | "created_at">>,
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("meetings")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[updateMeeting]", error);
    return false;
  }
  return true;
}

export async function deleteMeeting(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) {
    console.error("[deleteMeeting]", error);
    return false;
  }
  return true;
}

// ============================================
// MEETING TASKS
// ============================================

export async function getMeetingTasks(meetingId: string): Promise<DbMeetingTask[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("meeting_tasks")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getMeetingTasks]", error);
    return [];
  }
  return data || [];
}

export async function insertMeetingTask(
  mt: MeetingTaskInsert,
): Promise<{ data: DbMeetingTask | null; error: { message: string } | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("meeting_tasks")
    .insert(mt)
    .select()
    .single();

  if (error) {
    console.error("[insertMeetingTask]", error);
    return { data: null, error: { message: error.message } };
  }
  return { data, error: null };
}
