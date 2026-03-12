// ============================================================
// PRODUCT DELIVERIES REPOSITORY
// DB operations for store_product_weekly table
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AggregatedWeeklyRecord } from "@/types/productDeliveries";

const UPSERT_CHUNK_SIZE = 500;

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
  limit = 20,
): Promise<string[]> {
  const { data } = await supabase
    .from("store_product_weekly")
    .select("week_start_date")
    .eq("company_id", companyId)
    .order("week_start_date", { ascending: false })
    .limit(limit * 50); // fetch extra to deduplicate

  if (!data) return [];
  const unique = [...new Set(data.map((r) => r.week_start_date as string))];
  return unique.slice(0, limit);
}
