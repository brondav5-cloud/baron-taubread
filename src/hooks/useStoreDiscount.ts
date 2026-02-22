"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import * as pricingRepo from "@/lib/db/pricing.repo";

export function useStoreDiscount(storeId: number, onUpdate?: () => void) {
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;

  const [isSaving, setIsSaving] = useState(false);

  const setDiscount = useCallback(
    async (percent: number) => {
      if (!companyId) return;
      setIsSaving(true);
      try {
        await pricingRepo.updateStoreDiscount(companyId, storeId, percent);
        onUpdate?.();
      } finally {
        setIsSaving(false);
      }
    },
    [companyId, storeId, onUpdate],
  );

  const toggleExclusion = useCallback(
    async (productId: number) => {
      if (!companyId) return;
      setIsSaving(true);
      try {
        await pricingRepo.toggleProductExclusion(companyId, storeId, productId);
        onUpdate?.();
      } finally {
        setIsSaving(false);
      }
    },
    [companyId, storeId, onUpdate],
  );

  const updateProductPrice = useCallback(
    async (
      productId: number,
      field: "basePrice" | "productDiscount",
      value: number,
    ) => {
      if (!companyId) return;
      setIsSaving(true);
      try {
        await pricingRepo.updateProductPrice(
          companyId,
          storeId,
          productId,
          field,
          value,
        );
        onUpdate?.();
      } finally {
        setIsSaving(false);
      }
    },
    [companyId, storeId, onUpdate],
  );

  return { setDiscount, toggleExclusion, updateProductPrice, isSaving };
}
