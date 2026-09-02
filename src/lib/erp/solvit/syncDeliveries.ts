import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  deleteDailyForPeriod,
  deleteMonthlyDistForPeriod,
  deleteWeeklyRecordsForPeriod,
  upsertDailyRecords,
  upsertMonthlyDistRecords,
  upsertWeeklyRecords,
} from "@/lib/db/productDeliveries.repo";
import { deleteDeliveriesForPeriod, upsertDeliveries } from "@/lib/db/deliveries.repo";
import { syncCatalogFromMonthlyDist } from "@/lib/db/syncCatalogFromDist";
import { fetchAllPages } from "./client";
import { normalizeErpName } from "./mapEntities";
import type {
  AggregatedWeeklyRecord,
  DailyDeliveryRecord,
  MonthlyDistRecord,
} from "@/types/productDeliveries";
import type { AggregatedDelivery } from "@/types/deliveries";

export interface SolvitDocItem {
  doc_date?: string;
  doc_id?: number;
  entity_id?: number;
  product_id?: number;
  product_name?: string;
  quantity?: number;
  returns?: number;
  unit_price?: number;
}

export function jerusalemToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function parseYmd(ymd: string): { y: number; m: number; d: number } {
  const parts = ymd.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  return {
    y: Number.isFinite(y) ? y : 1970,
    m: Number.isFinite(m) ? m : 1,
    d: Number.isFinite(d) ? d : 1,
  };
}

