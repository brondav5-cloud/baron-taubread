import { createClient } from "./client";
import type {
  DbTask,
  DbWorkflow,
  TaskInsert,
  WorkflowInsert,
} from "@/types/supabase";

// ============================================
// TASKS
// ============================================

export async function getTasks(companyIds: string[]): Promise<DbTask[]> {
  const supabase = createClient();
  if (!companyIds.length) return [];
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .in("company_id", companyIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
  return data || [];
}

export async function insertTask(
  task: TaskInsert,
): Promise<{ data: DbTask | null; error: { message: string } | null }> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const row = {
    ...task,
    created_at: task.created_at ?? now,
    updated_at: task.updated_at ?? now,
  };
  const { data, error } = await supabase
    .from("tasks")
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error("Error inserting task:", error);
    return { data: null, error: { message: error.message } };
  }
  return { data, error: null };
}

export async function updateTask(
  id: string,
  updates: Partial<Omit<DbTask, "id" | "company_id" | "created_at">>,
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error updating task:", error);
    return false;
  }
  return true;
}

export async function deleteSingleTask(taskId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) {
    console.error("[deleteSingleTask]", error);
    return false;
  }
  return true;
}

export async function deleteAllTasks(companyId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("company_id", companyId);

  if (error) {
    console.error("Error deleting tasks:", error);
    return false;
  }
  return true;
}

// ============================================
// WORKFLOWS
// ============================================

export async function getWorkflows(companyIds: string[]): Promise<DbWorkflow[]> {
  const supabase = createClient();
  if (!companyIds.length) return [];
  const { data, error } = await supabase
    .from("workflows")
    .select("*")
    .in("company_id", companyIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching workflows:", error);
    return [];
  }
  return data || [];
}

export async function insertWorkflow(
  wf: WorkflowInsert,
): Promise<{ data: DbWorkflow | null; error: { message: string } | null }> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const row = {
    ...wf,
    created_at: wf.created_at ?? now,
    updated_at: wf.updated_at ?? now,
  };
  const { data, error } = await supabase
    .from("workflows")
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error("Error inserting workflow:", error);
    return { data: null, error: { message: error.message } };
  }
  return { data, error: null };
}

export async function updateWorkflow(
  id: string,
  updates: Partial<Omit<DbWorkflow, "id" | "company_id" | "created_at">>,
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("workflows")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error updating workflow:", error);
    return false;
  }
  return true;
}

export async function deleteAllWorkflows(companyId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("workflows")
    .delete()
    .eq("company_id", companyId);

  if (error) {
    console.error("Error deleting workflows:", error);
    return false;
  }
  return true;
}
