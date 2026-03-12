// ============================================================
// PRODUCT MONTHLY DELIVERY COUNTS HOOK
// Reads from store_product_weekly and aggregates by year+month
// for a given product (identified by name_normalized)
// ============================================================

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ProductMonthlyDelivery {
  month_key: string; // "YYYYMM" matching monthly_qty keys
  delivery_count: number;
}

export function useProductMonthlyDeliveries(
  productName: string | null | undefined,
  companyId: string | null | undefined,
): { deliveries: Record<string, number>; isLoading: boolean } {
  const [deliveries, setDeliveries] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading]   = useState(false);

  useEffect(() => {
    if (!productName || !companyId) return;

    const normalized = productName.trim().toLowerCase();
    const supabase = createClient();
    setIsLoading(true);

    supabase
      .from("store_product_weekly")
      .select("year, month, delivery_count")
      .eq("company_id", companyId)
      .eq("product_name_normalized", normalized)
      .then(({ data, error: fetchError }) => {
        setIsLoading(false);
        if (fetchError || !data) return;

        // Aggregate sum of delivery_count per year+month
        const map: Record<string, number> = {};
        data.forEach((row) => {
          // key format must match monthly_qty keys: "YYYYMM"
          const key = `${row.year}${String(row.month).padStart(2, "0")}`;
          map[key] = (map[key] ?? 0) + row.delivery_count;
        });
        setDeliveries(map);
      });
  }, [productName, companyId]);

  return { deliveries, isLoading };
}
