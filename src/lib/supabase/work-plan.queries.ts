import { createClient } from "./client";
import type { DbWorkPlanItem } from "@/types/supabase";

// ============================================
// WORK PLAN ITEMS
// ============================================

export async function getWorkPlanItems(
  companyId: string,
  weekKey: string,
): Promise<DbWorkPlanItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("work_plan_items")
    .select("*")
    .eq("company_id", companyId)
    .eq("week_key", weekKey)
    .order("day")
    .order("sort_order");

  if (error) {
    console.error("[work-plan.queries] getWorkPlanItems:", error);
    return [];
  }
  return data || [];
}

export async function getWorkPlanItemsForWeeks(
  companyId: string,
  weekKeys: string[],
): Promise<DbWorkPlanItem[]> {
  if (weekKeys.length === 0) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("work_plan_items")
    .select("*")
    .eq("company_id", companyId)
    .in("week_key", weekKeys)
    .order("week_key")
    .order("day")
    .order("sort_order");

  if (error) {
    console.error("[work-plan.queries] getWorkPlanItemsForWeeks:", error);
    return [];
  }
  return data || [];
}

/** Get all work plan items (visits and tasks) for counting by store */
export async function getAllWorkPlanItems(
  companyId: string,
): Promise<DbWorkPlanItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("work_plan_items")
    .select("*")
    .eq("company_id", companyId)
    .order("week_key", { ascending: false })
    .order("day")
    .order("sort_order");

  if (error) {
    console.error("[work-plan.queries] getAllWorkPlanItems:", error);
    return [];
  }
  return data || [];
}

export interface UpsertWorkPlanItemInput {
  company_id: string;
  week_key: string;
  day: number;
  item_type: "visit" | "task";
  sort_order: number;
  priority: "high" | "medium" | "low";
  completed?: boolean;
  created_by: string;
  store_id?: number;
  store_name?: string;
  store_city?: string;
  store_agent?: string;
  task_title?: string;
  task_description?: string;
}

export async function insertWorkPlanItem(
  input: UpsertWorkPlanItemInput,
): Promise<{ data: DbWorkPlanItem | null; error: string | null }> {
  const supabase = createClient();
  const now = new Date().toISOString();

  const row = {
    company_id: input.company_id,
    week_key: input.week_key,
    day: input.day,
    item_type: input.item_type,
    sort_order: input.sort_order,
    priority: input.priority,
    completed: input.completed ?? false,
    created_at: now,
    updated_at: now,
    created_by: input.created_by,
    store_id: input.store_id ?? null,
    store_name: input.store_name ?? null,
    store_city: input.store_city ?? null,
    store_agent: input.store_agent ?? null,
    task_title: input.task_title ?? null,
    task_description: input.task_description ?? null,
  };

  const { data, error } = await supabase
    .from("work_plan_items")
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error("[work-plan.queries] insertWorkPlanItem:", error);
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

export async function updateWorkPlanItem(
  id: string,
  updates: Partial<
    Pick<DbWorkPlanItem, "day" | "sort_order" | "priority" | "completed">
  >,
): Promise<boolean> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = { ...updates, updated_at: now };
  if (updates.completed !== undefined) {
    payload.completed_at = updates.completed ? now : null;
  }

  const { error } = await supabase
    .from("work_plan_items")
    .update(payload)
    .eq("id", id);
  if (error) {
    console.error("[work-plan.queries] updateWorkPlanItem:", error);
    return false;
  }
  return true;
}

export async function deleteWorkPlanItem(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("work_plan_items")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("[work-plan.queries] deleteWorkPlanItem:", error);
    return false;
  }
  return true;
}

export async function getStoreVisitFrequency(companyId: string): Promise<
  {
    store_id: number;
    store_name: string;
    visit_count: number;
    weeks_planned: number;
  }[]
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("store_visit_frequency")
    .select("store_id, store_name, visit_count, weeks_planned")
    .eq("company_id", companyId)
    .order("visit_count", { ascending: false });

  if (error) {
    console.error("[work-plan.queries] getStoreVisitFrequency:", error);
    return [];
  }
  return data || [];
}
