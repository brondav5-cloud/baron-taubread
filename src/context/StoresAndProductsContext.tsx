"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { DbStore, DbProduct } from "@/types/supabase";

interface StoresAndProductsContextValue {
  stores: DbStore[];
  products: DbProduct[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getStoreByExternalId: (externalId: number) => DbStore | undefined;
  getProductByExternalId: (externalId: number) => DbProduct | undefined;
  storesByCity: (city: string) => DbStore[];
  storesByAgent: (agent: string) => DbStore[];
  productsByCategory: (category: string) => DbProduct[];
}

const StoresAndProductsContext = createContext<
  StoresAndProductsContextValue | undefined
>(undefined);

interface StoresAndProductsProviderProps {
  children: ReactNode;
}

export function StoresAndProductsProvider({
  children,
}: StoresAndProductsProviderProps) {
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;

  const [stores, setStores] = useState<DbStore[]>([]);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!companyId) {
      setIsLoading(false);
      setStores([]);
      setProducts([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const [storesRes, productsRes] = await Promise.all([
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
      ]);

      if (storesRes.error) throw new Error(storesRes.error.message);
      if (productsRes.error) throw new Error(productsRes.error.message);

      setStores(storesRes.data || []);
      setProducts(productsRes.data || []);
    } catch (err) {
      console.error("[StoresAndProducts] Failed to fetch:", err);
      setError(err instanceof Error ? err.message : "שגיאה בטעינת נתונים");
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (auth.status === "loading") return;
    if (companyId === null) {
      setIsLoading(false);
      setStores([]);
      setProducts([]);
      setError(null);
      return;
    }
    fetchData();
  }, [auth.status, companyId, fetchData]);

  const getStoreByExternalId = useCallback(
    (externalId: number) => stores.find((s) => s.external_id === externalId),
    [stores],
  );

  const getProductByExternalId = useCallback(
    (externalId: number) => products.find((p) => p.external_id === externalId),
    [products],
  );

  const storesByCity = useCallback(
    (city: string) => stores.filter((s) => s.city === city),
    [stores],
  );

  const storesByAgent = useCallback(
    (agent: string) => stores.filter((s) => s.agent === agent),
    [stores],
  );

  const productsByCategory = useCallback(
    (category: string) => products.filter((p) => p.category === category),
    [products],
  );

  const value: StoresAndProductsContextValue = {
    stores,
    products,
    isLoading,
    error,
    refetch: fetchData,
    getStoreByExternalId,
    getProductByExternalId,
    storesByCity,
    storesByAgent,
    productsByCategory,
  };

  return (
    <StoresAndProductsContext.Provider value={value}>
      {children}
    </StoresAndProductsContext.Provider>
  );
}

export function useStoresAndProducts(): StoresAndProductsContextValue {
  const context = useContext(StoresAndProductsContext);

  if (context === undefined) {
    throw new Error(
      "useStoresAndProducts must be used within StoresAndProductsProvider",
    );
  }

  return context;
}
