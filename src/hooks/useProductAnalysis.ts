"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { computeTrend, type TrendResult } from "@/hooks/useWeeklyComparison";

const HISTORY_WEEKS  = 56;
const TOP_N          = 10;
const TREND_STABLE   = 3; // % threshold

// ============================================================
// TYPES
// ============================================================

export interface StoreProductStat {
  storeExternalId: number;
  storeName:       string;
  grossQty:        number;
  returnsQty:      number;
  returnsRate:     number;
  deliveryCount:   number;
  vsLastWeek:      TrendResult;
  vs3WeekAvg:      TrendResult;
  vsLastYear:      TrendResult;
  vsBenchmark:     TrendResult;
  top10Benchmark:  number | null;
  lastWeekQty:     number | null;
}

export interface ProductOption {
  name:           string;
  nameNormalized: string;
}

interface RawRow {
  store_external_id:       number;
  store_name:              string;
  week_start_date:         string;
  gross_qty:               number;
  returns_qty:             number;
  delivery_count:          number;
  product_name:            string;
  product_name_normalized: string;
}

// ============================================================
// HELPERS
// ============================================================

function weeksBefore(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - n * 7);
  return d.toISOString().slice(0, 10);
}

function sameWeekLastYear(dateStr: string): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

// ============================================================
// HOOK: available products for a week
// ============================================================

export function useAvailableProducts(
  selectedWeek: string,
): { products: ProductOption[]; isLoading: boolean } {
  const auth      = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;

  const [products,  setProducts]  = useState<ProductOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!companyId || !selectedWeek) return;
    const supabase = createClient();
    setIsLoading(true);

    supabase
      .from("store_product_weekly")
      .select("product_name,product_name_normalized")
      .eq("company_id", companyId)
      .eq("week_start_date", selectedWeek)
      .order("product_name", { ascending: true })
      .then(({ data }) => {
        setIsLoading(false);
        if (!data) return;
        const seen = new Set<string>();
        const list: ProductOption[] = [];
        data.forEach((r) => {
          if (!seen.has(r.product_name_normalized)) {
            seen.add(r.product_name_normalized);
            list.push({ name: r.product_name, nameNormalized: r.product_name_normalized });
          }
        });
        setProducts(list);
      });
  }, [companyId, selectedWeek]);

  return { products, isLoading };
}

// ============================================================
// HOOK: product analysis across stores
// ============================================================

export function useProductAnalysis(
  selectedWeek: string,
  productNameNormalized: string,
) {
  const auth      = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;

  const [stores,    setStores]    = useState<StoreProductStat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !selectedWeek || !productNameNormalized) return;

    const supabase  = createClient();
    const cutoff    = weeksBefore(selectedWeek, HISTORY_WEEKS);

    setIsLoading(true);
    setError(null);

    supabase
      .from("store_product_weekly")
      .select(
        "store_external_id,store_name,week_start_date,gross_qty,returns_qty,delivery_count,product_name,product_name_normalized",
      )
      .eq("company_id", companyId)
      .eq("product_name_normalized", productNameNormalized)
      .gte("week_start_date", cutoff)
      .order("week_start_date", { ascending: false })
      .then(({ data, error: fetchError }) => {
        setIsLoading(false);
        if (fetchError) { setError(fetchError.message); return; }

        const rows = (data ?? []) as RawRow[];
        setStores(computeStores(rows, selectedWeek));
      });
  }, [companyId, selectedWeek, productNameNormalized]);

  return { stores, isLoading, error };
}

// ============================================================
// COMPUTE STORE STATS
// ============================================================

function computeStores(
  rows: RawRow[],
  selectedWeek: string,
): StoreProductStat[] {
  // Group by store
  const byStore = new Map<number, RawRow[]>();
  rows.forEach((r) => {
    if (!byStore.has(r.store_external_id)) byStore.set(r.store_external_id, []);
    byStore.get(r.store_external_id)!.push(r);
  });

  const prevWeek1  = weeksBefore(selectedWeek, 1);
  const prevWeek2  = weeksBefore(selectedWeek, 2);
  const prevWeek3  = weeksBefore(selectedWeek, 3);
  const lyTarget   = sameWeekLastYear(selectedWeek);

  const result: StoreProductStat[] = [];

  Array.from(byStore.keys()).forEach((storeId) => {
    const storeRows = byStore.get(storeId)!;

    // Build week → row map for this store
    const weekMap = new Map<string, RawRow>();
    storeRows.forEach((r) => weekMap.set(r.week_start_date, r));

    const current = weekMap.get(selectedWeek);
    if (!current) return; // store has no data for selected week

    const lw1    = weekMap.get(prevWeek1)?.gross_qty ?? null;
    const lw2    = weekMap.get(prevWeek2)?.gross_qty ?? null;
    const lw3    = weekMap.get(prevWeek3)?.gross_qty ?? null;
    const nonNull = [lw1, lw2, lw3].filter((v) => v !== null) as number[];
    const avg3w  = nonNull.length > 0
      ? nonNull.reduce((s, v) => s + v, 0) / nonNull.length
      : null;

    // Same week last year (closest within ±10 days)
    const lyWeek = Array.from(weekMap.keys())
      .filter((w) => w < selectedWeek)
      .sort((a, b) => {
        const da = Math.abs(new Date(a).getTime() - new Date(lyTarget).getTime());
        const db = Math.abs(new Date(b).getTime() - new Date(lyTarget).getTime());
        return da - db;
      })
      .find((w) => Math.abs(new Date(w).getTime() - new Date(lyTarget).getTime()) <= 10 * 86400000);

    const lastYearQty = lyWeek ? (weekMap.get(lyWeek)?.gross_qty ?? null) : null;

    // Top-10 benchmark (historical, excluding current week)
    const historical = storeRows
      .filter((r) => r.week_start_date < selectedWeek)
      .map((r) => r.gross_qty)
      .sort((a, b) => b - a)
      .slice(0, TOP_N);
    const top10Benchmark = historical.length > 0
      ? historical.reduce((s, v) => s + v, 0) / historical.length
      : null;

    const grossQty   = current.gross_qty;
    const returnsQty = current.returns_qty;
    const returnsRate = grossQty > 0 ? (returnsQty / grossQty) * 100 : 0;

    result.push({
      storeExternalId: storeId,
      storeName:       current.store_name,
      grossQty,
      returnsQty,
      returnsRate,
      deliveryCount:   current.delivery_count,
      vsLastWeek:      computeTrend(grossQty, lw1),
      vs3WeekAvg:      computeTrend(grossQty, avg3w),
      vsLastYear:      computeTrend(grossQty, lastYearQty),
      vsBenchmark:     computeTrend(grossQty, top10Benchmark),
      top10Benchmark,
      lastWeekQty:     lw1,
    });
  });

  return result.sort((a, b) => b.grossQty - a.grossQty);
}

export { TREND_STABLE };
