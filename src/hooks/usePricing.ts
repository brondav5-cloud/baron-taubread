"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useStoresAndProducts } from "@/context/StoresAndProductsContext";
import * as pricingRepo from "@/lib/db/pricing.repo";
import type { PricingIndex, StorePricing } from "@/types/pricing";
import { calculateFinalPrice } from "@/types/pricing";

// ============================================
// USE PRICING - Main hook
// ============================================

export function usePricing() {
  const auth = useAuth();
  const { stores } = useStoresAndProducts();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;

  const [index, setIndex] = useState<PricingIndex | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!companyId) {
      setIndex(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const data = await pricingRepo.getPricingIndex(companyId);
    setIndex(data);
    setIsLoading(false);
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const storesWithPricingStatus = useMemo(() => {
    const pricingIds = new Set(
      (index?.storeIds ?? [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id)),
    );
    return stores.map((store) => {
      const storeId = Number(store.external_id);
      return {
        id: store.external_id,
        storeUuid: store.id,
        name: store.name,
        city: store.city ?? "",
        hasPricing: Number.isFinite(storeId) && pricingIds.has(storeId),
      };
    });
  }, [stores, index]);

  return {
    index,
    isLoading,
    hasPricingData: (index?.totalStores ?? 0) > 0,
    storesWithPricingStatus,
    refresh: load,
  };
}

// ============================================
// USE STORE PRICING - Single store
// ============================================

export function useStorePricing(storeId: number) {
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;

  const [pricing, setPricing] = useState<StorePricing | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!companyId) {
      setPricing(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const data = await pricingRepo.getStorePricing(companyId, storeId);
    setPricing(data);
    setIsLoading(false);
  }, [companyId, storeId]);

  useEffect(() => {
    load();
  }, [load]);

  const productsWithFinalPrice = useMemo(() => {
    if (!pricing) return [];
    return pricing.products.map((p) => ({
      ...p,
      finalPrice: calculateFinalPrice(
        p.basePrice,
        p.productDiscount,
        pricing.storeDiscount,
        p.isExcludedFromStoreDiscount,
      ),
    }));
  }, [pricing]);

  return {
    pricing,
    productsWithFinalPrice,
    isLoading,
    hasPricing: pricing !== null,
    refresh: load,
  };
}
