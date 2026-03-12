// ============================================================
// CROSS-STORE COMPARISON HOOK
// Fetches store_products for all stores in company and builds
// a pivot: { month → { productName → { storeId → qty } } }
// ============================================================

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface PivotRow {
  product_name:  string;
  product_id:    number;
  storeQty:      Record<number, number>;   // storeExternalId → qty (net)
  storeReturns:  Record<number, number>;   // storeExternalId → returns_qty
}

export interface StoreInfo {
  external_id: number;
  name:        string;
}

interface UseStoreCrossComparisonResult {
  pivotRows:       PivotRow[];
  availableMonths: string[];
  stores:          StoreInfo[];
  isLoading:       boolean;
  error:           string | null;
}

export function useStoreCrossComparison(
  companyId: string | null,
  selectedMonth: string,
  selectedStoreIds: number[], // empty = all stores
): UseStoreCrossComparisonResult {
  const [pivotRows,       setPivotRows]       = useState<PivotRow[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [stores,          setStores]          = useState<StoreInfo[]>([]);
  const [isLoading,       setIsLoading]       = useState(false);
  const [error,           setError]           = useState<string | null>(null);

  // Fetch all store names once
  useEffect(() => {
    if (!companyId) return;
    const supabase = createClient();

    supabase
      .from("stores")
      .select("external_id, name")
      .eq("company_id", companyId)
      .order("name", { ascending: true })
      .then(({ data, error: e }) => {
        if (e) return;
        setStores(
          (data ?? []).map((s) => ({
            external_id: s.external_id as number,
            name:        String(s.name),
          })),
        );
      });
  }, [companyId]);

  // Fetch store_products and build pivot
  useEffect(() => {
    if (!companyId) return;

    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    let query = supabase
      .from("store_products")
      .select(
        "store_external_id, product_external_id, product_name, monthly_qty, monthly_returns",
      )
      .eq("company_id", companyId)
      .order("product_name", { ascending: true });

    if (selectedStoreIds.length > 0) {
      query = query.in("store_external_id", selectedStoreIds);
    }

    query.then(({ data, error: fetchError }) => {
      setIsLoading(false);

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      // Gather all available months across all rows
      const monthSet = new Set<string>();
      (data ?? []).forEach((sp) => {
        Object.keys((sp.monthly_qty ?? {}) as Record<string, number>).forEach(
          (mk) => monthSet.add(mk),
        );
      });
      const months = Array.from(monthSet).sort((a, b) => (a > b ? -1 : 1));
      setAvailableMonths(months);

      const month = selectedMonth || months[0] || "";
      if (!month) {
        setPivotRows([]);
        return;
      }

      // Build pivot: productId → PivotRow
      const pivotMap = new Map<number, PivotRow>();
      (data ?? []).forEach((sp) => {
        const monthlyQty     = (sp.monthly_qty     ?? {}) as Record<string, number>;
        const monthlyReturns = (sp.monthly_returns ?? {}) as Record<string, number>;
        const qty     = monthlyQty[month]     ?? 0;
        const returns = monthlyReturns[month] ?? 0;

        if (qty === 0 && returns === 0) return;

        const pid = sp.product_external_id as number;
        if (!pivotMap.has(pid)) {
          pivotMap.set(pid, {
            product_name:  String(sp.product_name),
            product_id:    pid,
            storeQty:     {},
            storeReturns: {},
          });
        }
        const row = pivotMap.get(pid)!;
        const sid = sp.store_external_id as number;
        row.storeQty[sid]     = (row.storeQty[sid]     ?? 0) + qty;
        row.storeReturns[sid] = (row.storeReturns[sid] ?? 0) + returns;
      });

      // Sort rows by total qty across selected stores descending
      const rows = Array.from(pivotMap.values()).sort((a, b) => {
        const sumA = Object.values(a.storeQty).reduce((s, v) => s + v, 0);
        const sumB = Object.values(b.storeQty).reduce((s, v) => s + v, 0);
        return sumB - sumA;
      });

      setPivotRows(rows);
    });
  }, [companyId, selectedMonth, selectedStoreIds]);

  return { pivotRows, availableMonths, stores, isLoading, error };
}
