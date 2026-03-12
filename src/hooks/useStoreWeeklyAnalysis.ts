"use client";

// ============================================================
// STORE WEEKLY ANALYSIS HOOK
// Lightweight version of useWeeklyComparison for a single store.
// Fetches only this store's data — much lighter than the full hook.
// ============================================================

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  computeTrend,
  type ProductWeekComparison,
  type StoreWeekComparison,
} from "@/hooks/useWeeklyComparison";

const HISTORY_WEEKS = 56;
const TOP_N         = 10;

interface RawRow {
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

function sameWeekLastYear(weekDate: string): string {
  const d = new Date(weekDate);
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

export function useStoreWeeklyAnalysis(storeExternalId: number | null) {
  const auth      = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;

  const [rawData,        setRawData]        = useState<RawRow[]>([]);
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [selectedWeek,   setSelectedWeek]   = useState<string>("");
  const [weeksCount,     setWeeksCount]     = useState<number>(1);
  const [isLoading,      setIsLoading]      = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  // Fetch available weeks for this store
  useEffect(() => {
    if (!companyId || !storeExternalId) return;
    createClient()
      .from("store_product_weekly")
      .select("week_start_date")
      .eq("company_id", companyId)
      .eq("store_external_id", storeExternalId)
      .order("week_start_date", { ascending: false })
      .limit(2000)
      .then(({ data }) => {
        if (!data) return;
        const set = new Set(data.map((r: { week_start_date: string }) => r.week_start_date));
        const weeks = Array.from(set).sort((a, b) => (a > b ? -1 : 1));
        setAvailableWeeks(weeks);
        if (weeks.length > 0) setSelectedWeek(weeks[0]!);
      });
  }, [companyId, storeExternalId]);

  // Fetch raw data for this store
  useEffect(() => {
    if (!companyId || !storeExternalId || !selectedWeek) return;
    setIsLoading(true);
    setError(null);
    const base = new Date(selectedWeek);
    base.setDate(base.getDate() - HISTORY_WEEKS * 7);
    createClient()
      .from("store_product_weekly")
      .select("store_external_id,store_name,product_name,product_name_normalized,week_start_date,gross_qty,returns_qty,net_qty,delivery_count")
      .eq("company_id", companyId)
      .eq("store_external_id", storeExternalId)
      .gte("week_start_date", base.toISOString().slice(0, 10))
      .order("week_start_date", { ascending: false })
      .then(({ data, error: err }) => {
        setIsLoading(false);
        if (err) { setError(err.message); return; }
        setRawData((data ?? []) as RawRow[]);
      });
  }, [companyId, storeExternalId, selectedWeek]);

  // Compute comparison for this single store
  const storeData = useMemo((): StoreWeekComparison | null => {
    if (!selectedWeek || rawData.length === 0) return null;

    // Build per-product week map
    type WeekMap = Map<string, RawRow>;
    const index = new Map<string, WeekMap>();
    for (const row of rawData) {
      if (!index.has(row.product_name_normalized)) index.set(row.product_name_normalized, new Map());
      index.get(row.product_name_normalized)!.set(row.week_start_date, row);
    }

    // Sorted weeks desc
    const wkSet = new Set(rawData.map((r) => r.week_start_date));
    const allWeeks = Array.from(wkSet).sort((a, b) => (a > b ? -1 : 1));
    const selectedIdx = allWeeks.indexOf(selectedWeek);
    if (selectedIdx === -1) return null;

    const currentPeriodWeeks = allWeeks.slice(selectedIdx, selectedIdx + weeksCount);
    const currentPeriodSet   = new Set(currentPeriodWeeks);

    const safeSlice = (startIdx: number) => allWeeks.slice(startIdx, startIdx + weeksCount);
    const refWeeks1 = safeSlice(selectedIdx + weeksCount);
    const refWeeks2 = safeSlice(selectedIdx + weeksCount * 2);
    const refWeeks3 = safeSlice(selectedIdx + weeksCount * 3);

    const lastYearWeeks = currentPeriodWeeks
      .map((w) => {
        const target = sameWeekLastYear(w);
        return allWeeks.find((x) => Math.abs(new Date(x).getTime() - new Date(target).getTime()) <= 10 * 86400000) ?? null;
      })
      .filter((w): w is string => w !== null);

    // Aggregate current period by product
    const aggMap    = new Map<string, { gross: number; returns: number; deliveries: number }>();
    const weeksPerP = new Map<string, Set<string>>();
    for (const row of rawData) {
      if (!currentPeriodSet.has(row.week_start_date)) continue;
      const key = row.product_name_normalized;
      if (!weeksPerP.has(key)) weeksPerP.set(key, new Set());
      weeksPerP.get(key)!.add(row.week_start_date);
      const e = aggMap.get(key);
      if (e) {
        e.gross      += row.gross_qty;
        e.returns    += row.returns_qty;
        e.deliveries += row.delivery_count;
      } else {
        aggMap.set(key, { gross: row.gross_qty, returns: row.returns_qty, deliveries: row.delivery_count });
      }
    }

    const periodAvg = (weekMap: WeekMap, weeks: string[]): number | null => {
      const found = weeks.filter((w) => weekMap.has(w));
      if (found.length === 0) return null;
      return found.reduce((s, w) => s + weekMap.get(w)!.gross_qty, 0) / found.length;
    };

    // Get store name from first row
    const storeName = rawData[0]?.store_name ?? String(storeExternalId);

    const products: ProductWeekComparison[] = [];

    Array.from(aggMap.entries()).forEach(([norm, agg]) => {
      const actualWeeks = Math.max(1, weeksPerP.get(norm)?.size ?? 1);
      const grossQty    = Math.round(agg.gross      / actualWeeks);
      const returnsQty  = Math.round(agg.returns    / actualWeeks);
      const returnsRate = grossQty > 0 ? (returnsQty / grossQty) * 100 : 0;

      const weekMap = index.get(norm) ?? new Map();
      const rawRow  = Array.from(weekMap.values()).find((r) => r.product_name_normalized === norm);
      const productName = rawRow?.product_name ?? norm;

      const lw1  = periodAvg(weekMap, refWeeks1);
      const lw2  = periodAvg(weekMap, refWeeks2);
      const lw3  = periodAvg(weekMap, refWeeks3);
      const nonNull = [lw1, lw2, lw3].filter((v): v is number => v !== null);
      const avg3w   = nonNull.length > 0 ? nonNull.reduce((s, v) => s + v, 0) / nonNull.length : null;

      const lastYearVals = lastYearWeeks.map((w) => weekMap.get(w)?.gross_qty).filter((v): v is number => v != null);
      const lastYearQty  = lastYearVals.length > 0 ? lastYearVals.reduce((s, v) => s + v, 0) / lastYearVals.length : null;

      const top10 = Array.from(weekMap.values())
        .filter((r) => r.week_start_date < selectedWeek)
        .map((r) => r.gross_qty)
        .sort((a, b) => b - a)
        .slice(0, TOP_N);
      const top10Benchmark = top10.length > 0 ? top10.reduce((s, v) => s + v, 0) / top10.length : null;

      products.push({
        productName,
        productNameNormalized:  norm,
        grossQty,
        returnsQty,
        returnsRate,
        deliveryCount:          Math.round(agg.deliveries / actualWeeks),
        vsLastWeek:             computeTrend(grossQty, lw1),
        vs3WeekAvg:             computeTrend(grossQty, avg3w),
        vsLastYear:             computeTrend(grossQty, lastYearQty),
        vsBenchmark:            computeTrend(grossQty, top10Benchmark),
        top10Benchmark,
        lastWeekQty:            lw1 !== null ? Math.round(lw1) : null,
        avgLast3WeeksQty:       avg3w,
        lastYearQty:            lastYearQty !== null ? Math.round(lastYearQty) : null,
        isIrregular:            false,  // managed globally; not relevant in single-store view
        streak:                 0,
        isAnomaly:              false,
        anomalyZScore:          null,
      });
    });

    if (products.length === 0) return null;

    const sorted     = products.sort((a, b) => b.grossQty - a.grossQty);
    const totalGross = sorted.reduce((s, p) => s + p.grossQty, 0);
    const totalRet   = sorted.reduce((s, p) => s + p.returnsQty, 0);
    const totalDel   = sorted.reduce((s, p) => s + p.deliveryCount, 0);

    // Overall trend: current vs previous period
    const currentTotal  = totalGross;
    const refSet1 = new Set(refWeeks1);
    const prevRows = rawData.filter((r) => refSet1.has(r.week_start_date));
    const prevWeeks = new Set(prevRows.map((r) => r.week_start_date)).size;
    const prevTotal = prevWeeks > 0 ? prevRows.reduce((s, r) => s + r.gross_qty, 0) / prevWeeks : null;

    return {
      storeExternalId: storeExternalId!,
      storeName,
      products:        sorted,
      totalGrossQty:   totalGross,
      totalReturnsQty: totalRet,
      totalDeliveries: totalDel,
      overallTrend:    computeTrend(currentTotal, prevTotal),
    };
  }, [rawData, selectedWeek, weeksCount, storeExternalId]);

  return {
    storeData,
    availableWeeks,
    selectedWeek,
    selectWeek: setSelectedWeek,
    weeksCount,
    setWeeksCount,
    isLoading,
    error,
  };
}
