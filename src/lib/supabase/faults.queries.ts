import { createClient } from "./client";

// ============================================
// TYPES (minimal, match DB)
// ============================================

export interface DbFaultType {
  id: string;
  company_id: string;
  name: string;
  icon: string;
  color: string;
  order: number;
  default_assignee_id: string | null;
  default_assignee_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DbFaultStatus {
  id: string;
  company_id: string;
  name: string;
  color: string;
  order: number;
  is_final: boolean;
  is_active: boolean;
  created_at: string;
}

export interface DbFault {
  id: string;
  company_id: string;
  type_id: string;
  status_id: string;
  title: string;
  description: string;
  reported_by: string;
  reported_by_name: string;
  assigned_to: string;
  assigned_to_name: string;
  photos: string[];
  comments: Array<{
    id: string;
    userId: string;
    userName: string;
    text: string;
    createdAt: string;
  }>;
  history: Array<{
    id: string;
    action: string;
    userId: string;
    userName: string;
    timestamp: string;
    details?: string;
  }>;
  created_at: string;
  updated_at: string;
}

// ============================================
// FAULT TYPES
// ============================================

export async function getFaultTypes(companyId: string): Promise<DbFaultType[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("fault_types")
    .select("*")
    .eq("company_id", companyId)
    .order("order");

  if (error) {
    console.error("Error fetching fault types:", error);
    return [];
  }
  return data || [];
}

export async function insertFaultType(
  row: Omit<DbFaultType, "id" | "created_at">,
): Promise<DbFaultType | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("fault_types")
    .insert(row)
    .select()
    .single();
  if (error) {
    console.error("Error inserting fault type:", error);
    return null;
  }
  return data;
}

export async function updateFaultType(
  id: string,
  updates: Partial<Omit<DbFaultType, "id" | "company_id">>,
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("fault_types")
    .update(updates)
    .eq("id", id);
  return !error;
}

export async function deleteFaultType(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("fault_types").delete().eq("id", id);
  return !error;
}

// ============================================
// FAULT STATUSES
// ============================================

export async function getFaultStatuses(
  companyId: string,
): Promise<DbFaultStatus[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("fault_statuses")
    .select("*")
    .eq("company_id", companyId)
    .order("order");

  if (error) {
    console.error("Error fetching fault statuses:", error);
    return [];
  }
  return data || [];
}

export async function insertFaultStatus(
  row: Omit<DbFaultStatus, "id" | "created_at">,
): Promise<DbFaultStatus | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("fault_statuses")
    .insert(row)
    .select()
    .single();
  if (error) {
    console.error("Error inserting fault status:", error);
    return null;
  }
  return data;
}

export async function updateFaultStatus(
  id: string,
  updates: Partial<Omit<DbFaultStatus, "id" | "company_id">>,
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("fault_statuses")
    .update(updates)
    .eq("id", id);
  return !error;
}

export async function deleteFaultStatus(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("fault_statuses").delete().eq("id", id);
  return !error;
}

// ============================================
// FAULTS
// ============================================

export async function getFaults(companyId: string): Promise<DbFault[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("faults")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching faults:", error);
    return [];
  }
  return data || [];
}

export async function insertFault(
  row: Omit<DbFault, "id" | "created_at" | "updated_at"> & {
    created_at?: string;
    updated_at?: string;
  },
): Promise<{ data: DbFault | null; error: string | null }> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("faults")
    .insert({ ...row, created_at: now, updated_at: now })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function updateFault(
  id: string,
  updates: Partial<Omit<DbFault, "id" | "company_id" | "created_at">>,
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("faults")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  return !error;
}
