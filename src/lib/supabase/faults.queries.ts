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

export interface FaultDocument {
  name: string;
  url: string;
  size: number;
  type: string;
  path: string;
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
  assigned_to_ids: string[];
  assigned_to_names: string[];
  photos: string[];
  documents: FaultDocument[];
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

/** Returns all fault types accessible to the current user (own + cross-company, via RLS). */
export async function getAllAccessibleFaultTypes(): Promise<DbFaultType[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("fault_types")
    .select("*")
    .order("order");

  if (error) {
    console.error("Error fetching all fault types:", error);
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
): Promise<{ data: DbFaultStatus[]; fetchError: boolean }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("fault_statuses")
    .select("*")
    .eq("company_id", companyId)
    .order("order");

  if (error) {
    console.error("Error fetching fault statuses:", error);
    return { data: [], fetchError: true };
  }
  return { data: data || [], fetchError: false };
}

/** Returns all fault statuses accessible to the current user (own + cross-company, via RLS). */
export async function getAllAccessibleFaultStatuses(): Promise<DbFaultStatus[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("fault_statuses")
    .select("*")
    .order("order");

  if (error) {
    console.error("Error fetching all fault statuses:", error);
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

  // Query 1: own company
  const q1 = supabase
    .from("faults")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  // Query 2: cross-company faults (RLS returns only what user is allowed to see)
  const q2 = supabase
    .from("faults")
    .select("*")
    .neq("company_id", companyId)
    .order("created_at", { ascending: false });

  const [r1, r2] = await Promise.all([q1, q2]);

  if (r1.error) console.error("[getFaults] company query:", r1.error);
  if (r2.error) console.error("[getFaults] cross-company query:", r2.error);

  const all = [...(r1.data || []), ...(r2.data || [])];

  const seen = new Set<string>();
  return all
    .filter((f) => {
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
}

export async function insertFault(
  row: Omit<DbFault, "id" | "created_at" | "updated_at"> & {
    created_at?: string;
    updated_at?: string;
  },
): Promise<{ data: DbFault | null; error: string | null }> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    ...row,
    created_at: now,
    updated_at: now,
  };

  const getMissingColumnFromMessage = (message: string | undefined): string | null => {
    if (!message) return null;
    const match = message.match(/Could not find the '([^']+)' column/i);
    return match?.[1] ?? null;
  };

  // Backward compatibility:
  // Some environments may not yet have all newer optional columns (e.g. documents).
  // If PostgREST reports a missing column, remove it from payload and retry.
  for (let i = 0; i < 4; i += 1) {
    const { data, error } = await supabase
      .from("faults")
      .insert(payload)
      .select()
      .single();

    if (!error) return { data, error: null };

    const missingColumn = getMissingColumnFromMessage(error.message);
    if (!missingColumn || !(missingColumn in payload)) {
      return { data: null, error: error.message };
    }

    delete payload[missingColumn];
    console.warn(
      `[insertFault] Missing column "${missingColumn}" in DB. Retrying without it.`,
    );
  }

  return { data: null, error: "Insert failed after compatibility retries" };
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

export async function deleteFaultById(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("faults").delete().eq("id", id);
  return !error;
}

// ============================================
// FAULT DOCUMENTS — Supabase Storage
// ============================================

const BUCKET = "fault-documents";

export async function uploadFaultDocument(
  file: File,
  companyId: string,
  sessionId: string,
): Promise<FaultDocument | null> {
  const supabase = createClient();
  // Use only timestamp + ASCII extension in the storage path (Hebrew/unicode breaks Supabase Storage keys)
  const ext = file.name.includes(".")
    ? "." + file.name.split(".").pop()!.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
    : "";
  const path = `${companyId}/${sessionId}/${Date.now()}${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    console.error("Error uploading fault document:", error);
    return null;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return {
    name: file.name,
    url: data.publicUrl,
    size: file.size,
    type: file.type,
    path,
  };
}

export async function deleteFaultDocument(path: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  return !error;
}
