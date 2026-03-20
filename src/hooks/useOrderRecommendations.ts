// ============================================================
// useOrderRecommendations
// Lazy-loaded per store row (called only when a store is expanded).
//
// Fetches:
//   1. store_product_daily    — last 8 weeks, to compute avg qty per day-of-week
//   2. store_product_monthly_dist — last 2 months, for monthly gross/returns baseline
//   3. returns_policy         — company's configured normal-returns thresholds
//
// Computes per-product recommendations using smartOrderEngine.
// ============================================================

"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  computeOrderRecommendation,
  DEFAULT_POLICY,
  type OrderRecommendation,
  type DayPattern,
  type PolicyBracket,
} from "@/lib/smartOrderEngine";

// ── Raw DB row types ───────────────────────────────────────────────────────

interface DailyRow {
  product_name_normalized: string;
  day_of_week:             number;
  gross_qty:               number;
  returns_qty:             number;
}

interface MonthlyRow {
  product_name_normalized: string;
  year:                    number;
  month:                   number;
  gross_qty:               number;
  returns_qty:             number;
}

interface PolicyRow {
  min_monthly_qty:    number;
  max_monthly_qty:    number | null;
  normal_returns_pct: number;
  label:              string | null;
}

// ── Hook ──────────────────────────────────────────────────────────────────

export interface UseOrderRecommendationsResult {
  recommendations: Map<string, OrderRecommendation>; // keyed by product_name_normalized
  policy:          PolicyBracket[];
  isLoading:       boolean;
  error:           string | null;
}

