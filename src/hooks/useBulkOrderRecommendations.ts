// ============================================================
// useBulkOrderRecommendations
// Fetches Smart Order recommendations for multiple stores at once.
// Used for the "מצב המלצות הזמנה" — one-screen view with filters.
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
  store_external_id:       number;
  product_name_normalized: string;
  day_of_week:             number;
  gross_qty:               number;
  returns_qty:             number;
}

interface MonthlyRow {
  store_external_id:       number;
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

// ── Output: flat list for table display ─────────────────────────────────────

export interface BulkRecommendationRow {
  storeExternalId:  number;
  storeName:        string;
  productName:      string;
  productNameNorm:  string;
  recommendation:   OrderRecommendation;
}

// ── Hook ────────────────────────────────────────────────────────────────────

export interface UseBulkOrderRecommendationsResult {
  rows:             BulkRecommendationRow[];
  policy:           PolicyBracket[];
  isLoading:        boolean;
  error:            string | null;
  hasMonthlyData:   boolean;  // true = we got data from store_product_monthly_dist
}

export function useBulkOrderRecommendations(
  storeIds:     number[],
  storeNames:   Map<number, string>,
  productNames: Map<string, string>, // normalized → display name (from any store)
  selectedWeek: string,
): UseBulkOrderRecommendationsResult {
  const auth      = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;

  const [dailyRows,   setDailyRows]   = useState<DailyRow[]>([]);
  const [monthlyRows, setMonthlyRows] = useState<MonthlyRow[]>([]);
  const [policyRows,  setPolicyRows]  = useState<PolicyRow[]>([]);
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const storeIdsKey = storeIds.slice().sort((a, b) => a - b).join(",");

  useEffect(() => {
    if (!companyId || !selectedWeek || storeIds.length === 0) {
      setDailyRows([]);
      setMonthlyRows([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const dailyCutoff = new Date(selectedWeek);
    dailyCutoff.setDate(dailyCutoff.getDate() - 8 * 7);
    const dailyCutoffStr = dailyCutoff.toISOString().slice(0, 10);

    const selDate  = new Date(selectedWeek);
    const yearNow  = selDate.getFullYear();
    const monthNow = selDate.getMonth() + 1;
    let monthFrom  = monthNow - 2;
    let yearFrom   = yearNow;
    if (monthFrom <= 0) {
      monthFrom += 12;
      yearFrom--;
    }
    const ymFrom = yearFrom * 100 + monthFrom;
    const ymTo   = yearNow * 100 + (monthNow - 1 <= 0 ? 12 : monthNow - 1);

    const supabase = createClient();

    const fetchDaily = supabase
      .from("store_product_daily")
      .select("store_external_id,product_name_normalized,day_of_week,gross_qty,returns_qty")
      .eq("company_id", companyId)
      .in("store_external_id", storeIds)
      .gte("week_start_date", dailyCutoffStr)
      .lte("week_start_date", selectedWeek);

    const fetchMonthly = supabase
      .from("store_product_monthly_dist")
      .select("store_external_id,product_name_normalized,year,month,gross_qty,returns_qty")
      .eq("company_id", companyId)
      .in("store_external_id", storeIds)
      .gte("year", yearFrom)
      .filter("year * 100 + month", "gte", ymFrom)
      .filter("year * 100 + month", "lte", ymTo);

    const fetchPolicy = supabase
      .from("returns_policy")
      .select("min_monthly_qty,max_monthly_qty,normal_returns_pct,label")
      .eq("company_id", companyId)
      .order("min_monthly_qty", { ascending: true });

    Promise.all([fetchDaily, fetchMonthly, fetchPolicy])
      .then(([dailyRes, monthlyRes, policyRes]) => {
        setIsLoading(false);
        if (dailyRes.error) {
          setError(dailyRes.error.message);
          return;
        }
        if (monthlyRes.error) {
          setError(monthlyRes.error.message);
          return;
        }
        setDailyRows((dailyRes.data ?? []) as DailyRow[]);
        setMonthlyRows((monthlyRes.data ?? []) as MonthlyRow[]);
        setPolicyRows((policyRes.data ?? []) as PolicyRow[]);
      })
      .catch((err) => {
        setIsLoading(false);
        setError(err instanceof Error ? err.message : "שגיאה בטעינת נתונים");
      });
  }, [companyId, storeIdsKey, selectedWeek]);

  const policy: PolicyBracket[] = useMemo(() => {
    if (policyRows.length === 0) return DEFAULT_POLICY;
    return policyRows.map((r) => ({
      minQty:           r.min_monthly_qty,
      maxQty:           r.max_monthly_qty,
      normalReturnsPct: Number(r.normal_returns_pct),
      label:            r.label ?? undefined,
    }));
  }, [policyRows]);

  const rows = useMemo(() => {
    const result: BulkRecommendationRow[] = [];

    // Group daily by store + product
    const dailyByStore = new Map<number, Map<string, Map<number, { qty: number; returns: number; count: number }>>>();
    for (const row of dailyRows) {
      if (!dailyByStore.has(row.store_external_id)) {
        dailyByStore.set(row.store_external_id, new Map());
      }
      const byProduct = dailyByStore.get(row.store_external_id)!;
      if (!byProduct.has(row.product_name_normalized)) {
        byProduct.set(row.product_name_normalized, new Map());
      }
      const byDay = byProduct.get(row.product_name_normalized)!;
      const existing = byDay.get(row.day_of_week);
      if (existing) {
        existing.qty += Number(row.gross_qty);
        existing.returns += Number(row.returns_qty);
        existing.count += 1;
      } else {
        byDay.set(row.day_of_week, {
          qty:     Number(row.gross_qty),
          returns: Number(row.returns_qty),
          count:   1,
        });
      }
    }

    // Group monthly by store + product
    const monthlyByStore = new Map<number, Map<string, { grossQty: number; returnsQty: number; months: number }>>();
    for (const row of monthlyRows) {
      if (!monthlyByStore.has(row.store_external_id)) {
        monthlyByStore.set(row.store_external_id, new Map());
      }
      const byProduct = monthlyByStore.get(row.store_external_id)!;
      const existing = byProduct.get(row.product_name_normalized);
      if (existing) {
        existing.grossQty += Number(row.gross_qty);
        existing.returnsQty += Number(row.returns_qty);
        existing.months += 1;
      } else {
        byProduct.set(row.product_name_normalized, {
          grossQty:   Number(row.gross_qty),
          returnsQty: Number(row.returns_qty),
          months:     1,
        });
      }
    }

    // Compute recommendations per store × product
    monthlyByStore.forEach((byProduct, storeId) => {
      const storeName = storeNames.get(storeId) ?? `חנות ${storeId}`;
      byProduct.forEach((monthly, normalized) => {
        const dayInner = dailyByStore.get(storeId)?.get(normalized);
        const dayPatterns: DayPattern[] = dayInner
          ? Array.from(dayInner.entries()).map(([dow, v]) => ({
              dayOfWeek:     dow,
              avgGrossQty:   v.qty / v.count,
              avgReturnsQty: v.returns / v.count,
              occurrences:   v.count,
            }))
          : [];

        const avgMonthly = {
          grossQty:   monthly.grossQty / monthly.months,
          returnsQty: monthly.returnsQty / monthly.months,
        };

        const rec = computeOrderRecommendation({
          productName:           productNames.get(normalized) ?? normalized,
          productNameNormalized: normalized,
          monthlyGrossQty:       avgMonthly.grossQty,
          monthlyReturnsQty:     avgMonthly.returnsQty,
          dayPatterns,
          policy,
        });

        if (rec.isExcess) {
          result.push({
            storeExternalId: storeId,
            storeName,
            productName:    productNames.get(normalized) ?? normalized,
            productNameNorm: normalized,
            recommendation:  rec,
          });
        }
      });
    });

    result.sort((a, b) => b.recommendation.excessReturnsPct - a.recommendation.excessReturnsPct);
    return result;
  }, [dailyRows, monthlyRows, policy, storeNames, productNames]);

  const hasMonthlyData = monthlyRows.length > 0;
  return { rows, policy, isLoading, error, hasMonthlyData };
}
