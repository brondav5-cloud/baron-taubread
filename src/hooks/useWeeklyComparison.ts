// ============================================================
// WEEKLY COMPARISON HOOK
// ============================================================

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ============================================================
// TYPES
// ============================================================

export interface TrendResult {
  pctChange: number | null;
  direction: "up" | "down" | "stable" | "nodata";
}

export interface ProductWeekComparison {
  productName:           string;
  productNameNormalized: string;
  grossQty:              number;   // per-week average (or single week)
  returnsQty:            number;
  returnsRate:           number;
  deliveryCount:         number;
  vsLastWeek:            TrendResult;
  vs3WeekAvg:            TrendResult;
  vsLastYear:            TrendResult;
  vsBenchmark:           TrendResult;
  top10Benchmark:        number | null;
  lastWeekQty:           number | null;
  avgLast3WeeksQty:      number | null;
  lastYearQty:           number | null;
  isIrregular:           boolean;
  streak:                number; // +N = N weeks up in a row, -N = N weeks down, 0 = stable/nodata
  isAnomaly:             boolean;
  anomalyZScore:         number | null;
}

export interface StoreWeekComparison {
  storeExternalId: number;
  storeName:       string;
  products:        ProductWeekComparison[];
  totalGrossQty:   number;
  totalReturnsQty: number;
  totalDeliveries: number;
  overallTrend:    TrendResult;
}

export interface WeeklyComparisonData {
  selectedWeek:     string;
  availableWeeks:   string[];
  stores:           StoreWeekComparison[];
  isLoading:        boolean;
  error:            string | null;
  excludedFilter:     "hide" | "show" | "only";
  setExcludedFilter:  (v: "hide" | "show" | "only") => void;
  showIrregular:    boolean;
  setShowIrregular: (v: boolean) => void;
  weeksCount:       number;
  setWeeksCount:    (n: number) => void;
  selectWeek:       (w: string) => void;
  refetch:          () => void;
  toggleIrregular:  (productNameNormalized: string) => Promise<void>;
  irregularNames:   Set<string>;
  holidayWeeks:     Map<string, string>;           // week_date → holiday_name
  toggleHoliday:    (weekDate: string) => Promise<void>;
}

// ============================================================
// HELPERS
// ============================================================

const TREND_THRESHOLD = 3;
const TOP_N_BENCHMARK = 10;
const HISTORY_WEEKS   = 56;

export function computeTrend(current: number, reference: number | null): TrendResult {
  if (reference === null || reference === undefined) {
    return { pctChange: null, direction: "nodata" };
  }
  if (reference === 0 && current === 0) return { pctChange: 0, direction: "stable" };
  if (reference === 0) return { pctChange: null, direction: "up" };
  const pctChange = ((current - reference) / reference) * 100;
  const direction =
    pctChange > TREND_THRESHOLD ? "up" : pctChange < -TREND_THRESHOLD ? "down" : "stable";
  return { pctChange, direction };
}

