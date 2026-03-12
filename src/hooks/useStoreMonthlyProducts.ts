// ============================================================
// STORE MONTHLY PRODUCTS HOOK
// מביא פירוט מוצרים חודשי לפי חנות מטבלת store_product_monthly
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
  returns_qty:         number;
  returns_pct:         number;
}

interface UseStoreMonthlyProductsResult {
  rows:           MonthlyProductRow[];
  availableMonths: string[]; // sorted desc
  isLoading:      boolean;
  error:          string | null;
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
      .from("store_product_monthly")
      .select(
        "product_external_id,product_name,month_key,year,month,qty,sales,returns_qty,returns_pct",
      )
      .eq("company_id", companyId)
      .eq("store_external_id", storeExternalId)
      .order("month_key", { ascending: false })
      .then(({ data, error: fetchError }) => {
        setIsLoading(false);
        if (fetchError) {
          setError(fetchError.message);
          return;
        }
        const fetched = (data ?? []) as MonthlyProductRow[];
        setRows(fetched);

        const months = [...new Set(fetched.map((r) => r.month_key))].sort(
          (a, b) => (a > b ? -1 : 1),
        );
        setAvailableMonths(months);
      });
  }, [companyId, storeExternalId]);

  return { rows, availableMonths, isLoading, error };
}