export function addDaysIso(ymd: string, days: number): string {
  const { y, m, d } = parseYmd(ymd);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function monthStart(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

export function monthEnd(ymd: string): string {
  const { y, m } = parseYmd(monthStart(ymd));
  const last = new Date(Date.UTC(y, m, 0));
  return last.toISOString().slice(0, 10);
}

function monthsInRange(fromDate: string, toDate: string): string[] {
  const out: string[] = [];
  let cursor = monthStart(fromDate);
  const last = monthStart(toDate);
  while (cursor <= last) {
    out.push(cursor);
    const { y, m } = parseYmd(cursor);
    cursor = monthStart(addDaysIso(`${y}-${String(m).padStart(2, "0")}-28`, 8));
  }
  return out;
}

export function sundayWeekStart(ymd: string): string {
  const { y, m, d } = parseYmd(ymd);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - dt.getUTCDay());
  return dt.toISOString().slice(0, 10);
}

export function isoWeekNumber(ymd: string): number {
  const { y, m, d } = parseYmd(ymd);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function rangeForLookbackDays(days: number): { from: string; to: string } {
  const to = jerusalemToday();
  const rawFrom = addDaysIso(to, -Math.max(1, days) + 1);
  return { from: monthStart(rawFrom), to };
}

export function rangeForNightlyCron(): { from: string; to: string } {
  const to = jerusalemToday();
  const day = Number(to.slice(8, 10));
  const currentMonth = monthStart(to);
  const from = day <= 7 ? monthStart(addDaysIso(currentMonth, -1)) : currentMonth;
  return { from, to };
}

function asNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function aggregateDeliveryItems(
  items: SolvitDocItem[],
  storeNames: Map<number, string>,
): {
  weekly: AggregatedWeeklyRecord[];
  daily: DailyDeliveryRecord[];
  dist: MonthlyDistRecord[];
  storeDeliveries: AggregatedDelivery[];
} {
  const weeklyMap = new Map<
    string,
    AggregatedWeeklyRecord & { dates: Set<string> }
  >();
  const dailyMap = new Map<string, DailyDeliveryRecord & { dates: Set<string> }>();
  const distMap = new Map<string, MonthlyDistRecord & { dates: Set<string> }>();
  const storeWeekMap = new Map<
    string,
    {
      storeExternalId: number;
      storeName: string;
      year: number;
      month: number;
      week: number;
      dates: Set<string>;
      totalQuantity: number;
      totalValue: number;
    }
  >();

  for (const item of items) {
    const storeId = Number(item.entity_id);
    const productName = String(item.product_name ?? "").trim();
    const docDate = String(item.doc_date ?? "").slice(0, 10);
    if (!Number.isFinite(storeId) || storeId <= 0 || !productName || !/^\d{4}-\d{2}-\d{2}$/.test(docDate)) {
      continue;
    }
    const gross = asNum(item.quantity);
    const returnsQty = asNum(item.returns);
    const net = gross - returnsQty;
    const value = net * asNum(item.unit_price);
    const year = Number(docDate.slice(0, 4));
    const month = Number(docDate.slice(5, 7));
    const weekStart = sundayWeekStart(docDate);
    const weekYear = Number(weekStart.slice(0, 4));
    const weekMonth = Number(weekStart.slice(5, 7));
    const dayOfWeek = new Date(`${docDate}T00:00:00Z`).getUTCDay() + 1;
    const normalized = normalizeErpName(productName);
    const storeName = storeNames.get(storeId) ?? String(storeId);

    const weekKey = `${storeId}|${normalized}|${weekStart}`;
    const weekRow = weeklyMap.get(weekKey);
    if (weekRow) {
      weekRow.grossQty += gross;
      weekRow.returnsQty += returnsQty;
      weekRow.netQty += net;
      weekRow.totalValue += value;
      if (gross > 0) weekRow.dates.add(docDate);
    } else {
      weeklyMap.set(weekKey, {
        storeExternalId: storeId,
        storeName,
        productName,
        productNameNormalized: normalized,
        weekStartDate: weekStart,
        year: weekYear,
        month: weekMonth,
        grossQty: gross,
        returnsQty: returnsQty,
        netQty: net,
        deliveryCount: 0,
        totalValue: value,
        dates: new Set(gross > 0 ? [docDate] : []),
      });
    }

    const dailyKey = `${weekKey}|${dayOfWeek}`;
    const dailyRow = dailyMap.get(dailyKey);
    if (dailyRow) {
      dailyRow.grossQty += gross;
      dailyRow.returnsQty += returnsQty;
      dailyRow.netQty += net;
      if (gross > 0) dailyRow.dates.add(docDate);
    } else {
      dailyMap.set(dailyKey, {
        storeExternalId: storeId,
        storeName,
        productName,
        productNameNormalized: normalized,
        weekStartDate: weekStart,
        dayOfWeek,
        year: weekYear,
        month: weekMonth,
        grossQty: gross,
        returnsQty: returnsQty,
        netQty: net,
        deliveryCount: 0,
        dates: new Set(gross > 0 ? [docDate] : []),
      });
    }

    const distKey = `${storeId}|${normalized}|${year}|${month}`;
    const distRow = distMap.get(distKey);
    if (distRow) {
      distRow.grossQty += gross;
      distRow.returnsQty += returnsQty;
      distRow.netQty += net;
      distRow.totalValue += value;
      if (gross > 0) distRow.dates.add(docDate);
    } else {
      distMap.set(distKey, {
        storeExternalId: storeId,
        storeName,
        productName,
        productNameNormalized: normalized,
        year,
        month,
        grossQty: gross,
        returnsQty: returnsQty,
        netQty: net,
        totalValue: value,
        deliveryCount: 0,
        dates: new Set(gross > 0 ? [docDate] : []),
      });
    }

    const storeWeekKey = `${storeId}|${weekStart}`;
    const sw = storeWeekMap.get(storeWeekKey);
    if (sw) {
      sw.totalQuantity += net;
      sw.totalValue += value;
      if (gross > 0) sw.dates.add(docDate);
    } else {
      storeWeekMap.set(storeWeekKey, {
        storeExternalId: storeId,
        storeName,
        year: weekYear,
        month: weekMonth,
        week: isoWeekNumber(weekStart),
        dates: new Set(gross > 0 ? [docDate] : []),
        totalQuantity: net,
        totalValue: value,
      });
    }
  }

  const weekly = Array.from(weeklyMap.values()).map(({ dates, ...row }) => ({
    ...row,
    deliveryCount: dates.size,
  }));
  const daily = Array.from(dailyMap.values()).map(({ dates, ...row }) => ({
    ...row,
    deliveryCount: dates.size,
  }));
  const dist = Array.from(distMap.values()).map(({ dates, ...row }) => ({
    ...row,
    deliveryCount: dates.size,
  }));

  const storeDeliveries: AggregatedDelivery[] = [];
  const monthMap = new Map<
    string,
    {
      storeExternalId: number;
      storeName: string;
      year: number;
      month: number;
      dates: Set<string>;
      totalQuantity: number;
      totalValue: number;
    }
  >();
  Array.from(storeWeekMap.values()).forEach((sw) => {
    storeDeliveries.push({
      storeExternalId: sw.storeExternalId,
      storeName: sw.storeName,
      year: sw.year,
      month: sw.month,
      week: sw.week,
      deliveriesCount: sw.dates.size,
      totalValue: sw.totalValue,
      totalQuantity: sw.totalQuantity,
    });
    const mk = `${sw.storeExternalId}|${sw.year}|${sw.month}`;
    const monthRow = monthMap.get(mk);
    if (monthRow) {
      sw.dates.forEach((d: string) => monthRow.dates.add(d));
      monthRow.totalQuantity += sw.totalQuantity;
      monthRow.totalValue += sw.totalValue;
    } else {
      monthMap.set(mk, {
        storeExternalId: sw.storeExternalId,
        storeName: sw.storeName,
        year: sw.year,
        month: sw.month,
        dates: new Set(sw.dates),
        totalQuantity: sw.totalQuantity,
        totalValue: sw.totalValue,
      });
    }
  });
  Array.from(monthMap.values()).forEach((sm) => {
    storeDeliveries.push({
      storeExternalId: sm.storeExternalId,
      storeName: sm.storeName,
      year: sm.year,
      month: sm.month,
      week: null,
      deliveriesCount: sm.dates.size,
      totalValue: sm.totalValue,
      totalQuantity: sm.totalQuantity,
    });
  });

  return { weekly, daily, dist, storeDeliveries };
}

async function writeMonth(
  companyId: string,
  storeNames: Map<number, string>,
  monthFrom: string,
  monthTo: string,
): Promise<{ items: number; weekly: number; daily: number; dist: number; stores: number }> {
  const fetchFrom = sundayWeekStart(monthFrom);
  const items = await fetchAllPages<SolvitDocItem>(
    "/mcp/documents/items",
    {
      doc_type: "delivery",
      from_date: fetchFrom,
      to_date: monthTo,
      status: "all",
    },
    500,
    200,
    true,
  );

  const agg = aggregateDeliveryItems(items, storeNames);
  const admin = getSupabaseAdmin();
  const yFrom = Number(monthFrom.slice(0, 4)) * 100 + Number(monthFrom.slice(5, 7));
  const yTo = Number(monthTo.slice(0, 4)) * 100 + Number(monthTo.slice(5, 7));

  const weeklyDel = await deleteWeeklyRecordsForPeriod(admin, companyId, fetchFrom, monthTo);
  if (!weeklyDel.success) throw new Error(weeklyDel.error || "weekly delete failed");
  const dailyDel = await deleteDailyForPeriod(admin, companyId, fetchFrom, monthTo);
  if (!dailyDel.success) throw new Error(dailyDel.error || "daily delete failed");
  const distDel = await deleteMonthlyDistForPeriod(admin, companyId, yFrom, yTo);
  if (!distDel.success) throw new Error(distDel.error || "dist delete failed");
  const storeDel = await deleteDeliveriesForPeriod(admin, companyId, monthFrom, monthTo);
  if (!storeDel.success) throw new Error(storeDel.error || "store deliveries delete failed");

  const weeklyUp = await upsertWeeklyRecords(admin, companyId, agg.weekly);
  if (!weeklyUp.success) throw new Error(weeklyUp.error || "weekly upsert failed");
  const dailyUp = await upsertDailyRecords(admin, companyId, agg.daily);
  if (!dailyUp.success) throw new Error(dailyUp.error || "daily upsert failed");
  const distUp = await upsertMonthlyDistRecords(admin, companyId, agg.dist);
  if (!distUp.success) throw new Error(distUp.error || "dist upsert failed");
  const storeUp = await upsertDeliveries(admin, companyId, agg.storeDeliveries);
  if (!storeUp.success) throw new Error(storeUp.error || "store deliveries upsert failed");

  if (agg.dist.length) {
    const catalog = await syncCatalogFromMonthlyDist(admin, companyId, { from: yFrom, to: yTo });
    if (!catalog.ok) throw new Error(catalog.error || "catalog sync failed");
  }

  return {
    items: items.length,
    weekly: agg.weekly.length,
    daily: agg.daily.length,
    dist: agg.dist.length,
    stores: new Set(agg.weekly.map((r) => r.storeExternalId)).size,
  };
}

export async function syncErpDeliveries(
  companyId: string,
  fromDate: string,
  toDate: string,
): Promise<{
  items: number;
  weekly: number;
  daily: number;
  dist: number;
  stores: number;
  from: string;
  to: string;
}> {
  const admin = getSupabaseAdmin();
  const { data: clients } = await admin
    .from("erp_clients")
    .select("erp_id, client_name")
    .eq("company_id", companyId);
  const storeNames = new Map(
    (clients ?? []).map((c) => [c.erp_id as number, String(c.client_name)]),
  );

  let items = 0;
  let weekly = 0;
  let daily = 0;
  let dist = 0;
  let stores = 0;

  const months = monthsInRange(fromDate, toDate).reverse();
  for (const month of months) {
    const start = month < fromDate ? fromDate : month;
    const end = monthEnd(month);
    const monthTo = end < toDate ? end : toDate;
    const part = await writeMonth(companyId, storeNames, monthStart(start), monthTo);
    items += part.items;
    weekly += part.weekly;
    daily += part.daily;
    dist += part.dist;
    if (part.stores > stores) stores = part.stores;
  }

  const now = new Date().toISOString();
  await admin
    .from("erp_connections")
    .update({ last_catalog_sync_at: now, last_ok_at: now, last_error: null, updated_at: now })
    .eq("company_id", companyId);

  return { items, weekly, daily, dist, stores, from: fromDate, to: toDate };
}
