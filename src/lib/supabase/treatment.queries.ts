import { createClient } from "./client";
import type {
  DbStoreTreatment,
  DbStoreTreatmentHistory,
} from "@/types/supabase";

export async function getStoreTreatments(
  companyId: string,
): Promise<DbStoreTreatment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("store_treatments")
    .select("*")
    .eq("company_id", companyId)
    .order("added_at", { ascending: false });

  if (error) {
    console.error("[treatment.queries] getStoreTreatments:", error);
    return [];
  }
  return data || [];
}

export interface AddTreatmentInput {
  company_id: string;
  store_id: number;
  store_name: string;
  store_city: string;
  store_agent: string;
  status_long: string;
  metric_12v12: number;
  metric_2v2: number;
  returns_pct: number;
  reason: string;
  notes?: string;
  added_by: string;
  added_by_name?: string;
}

export async function addStoreTreatment(
  input: AddTreatmentInput,
): Promise<{ data: DbStoreTreatment | null; error: string | null }> {
  const supabase = createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("store_treatments")
    .upsert(
      {
        company_id: input.company_id,
        store_id: input.store_id,
        store_name: input.store_name,
        store_city: input.store_city,
        store_agent: input.store_agent,
        status_long: input.status_long,
        metric_12v12: input.metric_12v12,
        metric_2v2: input.metric_2v2,
        returns_pct: input.returns_pct,
        reason: input.reason,
        treatment_status: "pending",
        notes: input.notes || "",
        added_by: input.added_by,
        added_by_name: input.added_by_name || null,
        added_at: now,
        updated_at: now,
      },
      { onConflict: "company_id,store_id" },
    )
    .select()
    .single();

  if (error) {
    console.error("[treatment.queries] addStoreTreatment:", error);
    return { data: null, error: error.message };
  }

  await insertTreatmentHistory({
    company_id: input.company_id,
    store_id: input.store_id,
    store_name: input.store_name,
    event_type: "added",
    reason: input.reason,
    notes: input.notes || null,
    created_by: input.added_by,
    created_by_name: input.added_by_name || null,
  });

  return { data, error: null };
}

export async function updateStoreTreatment(
  companyId: string,
  storeId: number,
  updates: { treatment_status?: string; notes?: string },
  userId: string,
  userName?: string,
): Promise<boolean> {
  const supabase = createClient();
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("store_treatments")
    .select("treatment_status, notes, store_name")
    .eq("company_id", companyId)
    .eq("store_id", storeId)
    .single();

  const { error } = await supabase
    .from("store_treatments")
    .update({
      ...updates,
      updated_at: now,
      ...(updates.treatment_status === "resolved"
        ? { resolved_at: now, resolved_by: userId }
        : {}),
    })
    .eq("company_id", companyId)
    .eq("store_id", storeId);

  if (error) {
    console.error("[treatment.queries] updateStoreTreatment:", error);
    return false;
  }

  if (
    updates.treatment_status &&
    updates.treatment_status !== existing?.treatment_status
  ) {
    await insertTreatmentHistory({
      company_id: companyId,
      store_id: storeId,
      store_name: existing?.store_name || "",
      event_type:
        updates.treatment_status === "resolved" ? "resolved" : "status_updated",
      old_status: existing?.treatment_status || null,
      new_status: updates.treatment_status,
      created_by: userId,
      created_by_name: userName || null,
    });
  }
  if (updates.notes !== undefined && updates.notes !== existing?.notes) {
    await insertTreatmentHistory({
      company_id: companyId,
      store_id: storeId,
      store_name: existing?.store_name || "",
      event_type: "notes_updated",
      notes: updates.notes,
      created_by: userId,
      created_by_name: userName || null,
    });
  }

  return true;
}

export async function removeStoreTreatment(
  companyId: string,
  storeId: number,
  storeName: string,
  userId: string,
  userName?: string,
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from("store_treatments")
    .delete()
    .eq("company_id", companyId)
    .eq("store_id", storeId);

  if (error) {
    console.error("[treatment.queries] removeStoreTreatment:", error);
    return false;
  }

  await insertTreatmentHistory({
    company_id: companyId,
    store_id: storeId,
    store_name: storeName,
    event_type: "removed",
    created_by: userId,
    created_by_name: userName || null,
  });

  return true;
}

async function insertTreatmentHistory(row: {
  company_id: string;
  store_id: number;
  store_name: string;
  event_type: string;
  reason?: string | null;
  old_status?: string | null;
  new_status?: string | null;
  notes?: string | null;
  created_by: string;
  created_by_name?: string | null;
}): Promise<void> {
  const supabase = createClient();
  await supabase.from("store_treatment_history").insert(row);
}

export async function getStoreTreatmentHistory(
  companyId: string,
  storeId?: number,
  limit?: number,
): Promise<DbStoreTreatmentHistory[]> {
  const supabase = createClient();
  let q = supabase
    .from("store_treatment_history")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (storeId != null) q = q.eq("store_id", storeId);
  if (limit != null) q = q.limit(limit);

  const { data, error } = await q;
  if (error) {
    console.error("[treatment.queries] getStoreTreatmentHistory:", error);
    return [];
  }
  return data || [];
}
