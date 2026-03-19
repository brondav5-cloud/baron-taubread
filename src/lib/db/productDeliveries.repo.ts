// ============================================================
// PRODUCT DELIVERIES REPOSITORY
// DB operations for store_product_weekly table
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AggregatedWeeklyRecord } from "@/types/productDeliveries";

const UPSERT_CHUNK_SIZE = 500;

// ============================================================
// DELETE EXISTING WEEKLY RECORDS FOR A PERIOD
// Called on the first chunk to clear stale data before re-inserting.
// ============================================================

export async function deleteWeeklyRecordsForPeriod(
  supabase: SupabaseClient,
  companyId: string,
  periodStart: string,
  periodEnd: string,
): Promise<{ success: boolean; deleted: number; error?: string }> {
  const { count, error } = await supabase
    .from("store_product_weekly")
    .delete({ count: "exact" })
    .eq("company_id", companyId)
    .gte("week_start_date", periodStart)
    .lte("week_start_date", periodEnd);

  if (error) {
    return { success: false, deleted: 0, error: error.message };
  }
  return { success: true, deleted: count ?? 0 };
}

// ============================================================
// UPSERT WEEKLY RECORDS
// ============================================================

export async function upsertWeeklyRecords(
  supabase: SupabaseClient,
  companyId: string,
  records: AggregatedWeeklyRecord[],
): Promise<{ success: boolean; upserted: number; error?: string }> {
  if (records.length === 0) return { success: true, upserted: 0 };

  let upserted = 0;

  for (let i = 0; i < records.length; i += UPSERT_CHUNK_SIZE) {
    const batch = records.slice(i, i + UPSERT_CHUNK_SIZE);

    const rows = batch.map((r) => ({
      company_id:             companyId,
      store_external_id:      r.storeExternalId,
      store_name:             r.storeName,
      product_name:           r.productName,
      product_name_normalized: r.productNameNormalized,
      week_start_date:        r.weekStartDate,
      year:                   r.year,
      month:                  r.month,
      gross_qty:              r.grossQty,
      returns_qty:            r.returnsQty,
      net_qty:                r.netQty,
      delivery_count:         r.deliveryCount,
      total_value:            r.totalValue ?? 0,
      updated_at:             new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("store_product_weekly")
      .upsert(rows, {
        onConflict: "company_id,store_external_id,product_name_normalized,week_start_date",
        ignoreDuplicates: false,
      });

    if (error) {
      return { success: false, upserted, error: error.message };
    }

    upserted += batch.length;
  }

  return { success: true, upserted };
}

// ============================================================
// SPOT-CHECK: verify totals saved to DB for a period
// Used after last chunk to confirm data integrity.
// ============================================================

export async function verifyProductDeliveryTotals(
  supabase: SupabaseClient,
  companyId: string,
  periodStart: string,
  periodEnd: string,
): Promise<{
  dbStoresCount: number;
  dbTotalGrossQty: number;
  dbTotalReturnsQty: number;
  dbRecordsCount: number;
}> {
  // Use a server-side aggregate RPC — no row-limit issues, DB does the SUM.
  const { data, error } = await supabase.rpc("verify_weekly_upload", {
    p_company_id:   companyId,
    p_period_start: periodStart,
    p_period_end:   periodEnd,
  });

  if (error || !data) {
    console.error("[verifyProductDeliveryTotals] RPC error:", error?.message);
    return { dbStoresCount: 0, dbTotalGrossQty: 0, dbTotalReturnsQty: 0, dbRecordsCount: 0 };
  }

  const result = data as {
    total_gross_qty:   number;
    total_returns_qty: number;
    records_count:     number;
    stores_count:      number;
  };

  return {
    dbStoresCount:     result.stores_count     ?? 0,
    dbTotalGrossQty:   result.total_gross_qty   ?? 0,
    dbTotalReturnsQty: result.total_returns_qty ?? 0,
    dbRecordsCount:    result.records_count     ?? 0,
  };
}

// ============================================================
// LOG UPLOAD
// ============================================================

interface UploadLogInput {
  filename:          string;
  uploaded_by:       string;
  period_start:      string;
  period_end:        string;
  weeks_count:       number;
  rows_processed:    number;
  rows_skipped:      number;
  stores_count:      number;
  products_count:    number;
  total_gross_qty:   number;
  total_returns_qty: number;
  delivery_events:   number;
  status:            "completed" | "failed";
  error_message:     string | null;
  processing_time_ms: number;
}

export async function createProductDeliveryUpload(
  supabase: SupabaseClient,
  companyId: string,
  input: UploadLogInput,
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("product_delivery_uploads")
    .insert({
      company_id: companyId,
      ...input,
      period_start: input.period_start || null,
      period_end:   input.period_end   || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[productDeliveries.repo] createUpload error:", error);
    return null;
  }

  return data;
}

// ============================================================
// FETCH WEEKLY DATA FOR A STORE (for weekly comparison page)
// ============================================================

export async function getStoreWeeklyData(
  supabase: SupabaseClient,
  companyId: string,
  storeExternalId: number,
  weeksBack = 56, // ~13 months
) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weeksBack * 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("store_product_weekly")
    .select("*")
    .eq("company_id", companyId)
    .eq("store_external_id", storeExternalId)
    .gte("week_start_date", cutoffStr)
    .order("week_start_date", { ascending: false });

  return { data: data ?? [], error };
}

// ============================================================
// FETCH ALL WEEKLY DATA FOR COMPARISON VIEW
// ============================================================

export async function getWeeklyComparisonData(
  supabase: SupabaseClient,
  companyId: string,
  weeksBack = 56,
) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weeksBack * 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("store_product_weekly")
    .select("*")
    .eq("company_id", companyId)
    .gte("week_start_date", cutoffStr)
    .order("week_start_date", { ascending: false });

  return { data: data ?? [], error };
}

// ============================================================
// GET AVAILABLE WEEKS
// ============================================================

export async function getAvailableWeeks(
  supabase: SupabaseClient,
  companyId: string,
  limit = 52, // up to 52 most recent weeks
): Promise<string[]> {
  // No date cutoff — return all weeks ever uploaded for this company
  const { data } = await supabase
    .from("store_product_weekly")
    .select("week_start_date")
    .eq("company_id", companyId)
    .order("week_start_date", { ascending: false })
    .limit(limit * 100); // fetch extra rows to deduplicate

  if (!data) return [];
  const uniqueSet = new Set<string>();
  data.forEach((r) => uniqueSet.add(r.week_start_date as string));
  return Array.from(uniqueSet).slice(0, limit);
}
