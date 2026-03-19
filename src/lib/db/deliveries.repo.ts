// ============================================
// DELIVERIES REPOSITORY - Supabase CRUD
// ============================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type {
  AggregatedDelivery,
  DbStoreDelivery,
  DbDeliveryUpload,
  StoreDeliverySummary,
} from "@/types/deliveries";

// ============================================
// READ OPERATIONS
// ============================================

export async function getStoreDeliveries(
  companyId: string,
  storeExternalId?: number,
  yearMonth?: { year: number; month: number },
): Promise<DbStoreDelivery[]> {
  const supabase = createClient();
  let query = supabase
    .from("store_deliveries")
    .select("*")
    .eq("company_id", companyId)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .order("week", { ascending: false, nullsFirst: false });

  if (storeExternalId) {
    query = query.eq("store_external_id", storeExternalId);
  }
  if (yearMonth) {
    query = query.eq("year", yearMonth.year).eq("month", yearMonth.month);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[deliveries.repo] getStoreDeliveries:", error);
    return [];
  }
  const rows = data || [];
  // Handle total_quantity for existing rows that might not have it
  return rows.map((r) => ({
    ...r,
    total_quantity: r.total_quantity ?? 0,
  }));
}

export async function getDeliverySummaryByStore(
  companyId: string,
): Promise<StoreDeliverySummary[]> {
  const deliveries = await getStoreDeliveries(companyId);
  return calculateStoreSummaries(deliveries);
}

/**
 * Get deliveries count per store per period.
 * periods: ["202601", "202602", ...] (YYYYMM format)
 * Uses monthly records (week=null) from store_deliveries.
 */
export async function getDeliveriesByPeriod(
  companyId: string,
  periods: string[],
): Promise<
  Array<{ store_external_id: number; period: string; deliveries_count: number }>
> {
  if (periods.length === 0) return [];
  const supabase = createClient();
  const periodSet = new Set(periods);
  const { data, error } = await supabase
    .from("store_deliveries")
    .select("store_external_id, year, month, deliveries_count")
    .eq("company_id", companyId)
    .is("week", null);
  if (error) {
    console.error("[deliveries.repo] getDeliveriesByPeriod:", error);
    return [];
  }
  return (data || [])
    .map((r) => {
      const period = `${r.year}${String(r.month).padStart(2, "0")}`;
      return {
        store_external_id: r.store_external_id,
        period,
        deliveries_count: r.deliveries_count ?? 0,
      };
    })
    .filter((r) => periodSet.has(r.period));
}

export async function getDeliveryUploads(
  companyId: string,
): Promise<DbDeliveryUpload[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("delivery_uploads")
    .select("*")
    .eq("company_id", companyId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.error("[deliveries.repo] getDeliveryUploads:", error);
    return [];
  }
  return data || [];
}

// ============================================
// WRITE OPERATIONS
// ============================================

