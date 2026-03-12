// ============================================================
// WEEKLY COMPARISON HOOK
// מביא ומחשב נתוני השוואה שבועית לפי חנות+מוצר
// ============================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ============================================================
// TYPES
// ============================================================

export interface TrendResult {
  pctChange: number | null;   // null = no comparison data
  direction: "up" | "down" | "stable" | "nodata";
}

export interface ProductWeekComparison {
  productName:           string;
  productNameNormalized: string;
  grossQty:              number;   // current week
  returnsQty:            number;
  returnsRate:           number;   // %
  deliveryCount:         number;
  vsLastWeek:            TrendResult;
  vs3WeekAvg:            TrendResult;
  vsLastYear:            TrendResult;
  vsBenchmark:           TrendResult;  // vs top-10 avg
  top10Benchmark:        number | null;
  lastWeekQty:           number | null;
  avgLast3WeeksQty:      number | null;
  lastYearQty:           number | null;
}

export interface StoreWeekComparison {
  storeExternalId: number;
  storeName:       string;
  products:        ProductWeekComparison[];
  totalGrossQty:   number;
  totalReturnsQty: number;
  totalDeliveries: number;
  overallTrend:    TrendResult; // store-level vs last week
}

export interface WeeklyComparisonData {
  selectedWeek:    string;         // "YYYY-MM-DD"
  availableWeeks:  string[];
  stores:          StoreWeekComparison[];
  isLoading:       boolean;
  error:           string | null;
  showExcluded:    boolean;
  setShowExcluded: (v: boolean) => void;
  selectWeek:      (w: string) => void;
  refetch:         () => void;
}

// ============================================================
// HELPERS
// ============================================================

const TREND_THRESHOLD = 3; // < 3% change = "stable"
const TOP_N_BENCHMARK = 10;
const HISTORY_WEEKS   = 56; // ~13 months for comparison

export function computeTrend(current: number, reference: number | null): TrendResult {
  if (reference === null || reference === undefined) {
    return { pctChange: null, direction: "nodata" };
  }
  if (reference === 0 && current === 0) {
    return { pctChange: 0, direction: "stable" };
  }
  if (reference === 0) {
    return { pctChange: null, direction: "up" };
  }
  const pctChange = ((current - reference) / reference) * 100;
  const direction =
    pctChange > TREND_THRESHOLD
      ? "up"
      : pctChange < -TREND_THRESHOLD
        ? "down"
        : "stable";
  return { pctChange, direction };
}

