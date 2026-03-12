// ============================================================
// STORE MONTHLY PRODUCTS HOOK
// קורא מ-store_products ומפרק monthly_qty/monthly_sales ל-שורות לפי חודש
// ============================================================

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface MonthlyProductRow {
  product_external_id: number;
  product_name:        string;
  month_key:           string; // "2024-01"
  year:                number;
  month:               number;
  qty:                 number;
  sales:               number;
  returns_qty:         number; // 0 — not available at product level from this table
  returns_pct:         number; // 0 — not available at product level from this table
}

interface UseStoreMonthlyProductsResult {
  rows:            MonthlyProductRow[];
  availableMonths: string[]; // sorted desc
  isLoading:       boolean;
  error:           string | null;
}

export function useStoreMonthlyProducts(
  companyId: string | null,
  storeExternalId: number | null,
): UseStoreMonthlyProductsResult {
  const [rows,            setRows]            = useState<MonthlyProductRow[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [isLoading,       setIsLoading]       = useState(false);
  const [error,           setError]           = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !storeExternalId) return;

    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    supabase
      .from("store_products")
      .select(
        "product_external_id, product_name, monthly_qty, monthly_sales",
      )
      .eq("company_id", companyId)
      .eq("store_external_id", storeExternalId)
      .order("total_qty", { ascending: false })
      .then(({ data, error: fetchError }) => {
        setIsLoading(false);

        if (fetchError) {
          setError(fetchError.message);
          return;
        }

        // Expand JSONB monthly_qty / monthly_sales into flat per-month rows
        const expanded: MonthlyProductRow[] = [];
        const monthSet = new Set<string>();

        (data ?? []).forEach((sp) => {
          const monthlyQty   = (sp.monthly_qty   ?? {}) as Record<string, number>;
          const monthlySales = (sp.monthly_sales ?? {}) as Record<string, number>;

          Object.entries(monthlyQty).forEach(([monthKey, qty]) => {
            if (!qty || qty === 0) return;

            const parts = monthKey.split("-");
            const year  = parseInt(parts[0] ?? "0", 10);
            const month = parseInt(parts[1] ?? "0", 10);
            if (!year || !month) return;

            monthSet.add(monthKey);
            expanded.push({
              product_external_id: sp.product_external_id,
              product_name:        sp.product_name,
              month_key:           monthKey,
              year,
              month,
              qty,
              sales:       monthlySales[monthKey] ?? 0,
              returns_qty: 0,
              returns_pct: 0,
            });
          });
        });

        setRows(expanded);

        const months = Array.from(monthSet).sort((a, b) => (a > b ? -1 : 1));
        setAvailableMonths(months);
      });
  }, [companyId, storeExternalId]);

  return { rows, availableMonths, isLoading, error };
}
