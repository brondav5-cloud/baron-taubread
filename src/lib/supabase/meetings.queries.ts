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

/**
 * Fetches all meetings the current user can see:
 * 1. Own-company meetings (visibility filtered by RLS)
 * 2. Cross-company meetings where the user is a participant or allowed_viewer (via RLS)
 */
export async function getMeetings(companyId: string): Promise<DbMeeting[]> {
  const supabase = createClient();

  // Query 1: own company (RLS applies visibility rules)
  const q1 = supabase
    .from("meetings")
    .select("*")
    .eq("company_id", companyId)
    .order("meeting_date", { ascending: false });

  // Query 2: cross-company meetings (RLS returns only what user is allowed to see)
  const q2 = supabase
    .from("meetings")
    .select("*")
    .neq("company_id", companyId)
    .order("meeting_date", { ascending: false });

  const [r1, r2] = await Promise.all([q1, q2]);

  if (r1.error) console.error("[getMeetings] company query:", r1.error);
  if (r2.error) console.error("[getMeetings] cross-company query:", r2.error);

  const all = [...(r1.data || []), ...(r2.data || [])];

  // Deduplicate and sort by meeting_date descending
  const seen = new Set<string>();
  const unique = all.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
  unique.sort(
    (a, b) =>
      new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime(),
  );

  return unique;
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