export async function deleteDeliveriesForPeriod(
  supabase: SupabaseClient,
  companyId: string,
  periodStart: string,
  periodEnd: string,
): Promise<{ success: boolean; error?: string }> {
  const startYear = parseInt(periodStart.slice(0, 4));
  const startMonth = parseInt(periodStart.slice(5, 7));
  const endYear = parseInt(periodEnd.slice(0, 4));
  const endMonth = parseInt(periodEnd.slice(5, 7));

  const conditions: string[] = [];
  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    conditions.push(`and(year.eq.${y},month.eq.${m})`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  if (conditions.length === 0) return { success: true };

  const { error } = await supabase
    .from("store_deliveries")
    .delete()
    .eq("company_id", companyId)
    .or(conditions.join(","));

  if (error) {
    console.error("[deliveries.repo] deleteDeliveriesForPeriod:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function upsertDeliveries(
  supabase: SupabaseClient,
  companyId: string,
  deliveries: AggregatedDelivery[],
): Promise<{ success: boolean; error?: string }> {
  const rows = deliveries.map((d) => ({
    company_id: companyId,
    store_external_id: d.storeExternalId,
    store_name: d.storeName,
    year: d.year,
    month: d.month,
    week: d.week,
    deliveries_count: d.deliveriesCount,
    total_value: d.totalValue,
    total_quantity: d.totalQuantity ?? 0,
    updated_at: new Date().toISOString(),
  }));

  // Upsert in batches of 500
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from("store_deliveries").upsert(batch, {
      onConflict: "company_id,store_external_id,year,month,week",
    });

    if (error) {
      console.error("[deliveries.repo] upsertDeliveries:", error);
      return { success: false, error: error.message };
    }
  }

  return { success: true };
}

export async function createDeliveryUpload(
  supabase: SupabaseClient,
  companyId: string,
  uploadData: Omit<DbDeliveryUpload, "id" | "company_id" | "uploaded_at">,
): Promise<DbDeliveryUpload | null> {
  const { data, error } = await supabase
    .from("delivery_uploads")
    .insert({
      company_id: companyId,
      ...uploadData,
    })
    .select()
    .single();

  if (error) {
    console.error("[deliveries.repo] createDeliveryUpload:", error);
    return null;
  }
  return data;
}

// ============================================
// CALCULATIONS
// ============================================

function sortByPeriod(a: DbStoreDelivery, b: DbStoreDelivery): number {
  if (a.year !== b.year) return b.year - a.year;
  if (a.month !== b.month) return b.month - a.month;
  const wa = a.week ?? 0;
  const wb = b.week ?? 0;
  return wb - wa;
}

function calculateStoreSummaries(
  deliveries: DbStoreDelivery[],
): StoreDeliverySummary[] {
  // Use weekly records (week !== null) for calculations
  const weeklyOnly = deliveries.filter((d) => d.week != null);
  const byStore = new Map<number, DbStoreDelivery[]>();

  for (const d of weeklyOnly) {
    const existing = byStore.get(d.store_external_id) || [];
    existing.push(d);
    byStore.set(d.store_external_id, existing);
  }

  const summaries: StoreDeliverySummary[] = [];

  Array.from(byStore.entries()).forEach(([storeId, storeDeliveries]) => {
    const sorted = storeDeliveries.sort(sortByPeriod);
    const storeName = sorted[0]?.store_name || "";

    const totalDeliveries = sorted.reduce(
      (sum, d) => sum + d.deliveries_count,
      0,
    );
    const totalValue = sorted.reduce(
      (sum, d) => sum + Number(d.total_value),
      0,
    );
    const totalQuantity = sorted.reduce(
      (sum, d) => sum + Number(d.total_quantity ?? 0),
      0,
    );
    const periodsCount = sorted.length;

    const avgDeliveriesPerMonth =
      periodsCount > 0 ? totalDeliveries / periodsCount : 0;
    const avgValuePerDelivery =
      totalDeliveries > 0 ? totalValue / totalDeliveries : 0;
    const avgValuePerMonth = periodsCount > 0 ? totalValue / periodsCount : 0;
    const avgQuantityPerMonth =
      periodsCount > 0 ? totalQuantity / periodsCount : 0;

    const lastMonth = sorted[0];
    const lastMonthDeliveries = lastMonth?.deliveries_count || 0;
    const lastMonthValue = Number(lastMonth?.total_value) || 0;
    const lastMonthQuantity = Number(lastMonth?.total_quantity ?? 0) || 0;

    summaries.push({
      storeExternalId: storeId,
      storeName,
      totalDeliveries,
      totalValue,
      totalQuantity,
      avgDeliveriesPerMonth,
      avgValuePerDelivery,
      avgValuePerMonth,
      avgQuantityPerMonth,
      lastMonthDeliveries,
      lastMonthValue,
      lastMonthQuantity,
    });
  });

  return summaries;
}