function sameWeekLastYear(weekDate: string): string {
  const d = new Date(weekDate);
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

// Count consecutive weeks with the same trend direction (streak)
function computeStreak(
  weekMap:          Map<string, { gross_qty: number }>,
  allWeeks:         string[],
  selectedIdx:      number,
  currentDirection: "up" | "down" | "stable" | "nodata",
): number {
  if (currentDirection === "nodata" || currentDirection === "stable") return 0;
  let count = 1;
  for (let i = selectedIdx + 1; i + 1 < allWeeks.length && count < 12; i++) {
    const w    = allWeeks[i]!;
    const prev = allWeeks[i + 1];
    if (!prev) break;
    const curQty  = weekMap.get(w)?.gross_qty ?? null;
    const prevQty = weekMap.get(prev)?.gross_qty ?? null;
    if (curQty === null || prevQty === null) break;
    const t = computeTrend(curQty, prevQty);
    if (t.direction === currentDirection) { count++; } else { break; }
  }
  return currentDirection === "down" ? -count : count;
}

// ============================================================
// MAIN HOOK
// ============================================================

interface RawWeekRow {
  store_external_id:       number;
  store_name:              string;
  product_name:            string;
  product_name_normalized: string;
  week_start_date:         string;
  gross_qty:               number;
  returns_qty:             number;
  net_qty:                 number;
  delivery_count:          number;
}

export function useWeeklyComparison(): WeeklyComparisonData {
  const auth      = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;

  const [rawData,         setRawData]         = useState<RawWeekRow[]>([]);
  const [availableWeeks,  setAvailableWeeks]  = useState<string[]>([]);
  const [selectedWeek,    setSelectedWeek]    = useState<string>("");
  const [excludedFilter,  setExcludedFilter]  = useState<"hide" | "show" | "only">("hide");
  const [showIrregular,   setShowIrregular]   = useState(true);
  const [weeksCount,      setWeeksCount]      = useState(1);
  const [excludedNames,   setExcludedNames]   = useState<Set<string>>(new Set());
  const [irregularNames,  setIrregularNames]  = useState<Set<string>>(new Set());
  const [holidayWeeks,    setHolidayWeeks]    = useState<Map<string, string>>(new Map());
  const [isLoading,       setIsLoading]       = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [fetchKey,        setFetchKey]        = useState(0);

  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  useEffect(() => {
    if (!companyId) return;
    createClient()
      .from("products").select("name")
      .eq("company_id", companyId).eq("is_excluded", true)
      .then(({ data }) => {
        if (data) setExcludedNames(new Set(data.map((p: { name: string }) => p.name.trim().toLowerCase())));
      });
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    createClient()
      .from("irregular_products").select("product_name_normalized")
      .eq("company_id", companyId)
      .then(({ data }) => {
        if (data) setIrregularNames(new Set(data.map((p: { product_name_normalized: string }) => p.product_name_normalized)));
      });
  }, [companyId]);

  // Fetch holiday weeks
  useEffect(() => {
    if (!companyId) return;
    createClient()
      .from("holiday_weeks").select("week_start_date,holiday_name")
      .eq("company_id", companyId)
      .then(({ data }) => {
        if (data) {
          const m = new Map<string, string>();
          data.forEach((r: { week_start_date: string; holiday_name: string }) =>
            m.set(r.week_start_date, r.holiday_name || "חג"),
          );
          setHolidayWeeks(m);
        }
      });
  }, [companyId]);

  const toggleHoliday = useCallback(async (weekDate: string) => {
    if (!companyId) return;
    const supabase = createClient();
    if (holidayWeeks.has(weekDate)) {
      await supabase.from("holiday_weeks").delete()
        .eq("company_id", companyId).eq("week_start_date", weekDate);
      setHolidayWeeks((prev) => { const m = new Map(Array.from(prev.entries())); m.delete(weekDate); return m; });
    } else {
      const name = "חג";
      await supabase.from("holiday_weeks").insert({ company_id: companyId, week_start_date: weekDate, holiday_name: name });
      setHolidayWeeks((prev) => new Map(Array.from(prev.entries()).concat([[weekDate, name]])));
    }
  }, [companyId, holidayWeeks]);

  const toggleIrregular = useCallback(async (productNameNormalized: string) => {
    if (!companyId) return;
    const supabase = createClient();
    if (irregularNames.has(productNameNormalized)) {
      await supabase.from("irregular_products").delete()
        .eq("company_id", companyId).eq("product_name_normalized", productNameNormalized);
      setIrregularNames((prev) => { const n = new Set(prev); n.delete(productNameNormalized); return n; });
    } else {
      await supabase.from("irregular_products").insert({ company_id: companyId, product_name_normalized: productNameNormalized });
      setIrregularNames((prev) => new Set(Array.from(prev).concat(productNameNormalized)));
    }
  }, [companyId, irregularNames]);

  // Fetch available weeks
  useEffect(() => {
    if (!companyId) return;
    setIsLoading(true);
    setError(null);
    createClient()
      .from("store_product_weekly").select("week_start_date")
      .eq("company_id", companyId).order("week_start_date", { ascending: false }).limit(5000)
      .then(({ data, error: fetchError }) => {
        if (fetchError) { setIsLoading(false); setError(fetchError.message); return; }
        const weekSet = new Set<string>();
        (data ?? []).forEach((r) => weekSet.add(r.week_start_date as string));
        const weeks = Array.from(weekSet).sort((a, b) => (a > b ? -1 : 1));
        setAvailableWeeks(weeks);
        if (weeks.length > 0 && !selectedWeek) { setSelectedWeek(weeks[0]!); } else { setIsLoading(false); }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, fetchKey]);

  // Fetch raw data
  useEffect(() => {
    if (!companyId || !selectedWeek) return;
    setIsLoading(true);
    setError(null);
    const base = new Date(selectedWeek);
    base.setDate(base.getDate() - HISTORY_WEEKS * 7);
    createClient()
      .from("store_product_weekly")
      .select("store_external_id,store_name,product_name,product_name_normalized,week_start_date,gross_qty,returns_qty,net_qty,delivery_count")
      .eq("company_id", companyId).gte("week_start_date", base.toISOString().slice(0, 10))
      .order("week_start_date", { ascending: false })
      .then(({ data, error: fetchError }) => {
        setIsLoading(false);
        if (fetchError) { setError(fetchError.message); return; }
        setRawData((data ?? []) as RawWeekRow[]);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, selectedWeek, fetchKey]);

  const stores = useMemo(
    () => computeComparison(rawData, selectedWeek, weeksCount, excludedNames, irregularNames, excludedFilter, showIrregular),
    [rawData, selectedWeek, weeksCount, excludedNames, irregularNames, excludedFilter, showIrregular],
  );

  return {
    selectedWeek, availableWeeks, stores, isLoading, error,
    excludedFilter, setExcludedFilter,
    showIrregular, setShowIrregular,
    weeksCount,    setWeeksCount,
    selectWeek: setSelectedWeek,
    refetch, toggleIrregular, irregularNames,
    holidayWeeks, toggleHoliday,
  };
}

// ============================================================
// COMPARISON COMPUTATION
// ============================================================

function computeComparison(
  rawData:        RawWeekRow[],
  selectedWeek:   string,
  weeksCount:     number,
  excludedNames:  Set<string>,
  irregularNames: Set<string>,
  excludedFilter: "hide" | "show" | "only",
  showIrregular:  boolean,
): StoreWeekComparison[] {
  if (!selectedWeek || rawData.length === 0) return [];

  // Build per-store+product lookup index
  type WeekMap = Map<string, RawWeekRow>;
  const index = new Map<string, WeekMap>();
  for (const row of rawData) {
    const spKey = `${row.store_external_id}|${row.product_name_normalized}`;
    if (!index.has(spKey)) index.set(spKey, new Map());
    index.get(spKey)!.set(row.week_start_date, row);
  }

  // Sorted unique weeks desc
  const wkSet = new Set<string>();
  rawData.forEach((r) => wkSet.add(r.week_start_date));
  const allWeeks = Array.from(wkSet).sort((a, b) => (a > b ? -1 : 1));
  const selectedIdx = allWeeks.indexOf(selectedWeek);
  if (selectedIdx === -1) return [];

  // Selected period (N weeks ending at selectedWeek)
  const currentPeriodWeeks = allWeeks.slice(selectedIdx, selectedIdx + weeksCount);
  const currentPeriodSet   = new Set(currentPeriodWeeks);

  // Helper: N consecutive weeks starting at idx
  const safeSlice = (startIdx: number): string[] =>
    allWeeks.slice(startIdx, startIdx + weeksCount);

  const refWeeks1 = safeSlice(selectedIdx + weeksCount);
  const refWeeks2 = safeSlice(selectedIdx + weeksCount * 2);
  const refWeeks3 = safeSlice(selectedIdx + weeksCount * 3);

  // Last-year equivalent weeks
  const lastYearWeeks = currentPeriodWeeks
    .map((w) => {
      const target = sameWeekLastYear(w);
      return allWeeks.find((x) => Math.abs(new Date(x).getTime() - new Date(target).getTime()) <= 10 * 86400000) ?? null;
    })
    .filter((w): w is string => w !== null);

  // Aggregate current period rows by store+product (sum, then divide by weeksCount)
  interface AggRow {
    store_external_id:       number;
    store_name:              string;
    product_name:            string;
    product_name_normalized: string;
    gross_qty:               number;
    returns_qty:             number;
    delivery_count:          number;
  }

  const aggMap      = new Map<string, AggRow>();
  const weeksPerSp  = new Map<string, Set<string>>();
  for (const row of rawData) {
    if (!currentPeriodSet.has(row.week_start_date)) continue;
    const spKey = `${row.store_external_id}|${row.product_name_normalized}`;
    if (!weeksPerSp.has(spKey)) weeksPerSp.set(spKey, new Set());
    weeksPerSp.get(spKey)!.add(row.week_start_date);

    const existing = aggMap.get(spKey);
    if (existing) {
      existing.gross_qty      += row.gross_qty;
      existing.returns_qty    += row.returns_qty;
      existing.delivery_count += row.delivery_count;
    } else {
      aggMap.set(spKey, {
        store_external_id:       row.store_external_id,
        store_name:              row.store_name,
        product_name:            row.product_name,
        product_name_normalized: row.product_name_normalized,
        gross_qty:               row.gross_qty,
        returns_qty:             row.returns_qty,
        delivery_count:          row.delivery_count,
      });
    }
  }
  // Normalise to per-week average: divide by actual weeks with data (fix: was /weeksCount)
  Array.from(aggMap.values()).forEach((agg) => {
    const spKey = `${agg.store_external_id}|${agg.product_name_normalized}`;
    const actualWeeks = Math.max(1, weeksPerSp.get(spKey)?.size ?? 1);
    agg.gross_qty      = agg.gross_qty      / actualWeeks;
    agg.returns_qty    = agg.returns_qty    / actualWeeks;
    agg.delivery_count = agg.delivery_count / actualWeeks;
  });

  // Group by store
  const byStore = new Map<number, AggRow[]>();
  Array.from(aggMap.values()).forEach((agg) => {
    if (!byStore.has(agg.store_external_id)) byStore.set(agg.store_external_id, []);
    byStore.get(agg.store_external_id)!.push(agg);
  });

  // Helper: average gross_qty for a set of weeks (per-week basis)
  const periodAvg = (weekMap: WeekMap, weeks: string[]): number | null => {
    const found = weeks.filter((w) => weekMap.has(w));
    if (found.length === 0) return null;
    const sum = found.reduce((s, w) => s + weekMap.get(w)!.gross_qty, 0);
    return sum / found.length; // divide by actual weeks with data
  };

  const result: StoreWeekComparison[] = [];

  Array.from(byStore.keys()).forEach((storeId) => {
    const storeAggs = byStore.get(storeId)!;
    if (!storeAggs[0]) return;
    const storeName = storeAggs[0].store_name;
    const products: ProductWeekComparison[] = [];

    storeAggs.forEach((agg) => {
      const isExcluded  = excludedNames.has(agg.product_name_normalized);
      const isIrregular = irregularNames.has(agg.product_name_normalized);
      if (excludedFilter === "hide" && isExcluded)  return; // hide excluded
      if (excludedFilter === "only" && !isExcluded) return; // only excluded
      if (isIrregular && !showIrregular) return;

      const spKey   = `${storeId}|${agg.product_name_normalized}`;
      const weekMap = index.get(spKey) ?? new Map();

      const lw1 = periodAvg(weekMap, refWeeks1);
      const lw2 = periodAvg(weekMap, refWeeks2);
      const lw3 = periodAvg(weekMap, refWeeks3);

      const nonNullPrev = [lw1, lw2, lw3].filter((v): v is number => v !== null);
      const avg3w = nonNullPrev.length > 0
        ? nonNullPrev.reduce((s, v) => s + v, 0) / nonNullPrev.length
        : null;

      const lastYearVals = lastYearWeeks
        .map((w) => weekMap.get(w)?.gross_qty)
        .filter((v): v is number => v != null);
      const lastYearQty = lastYearVals.length > 0
        ? lastYearVals.reduce((s, v) => s + v, 0) / lastYearVals.length
        : null;

      // Top-10 benchmark from individual historical weeks
      const top10 = Array.from(weekMap.values())
        .filter((r) => r.week_start_date < selectedWeek)
        .map((r) => r.gross_qty)
        .sort((a, b) => b - a)
        .slice(0, TOP_N_BENCHMARK);
      const top10Benchmark = top10.length > 0
        ? top10.reduce((s, v) => s + v, 0) / top10.length
        : null;

      const grossQty    = Math.round(agg.gross_qty);
      const returnsQty  = Math.round(agg.returns_qty);
      const returnsRate = grossQty > 0 ? (returnsQty / grossQty) * 100 : 0;

      const vsLastWeekTrend = computeTrend(grossQty, lw1);
      const streak = weeksCount === 1
        ? computeStreak(weekMap, allWeeks, selectedIdx, vsLastWeekTrend.direction)
        : 0;

      // ── Anomaly detection (Z-score, single-week mode only) ──────────────
      let isAnomaly    = false;
      let anomalyZScore: number | null = null;
      if (weeksCount === 1) {
        const historyQtys = allWeeks
          .slice(selectedIdx + 1, selectedIdx + 11)
          .map((w) => weekMap.get(w)?.gross_qty ?? null)
          .filter((v): v is number => v !== null);
        if (historyQtys.length >= 4) {
          const mean     = historyQtys.reduce((s, v) => s + v, 0) / historyQtys.length;
          const variance = historyQtys.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / historyQtys.length;
          const stdDev   = Math.sqrt(variance);
          if (stdDev >= 3 && Math.abs(grossQty - mean) >= 5) {
            const z = (grossQty - mean) / stdDev;
            anomalyZScore = Math.round(z * 10) / 10;
            if (Math.abs(z) >= 2.5) isAnomaly = true;
          }
        }
      }

      products.push({
        productName:           agg.product_name,
        productNameNormalized: agg.product_name_normalized,
        grossQty,
        returnsQty,
        returnsRate,
        deliveryCount:         Math.round(agg.delivery_count),
        vsLastWeek:            vsLastWeekTrend,
        vs3WeekAvg:            computeTrend(grossQty, avg3w),
        vsLastYear:            computeTrend(grossQty, lastYearQty),
        vsBenchmark:           computeTrend(grossQty, top10Benchmark),
        top10Benchmark,
        lastWeekQty:           lw1 !== null ? Math.round(lw1) : null,
        avgLast3WeeksQty:      avg3w !== null ? avg3w : null,
        lastYearQty:           lastYearQty !== null ? Math.round(lastYearQty) : null,
        isIrregular,
        streak,
        isAnomaly,
        anomalyZScore,
      });
    });

    if (products.length === 0) return;

    const totalGrossQty   = products.reduce((s, p) => s + p.grossQty,   0);
    const totalReturnsQty = products.reduce((s, p) => s + p.returnsQty, 0);
    const totalDeliveries = products.reduce((s, p) => s + p.deliveryCount, 0);

    const regularProducts = products.filter((p) => !p.isIrregular);
    const trendProducts   = regularProducts.length > 0 ? regularProducts : products;
    const trendGrossQty   = trendProducts.reduce((s, p) => s + p.grossQty, 0);

    const refSet1 = new Set(refWeeks1);
    const trendLastRows = rawData.filter(
      (r) =>
        r.store_external_id === storeId &&
        refSet1.has(r.week_start_date) &&
        !irregularNames.has(r.product_name_normalized),
    );
    const trendLastWeeks = new Set(trendLastRows.map((r) => r.week_start_date)).size;
    const trendLastPeriod = trendLastWeeks > 0
      ? trendLastRows.reduce((s, r) => s + r.gross_qty, 0) / trendLastWeeks
      : null;

    result.push({
      storeExternalId: storeId,
      storeName,
      products:        products.sort((a, b) => b.grossQty - a.grossQty),
      totalGrossQty,
      totalReturnsQty,
      totalDeliveries,
      overallTrend:    computeTrend(trendGrossQty, trendLastPeriod),
    });
  });

  return result.sort((a, b) => a.storeName.localeCompare(b.storeName, "he"));
}