export function useOrderRecommendations(
  storeExternalId: number | null,
  selectedWeek:    string,            // "YYYY-MM-DD" — determines the "current" month reference
): UseOrderRecommendationsResult {
  const auth      = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;

  const [dailyRows,   setDailyRows]   = useState<DailyRow[]>([]);
  const [monthlyRows, setMonthlyRows] = useState<MonthlyRow[]>([]);
  const [policyRows,  setPolicyRows]  = useState<PolicyRow[]>([]);
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !storeExternalId || !selectedWeek) return;
    setIsLoading(true);
    setError(null);

    // 8 weeks back from selected week
    const dailyCutoff = new Date(selectedWeek);
    dailyCutoff.setDate(dailyCutoff.getDate() - 8 * 7);
    const dailyCutoffStr = dailyCutoff.toISOString().slice(0, 10);

    // Last 2 complete months: e.g. if selectedWeek is 2026-03-15 → use month 1 and 2
    const selDate    = new Date(selectedWeek);
    const yearNow    = selDate.getFullYear();
    const monthNow   = selDate.getMonth() + 1; // 1-based
    // Go back 2 months
    let monthFrom = monthNow - 2;
    let yearFrom  = yearNow;
    if (monthFrom <= 0) { monthFrom += 12; yearFrom--; }
    const ymFrom = yearFrom * 100 + monthFrom;
    // Exclude current month (may be incomplete)
    const ymTo = yearNow * 100 + (monthNow - 1 <= 0 ? 12 : monthNow - 1);

    const supabase = createClient();

    const fetchDaily = supabase
      .from("store_product_daily")
      .select("product_name_normalized,day_of_week,gross_qty,returns_qty")
      .eq("company_id", companyId)
      .eq("store_external_id", storeExternalId)
      .gte("week_start_date", dailyCutoffStr)
      .lte("week_start_date", selectedWeek);

    const fetchMonthly = supabase
      .from("store_product_monthly_dist")
      .select("product_name_normalized,year,month,gross_qty,returns_qty")
      .eq("company_id", companyId)
      .eq("store_external_id", storeExternalId)
      .gte("year", yearFrom)
      .filter("year * 100 + month", "gte", ymFrom)
      .filter("year * 100 + month", "lte", ymTo);

    const fetchPolicy = supabase
      .from("returns_policy")
      .select("min_monthly_qty,max_monthly_qty,normal_returns_pct,label")
      .eq("company_id", companyId)
      .order("min_monthly_qty", { ascending: true });

    Promise.all([fetchDaily, fetchMonthly, fetchPolicy]).then(
      ([dailyRes, monthlyRes, policyRes]) => {
        setIsLoading(false);
        if (dailyRes.error)   { setError(dailyRes.error.message);   return; }
        if (monthlyRes.error) { setError(monthlyRes.error.message); return; }
        // policy errors are soft — fall back to defaults
        setDailyRows((dailyRes.data   ?? []) as DailyRow[]);
        setMonthlyRows((monthlyRes.data ?? []) as MonthlyRow[]);
        setPolicyRows((policyRes.data  ?? []) as PolicyRow[]);
      },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, storeExternalId, selectedWeek]);

  // Convert policy rows → PolicyBracket[], falling back to built-in defaults
  const policy: PolicyBracket[] = useMemo(() => {
    if (policyRows.length === 0) return DEFAULT_POLICY;
    return policyRows.map((r) => ({
      minQty:           r.min_monthly_qty,
      maxQty:           r.max_monthly_qty,
      normalReturnsPct: Number(r.normal_returns_pct),
      label:            r.label ?? undefined,
    }));
  }, [policyRows]);

  // Build day patterns: avg gross_qty per day_of_week over the sampled weeks
  // We count occurrences as number of distinct (product × week × day) rows
  const dayPatternsMap = useMemo(() => {
    // key: product_name_normalized → dayOfWeek → { totalQty, totalReturns, occurrences }
    const map = new Map<string, Map<number, { qty: number; returns: number; count: number }>>();
    for (const row of dailyRows) {
      if (!map.has(row.product_name_normalized)) map.set(row.product_name_normalized, new Map());
      const inner = map.get(row.product_name_normalized)!;
      const existing = inner.get(row.day_of_week);
      if (existing) {
        existing.qty     += Number(row.gross_qty);
        existing.returns += Number(row.returns_qty);
        existing.count   += 1;
      } else {
        inner.set(row.day_of_week, {
          qty:     Number(row.gross_qty),
          returns: Number(row.returns_qty),
          count:   1,
        });
      }
    }
    return map;
  }, [dailyRows]);

  // Build monthly totals: product → { grossQty, returnsQty } averaged over sampled months
  const monthlyTotalsMap = useMemo(() => {
    const map = new Map<string, { grossQty: number; returnsQty: number; months: number }>();
    for (const row of monthlyRows) {
      const existing = map.get(row.product_name_normalized);
      if (existing) {
        existing.grossQty   += Number(row.gross_qty);
        existing.returnsQty += Number(row.returns_qty);
        existing.months     += 1;
      } else {
        map.set(row.product_name_normalized, {
          grossQty:   Number(row.gross_qty),
          returnsQty: Number(row.returns_qty),
          months:     1,
        });
      }
    }
    // Average across months
    const avgMap = new Map<string, { grossQty: number; returnsQty: number }>();
    map.forEach((v, k) => {
      avgMap.set(k, {
        grossQty:   v.grossQty   / v.months,
        returnsQty: v.returnsQty / v.months,
      });
    });
    return avgMap;
  }, [monthlyRows]);

  // Compute recommendations for all products that have both monthly and daily data
  const recommendations = useMemo(() => {
    const result = new Map<string, OrderRecommendation>();

    // Use all products that appear in monthly data (need returns baseline)
    monthlyTotalsMap.forEach((monthly, normalized) => {
      const dayInner  = dayPatternsMap.get(normalized);
      const dayPatterns: DayPattern[] = dayInner
        ? Array.from(dayInner.entries()).map(([dow, v]) => ({
            dayOfWeek:     dow,
            avgGrossQty:   v.qty     / v.count,
            avgReturnsQty: v.returns / v.count,
            occurrences:   v.count,
          }))
        : [];

      // productName will be filled in by the caller if needed; use normalized as fallback
      const rec = computeOrderRecommendation({
        productName:           normalized,
        productNameNormalized: normalized,
        monthlyGrossQty:       monthly.grossQty,
        monthlyReturnsQty:     monthly.returnsQty,
        dayPatterns,
        policy,
      });

      result.set(normalized, rec);
    });

    return result;
  }, [monthlyTotalsMap, dayPatternsMap, policy]);

  return { recommendations, policy, isLoading, error };
}
