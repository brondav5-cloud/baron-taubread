import type { SupabaseClient } from "@supabase/supabase-js";

const BATCH_SIZE = 100;

export interface StoreProductRow {
  company_id: string;
  store_external_id: number;
  product_external_id: number;
  product_name: string;
  product_category: string | null;
  monthly_qty: Record<string, number>;
  monthly_sales: Record<string, number>;
  total_qty: number;
  total_sales: number;
}

/**
 * Get all store products for a company (for merge logic). Always filters by company_id.
 */
export async function getStoreProductsByCompany(
  supabase: SupabaseClient,
  companyId: string,
) {
  const { data, error } = await supabase
    .from("store_products")
    .select("*")
    .eq("company_id", companyId);

  if (error) throw error;
  return data ?? [];
}

/**
 * Get store products for a given store. Always filters by company_id.
 */
export async function getStoreProductsByStore(
  supabase: SupabaseClient,
  companyId: string,
  storeExternalId: string,
) {
  const { data, error } = await supabase
    .from("store_products")
    .select(
      "product_external_id, product_name, product_category, monthly_qty, monthly_sales, total_qty, total_sales",
    )
    .eq("company_id", companyId)
    .eq("store_external_id", storeExternalId)
    .order("total_qty", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Replace all store products for a company, then upsert the given rows.
 * Rows must include company_id (from auth, never from client).
 */
export async function upsertStoreProducts(
  supabase: SupabaseClient,
  companyId: string,
  rows: StoreProductRow[],
): Promise<void> {
  await supabase.from("store_products").delete().eq("company_id", companyId);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("store_products").upsert(batch, {
      onConflict: "company_id,store_external_id,product_external_id",
      ignoreDuplicates: false,
    });
    if (error) throw error;
  }
}

/**
 * Delete store products for a given store. Stub for future use.
 */
export async function deleteStoreProductsByStore(
  _supabase: SupabaseClient,
  _companyId: string,
  _storeExternalId: string,
): Promise<void> {
  // TODO: implement when needed
  throw new Error("deleteStoreProductsByStore not yet implemented");
}
