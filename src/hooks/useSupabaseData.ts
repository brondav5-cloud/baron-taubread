"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatPeriodRange } from "@/lib/periodUtils";
import type {
  DbStore,
  DbProduct,
  DataMetadata,
  DbFilters,
} from "@/types/supabase";

interface SupabaseData {
  stores: DbStore[];
  products: DbProduct[];
  metadata: DataMetadata | null;
  filters: DbFilters | null;
  periodLabel: string;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSupabaseData(): SupabaseData {
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;

  const [stores, setStores] = useState<DbStore[]>([]);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [metadata, setMetadata] = useState<DataMetadata | null>(null);
  const [filters, setFilters] = useState<DbFilters | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!companyId) {
      setIsLoading(false);
      setStores([]);
      setProducts([]);
      setMetadata(null);
      setFilters(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Fetch all data in parallel
      const [storesRes, productsRes, metadataRes, filtersRes] =
        await Promise.all([
          supabase
            .from("stores")
            .select("*")
            .eq("company_id", companyId)
            .order("name"),
          supabase
            .from("products")
            .select("*")
            .eq("company_id", companyId)
            .order("name"),
          supabase
            .from("data_metadata")
            .select("*")
            .eq("company_id", companyId)
            .single(),
          supabase
            .from("filters")
            .select("*")
            .eq("company_id", companyId)
            .single(),
        ]);

      if (storesRes.error) throw new Error(storesRes.error.message);
      if (productsRes.error) throw new Error(productsRes.error.message);

      // Deduplicate stores by external_id — keep the most recently updated row
      const rawStores = storesRes.data || [];
      const storeMap = new Map<number, DbStore>();
      for (const store of rawStores) {
        const prev = storeMap.get(store.external_id);
        if (!prev || store.updated_at > prev.updated_at) {
          storeMap.set(store.external_id, store);
        }
      }
      setStores(Array.from(storeMap.values()));
      setProducts(productsRes.data || []);
      setMetadata(metadataRes.data);
      setFilters(filtersRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err instanceof Error ? err.message : "שגיאה בטעינת נתונים");
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // Initial fetch
  useEffect(() => {
    if (auth.status === "loading") return;
    if (companyId === null) {
      setIsLoading(false);
      setStores([]);
      setProducts([]);
      setMetadata(null);
      setFilters(null);
      setError(null);
      return;
    }
    fetchData();
  }, [auth.status, companyId, fetchData]);

  const periodLabel = useMemo(() => {
    if (!companyId) return "";
    if (stores.length === 0 && products.length === 0) return "";
    const meta = metadata;
    if (meta?.period_start && meta?.period_end) {
      return formatPeriodRange(meta.period_start, meta.period_end);
    }
    if (meta?.months_list?.length) {
      const sorted = [...meta.months_list].sort();
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      if (first && last) return formatPeriodRange(first, last);
    }
    return "";
  }, [metadata, stores.length, products.length, companyId]);

  return {
    stores,
    products,
    metadata,
    filters,
    periodLabel,
    isLoading,
    error,
    refetch: fetchData,
  };
}