// Find the week start date that is ~52 weeks before a given date
function sameWeekLastYear(weekDate: string): string {
  const d = new Date(weekDate);
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

// ============================================================
// MAIN HOOK
// ============================================================

interface RawWeekRow {
  store_external_id:      number;
  store_name:             string;
  product_name:           string;
  product_name_normalized: string;
  week_start_date:        string;
  gross_qty:              number;
  returns_qty:            number;
  net_qty:                number;
  delivery_count:         number;
}

export function useWeeklyComparison(): WeeklyComparisonData {
  const auth      = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;

  const [rawData,        setRawData]        = useState<RawWeekRow[]>([]);
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [selectedWeek,   setSelectedWeek]   = useState<string>("");
  const [showExcluded,   setShowExcluded]   = useState(false);
  const [excludedNames,  setExcludedNames]  = useState<Set<string>>(new Set());
  const [isLoading,      setIsLoading]      = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [fetchKey,       setFetchKey]       = useState(0);

  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  // Fetch excluded product names
  useEffect(() => {
    if (!companyId) return;
    const supabase = createClient();
    supabase
      .from("products")
      .select("name")
      .eq("company_id", companyId)
      .eq("is_excluded", true)
      .then(({ data }) => {
        if (data) {
          setExcludedNames(
            new Set(data.map((p: { name: string }) => p.name.trim().toLowerCase())),
          );
        }
      });
  }, [companyId]);

  // Step 1: Fetch available weeks (no date cutoff — all historical weeks)
  useEffect(() => {
    if (!companyId) return;

    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    supabase
      .from("store_product_weekly")
      .select("week_start_date")
      .eq("company_id", companyId)
      .order("week_start_date", { ascending: false })
      .limit(5000)
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setIsLoading(false);
          setError(fetchError.message);
          return;
        }
        const weekSet = new Set<string>();
        (data ?? []).forEach((r) => weekSet.add(r.week_start_date as string));
        const weeks = Array.from(weekSet).sort((a, b) => (a > b ? -1 : 1));
        setAvailableWeeks(weeks);

        if (weeks.length > 0 && !selectedWeek) {
          setSelectedWeek(weeks[0]!);
        } else {
          setIsLoading(false);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, fetchKey]);

  // Step 2: Fetch raw data — cutoff relative to selected week, not today
  useEffect(() => {
    if (!companyId || !selectedWeek) return;

    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    // Cutoff: HISTORY_WEEKS before the selected week
    const base = new Date(selectedWeek);
    base.setDate(base.getDate() - HISTORY_WEEKS * 7);
    const cutoffStr = base.toISOString().slice(0, 10);

    supabase
      .from("store_product_weekly")
      .select(
        "store_external_id,store_name,product_name,product_name_normalized,week_start_date,gross_qty,returns_qty,net_qty,delivery_count",
      )
      .eq("company_id", companyId)
      .gte("week_start_date", cutoffStr)
      .order("week_start_date", { ascending: false })
      .then(({ data, error: fetchError }) => {
        setIsLoading(false);
        if (fetchError) {
          setError(fetchError.message);
          return;
        }
        setRawData((data ?? []) as RawWeekRow[]);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, selectedWeek, fetchKey]);

  // Compute comparison data for the selected week
  const stores = computeComparison(rawData, selectedWeek, excludedNames, showExcluded);

  return {
    selectedWeek,
    availableWeeks,
    stores,
    isLoading,
    error,
    showExcluded,
    setShowExcluded,
    selectWeek: setSelectedWeek,
    refetch,
  };
}

// ============================================================
// COMPARISON COMPUTATION
// ============================================================

function computeComparison(
  rawData:      RawWeekRow[],
  selectedWeek: string,
  excludedNames: Set<string>,
  showExcluded: boolean,
): StoreWeekComparison[] {
  if (!selectedWeek || rawData.length === 0) return [];

  // Group all data by store+product+week for fast lookup
  type SPKey = string; // `${storeId}|${productNorm}`
  type WeekMap = Map<string, RawWeekRow>; // week_start_date → row
  const index = new Map<SPKey, WeekMap>();

  for (const row of rawData) {
    const spKey = `${row.store_external_id}|${row.product_name_normalized}`;
    if (!index.has(spKey)) index.set(spKey, new Map());
    index.get(spKey)!.set(row.week_start_date, row);
  }

  // Get unique weeks sorted desc for "last week" lookup
  const wkSet = new Set<string>();
  rawData.forEach((r) => wkSet.add(r.week_start_date));
  const allWeeks = Array.from(wkSet).sort(
    (a, b) => (a > b ? -1 : 1),
  );
  const selectedIdx = allWeeks.indexOf(selectedWeek);
  const prevWeek1   = allWeeks[selectedIdx + 1] ?? null; // last week
  const prevWeek2   = allWeeks[selectedIdx + 2] ?? null;
  const prevWeek3   = allWeeks[selectedIdx + 3] ?? null;
  const lastYearTarget = sameWeekLastYear(selectedWeek);
  // Find closest stored week to last year target (within ±10 days)
  const lastYearWeek = allWeeks.find((w) => {
    const diff = Math.abs(
      new Date(w).getTime() - new Date(lastYearTarget).getTime(),
    );
    return diff <= 10 * 86400000;
  }) ?? null;

  // Get current-week rows only
  const currentWeekRows = rawData.filter(
    (r) => r.week_start_date === selectedWeek,
  );

  // Group by store
  const byStore = new Map<number, RawWeekRow[]>();
  for (const row of currentWeekRows) {
    if (!byStore.has(row.store_external_id)) byStore.set(row.store_external_id, []);
    byStore.get(row.store_external_id)!.push(row);
  }

  const result: StoreWeekComparison[] = [];

  Array.from(byStore.keys()).forEach((storeId) => {
    const storeRows = byStore.get(storeId)!;
    const storeName = storeRows[0]!.store_name;
    const products: ProductWeekComparison[] = [];

    storeRows.forEach((row) => {
      const isExcluded = excludedNames.has(row.product_name_normalized);
      if (isExcluded && !showExcluded) return;

      const spKey   = `${storeId}|${row.product_name_normalized}`;
      const weekMap = index.get(spKey) ?? new Map();

      // Historical values for this store+product
      const lw1 = weekMap.get(prevWeek1 ?? "")?.gross_qty ?? null;
      const lw2 = weekMap.get(prevWeek2 ?? "")?.gross_qty ?? null;
      const lw3 = weekMap.get(prevWeek3 ?? "")?.gross_qty ?? null;

      const avg3w =
        [lw1, lw2, lw3].filter((v) => v !== null).length > 0
          ? ([lw1, lw2, lw3].filter((v) => v !== null) as number[]).reduce(
              (s, v) => s + v,
              0,
            ) /
            ([lw1, lw2, lw3].filter((v) => v !== null) as number[]).length
          : null;

      const lastYearQty = lastYearWeek
        ? (weekMap.get(lastYearWeek)?.gross_qty ?? null)
        : null;

      // Top-10 benchmark: last 52 weeks sorted desc
      const top10 = Array.from(weekMap.values())
        .filter((r) => r.week_start_date < selectedWeek) // only historical
        .map((r) => r.gross_qty)
        .sort((a, b) => b - a)
        .slice(0, TOP_N_BENCHMARK);
      const top10Benchmark =
        top10.length > 0
          ? top10.reduce((s, v) => s + v, 0) / top10.length
          : null;

      const returnsRate =
        row.gross_qty > 0
          ? (row.returns_qty / row.gross_qty) * 100
          : 0;

      products.push({
        productName:           row.product_name,
        productNameNormalized: row.product_name_normalized,
        grossQty:              row.gross_qty,
        returnsQty:            row.returns_qty,
        returnsRate,
        deliveryCount:         row.delivery_count,
        vsLastWeek:            computeTrend(row.gross_qty, lw1),
        vs3WeekAvg:            computeTrend(row.gross_qty, avg3w),
        vsLastYear:            computeTrend(row.gross_qty, lastYearQty),
        vsBenchmark:           computeTrend(row.gross_qty, top10Benchmark),
        top10Benchmark,
        lastWeekQty:           lw1,
        avgLast3WeeksQty:      avg3w,
        lastYearQty,
      });
    });

    if (products.length === 0) return;

    const totalGrossQty   = products.reduce((s, p) => s + p.grossQty,   0);
    const totalReturnsQty = products.reduce((s, p) => s + p.returnsQty, 0);
    const totalDeliveries = products.reduce((s, p) => s + p.deliveryCount, 0);

    // Store-level trend: compare total gross qty vs last week
    const lastWeekStoreTotal =
      prevWeek1
        ? rawData
            .filter(
              (r) =>
                r.store_external_id === storeId &&
                r.week_start_date === prevWeek1,
            )
            .reduce((s, r) => s + r.gross_qty, 0)
        : null;

    result.push({
      storeExternalId: storeId,
      storeName,
      products:        products.sort((a, b) => b.grossQty - a.grossQty),
      totalGrossQty,
      totalReturnsQty,
      totalDeliveries,
      overallTrend:    computeTrend(totalGrossQty, lastWeekStoreTotal || null),
    });
  });

  // Sort stores by name
  return result.sort((a, b) => a.storeName.localeCompare(b.storeName, "he"));
}
