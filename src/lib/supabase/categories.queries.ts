import { createClient } from "./client";
import type { DbTaskCategory } from "@/types/supabase";

export async function getTaskCategories(
  companyId: string,
): Promise<DbTaskCategory[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("task_categories")
    .select("*")
    .eq("company_id", companyId)
    .order("sort_order");

  if (error) {
    console.error("Error fetching task categories:", error);
    return [];
  }
  return data || [];
}

export async function insertTaskCategory(
  cat: Omit<DbTaskCategory, "id" | "created_at" | "updated_at">,
): Promise<DbTaskCategory | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("task_categories")
    .insert(cat)
    .select()
    .single();

  if (error) {
    console.error("Error inserting task category:", error);
    return null;
  }
  return data;
}

export async function updateTaskCategory(
  id: string,
  updates: Partial<
    Pick<
      DbTaskCategory,
      | "name"
      | "icon"
      | "color"
      | "default_assignee_id"
      | "is_active"
      | "sort_order"
    >
  >,
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("task_categories")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error updating task category:", error);
    return false;
  }
  return true;
}

export async function deleteTaskCategory(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("task_categories")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting task category:", error);
    return false;
  }
  return true;
}

export async function reorderTaskCategories(
  orderedIds: string[],
): Promise<boolean> {
  const supabase = createClient();
  const updates = orderedIds.map((id, index) =>
    supabase
      .from("task_categories")
      .update({ sort_order: index + 1, updated_at: new Date().toISOString() })
      .eq("id", id),
  );

  const results = await Promise.all(updates);
  const hasError = results.some((r) => r.error);
  if (hasError) {
    console.error("Error reordering task categories");
    return false;
  }
  return true;
}
