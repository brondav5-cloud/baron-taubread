import { createClient } from "./client";
import type {
  DbStore,
  DbProduct,
  DbVisit,
  DbSnapshot,
  DbUpload,
  DbFilters,
  DataMetadata,
  StoreInsert,
  ProductInsert,
  VisitInsert,
  SnapshotInsert,
  UploadInsert,
} from "@/types/supabase";

// ============================================
// METADATA
// ============================================

export async function getMetadata(
  companyId: string,
): Promise<DataMetadata | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("data_metadata")
    .select("*")
    .eq("company_id", companyId)
    .single();

  if (error) {
    console.error("Error fetching metadata:", error);
    return null;
  }
  return data;
}

export async function upsertMetadata(metadata: DataMetadata): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("data_metadata")
    .upsert(metadata, { onConflict: "company_id" });

  if (error) {
    console.error("Error upserting metadata:", error);
    return false;
  }
  return true;
}

// ============================================
// STORES
// ============================================

export async function getStores(companyId: string): Promise<DbStore[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("company_id", companyId)
    .order("name")
    .limit(2000);

  if (error) {
    console.error("Error fetching stores:", error);
    return [];
  }
  return data || [];
}

export async function getStoreById(
  companyId: string,
  externalId: number,
): Promise<DbStore | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("company_id", companyId)
    .eq("external_id", externalId)
    .single();

  if (error) {
    console.error("Error fetching store:", error);
    return null;
  }
  return data;
}

export async function upsertStores(stores: StoreInsert[]): Promise<boolean> {
  if (stores.length === 0) return true;

  const supabase = createClient();
  const { error } = await supabase
    .from("stores")
    .upsert(stores, { onConflict: "company_id,external_id" });

  if (error) {
    console.error("Error upserting stores:", error);
    return false;
  }
  return true;
}

export async function deleteAllStores(companyId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("stores")
    .delete()
    .eq("company_id", companyId);

  if (error) {
    console.error("Error deleting stores:", error);
    return false;
  }
  return true;
}

// ============================================
// PRODUCTS
// ============================================

export async function getProducts(companyId: string): Promise<DbProduct[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("company_id", companyId)
    .order("name")
    .limit(2000);

  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }
  return data || [];
}

export async function upsertProducts(
  products: ProductInsert[],
): Promise<boolean> {
  if (products.length === 0) return true;

  const supabase = createClient();
  const { error } = await supabase
    .from("products")
    .upsert(products, { onConflict: "company_id,external_id" });

  if (error) {
    console.error("Error upserting products:", error);
    return false;
  }
  return true;
}

export async function deleteAllProducts(companyId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("company_id", companyId);

  if (error) {
    console.error("Error deleting products:", error);
    return false;
  }
  return true;
}

// ============================================
// SNAPSHOTS
// ============================================

export async function getSnapshots(companyId: string): Promise<DbSnapshot[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("snapshots")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error fetching snapshots:", error);
    return [];
  }
  return data || [];
}

export async function createSnapshot(
  snapshot: SnapshotInsert,
): Promise<DbSnapshot | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("snapshots")
    .insert(snapshot)
    .select()
    .single();

  if (error) {
    console.error("Error creating snapshot:", error);
    return null;
  }
  return data;
}

export async function deleteSnapshot(
  companyId: string,
  snapshotId: string,
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("snapshots")
    .delete()
    .eq("id", snapshotId)
    .eq("company_id", companyId);

  if (error) {
    console.error("Error deleting snapshot:", error);
    return false;
  }
  return true;
}

// ============================================
// UPLOADS
// ============================================

export async function getUploads(companyId: string): Promise<DbUpload[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("uploads")
    .select("*")
    .eq("company_id", companyId)
    .order("uploaded_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error fetching uploads:", error);
    return [];
  }
  return data || [];
}

export async function createUpload(
  upload: UploadInsert,
): Promise<DbUpload | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("uploads")
    .insert(upload)
    .select()
    .single();

  if (error) {
    console.error("Error creating upload:", error);
    return null;
  }
  return data;
}

export async function updateUploadStatus(
  companyId: string,
  uploadId: string,
  status: "completed" | "failed",
  stats?: {
    rows_count?: number;
    stores_count?: number;
    products_count?: number;
    processing_time_ms?: number;
    error_message?: string;
    period_start?: string;
    period_end?: string;
  },
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("uploads")
    .update({ status, ...stats })
    .eq("id", uploadId)
    .eq("company_id", companyId);

  if (error) {
    console.error("Error updating upload status:", error);
    return false;
  }
  return true;
}

// ============================================
// VISITS
// ============================================

export async function getVisits(companyId: string): Promise<DbVisit[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("visits")
    .select("*")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(5000);

  if (error) {
    console.error("Error fetching visits:", error);
    return [];
  }
  return data || [];
}

export interface VisitSummaryRow {
  store_external_id: number;
  date: string;
  competitors: Array<{ name?: string }> | null;
}

export async function getVisitsSummary(
  companyId: string,
): Promise<VisitSummaryRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("visits")
    .select("store_external_id, date, competitors")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(5000);

  if (error) {
    console.error("Error fetching visits summary:", error);
    return [];
  }
  return (data as VisitSummaryRow[]) || [];
}

export async function insertVisit(
  visit: VisitInsert,
): Promise<{ data: DbVisit | null; error: { message: string } | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("visits")
    .insert(visit)
    .select()
    .single();

  if (error) {
    console.error("Error inserting visit:", error);
    return { data: null, error: { message: error.message } };
  }
  return { data, error: null };
}

export async function updateVisit(
  companyId: string,
  id: string,
  updates: Partial<Omit<DbVisit, "id" | "company_id" | "created_at">>,
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("visits")
    .update(updates)
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    console.error("Error updating visit:", error);
    return false;
  }
  return true;
}

export async function deleteVisit(
  companyId: string,
  id: string,
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("visits")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    console.error("Error deleting visit:", error);
    return false;
  }
  return true;
}

// ============================================
// FILTERS
// ============================================

export async function getFilters(companyId: string): Promise<DbFilters | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("filters")
    .select("*")
    .eq("company_id", companyId)
    .single();

  if (error) {
    console.error("Error fetching filters:", error);
    return null;
  }
  return data;
}

export async function upsertFilters(filters: DbFilters): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("filters")
    .upsert(filters, { onConflict: "company_id" });

  if (error) {
    console.error("Error upserting filters:", error);
    return false;
  }
  return true;
}
