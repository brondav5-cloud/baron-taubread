// ============================================
// PRICING REPOSITORY - Supabase CRUD
// ============================================

import { createClient } from "@/lib/supabase/client";
import type { StorePricing, PricingIndex } from "@/types/pricing";

function toStorePricing(row: {
  store_external_id: number;
  store_name: string;
  agent: string;
  driver: string;
  store_discount: number;
  excluded_product_ids: number[];
  products: unknown[];
  last_updated: string;
}): StorePricing {
  return {
    storeId: row.store_external_id,
    storeName: row.store_name,
    agent: row.agent,
    driver: row.driver,
    storeDiscount: Number(row.store_discount),
    excludedProductIds: Array.isArray(row.excluded_product_ids)
      ? row.excluded_product_ids
      : [],
    products: Array.isArray(row.products)
      ? (row.products as StorePricing["products"])
      : [],
    lastUpdated: row.last_updated,
  };
}

function toDbRow(p: StorePricing): Record<string, unknown> {
  return {
    store_external_id: p.storeId,
    store_name: p.storeName,
    agent: p.agent,
    driver: p.driver,
    store_discount: p.storeDiscount,
    excluded_product_ids: p.excludedProductIds,
    products: p.products,
    last_updated: new Date().toISOString(),
  };
}

// ============================================
// READ
// ============================================

export async function getPricingIndex(
  companyId: string,
): Promise<PricingIndex | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("store_pricing")
    .select("store_external_id, last_updated, products")
    .eq("company_id", companyId);

  if (error) {
    console.error("[pricing.repo] getPricingIndex:", error);
    return null;
  }

  if (!data?.length) return null;

  const storeIds = data.map((r) => r.store_external_id);
  const lastRow = data.reduce((a, b) =>
    (a.last_updated || "") > (b.last_updated || "") ? a : b,
  );
  const totalProducts =
    data.length > 0
      ? Math.max(
          ...data.map((r) =>
            Array.isArray(r.products) ? (r.products as unknown[]).length : 0,
          ),
        )
      : 0;

  return {
    lastUpdated: lastRow?.last_updated || new Date().toISOString(),
    uploadedBy: "admin",
    totalStores: storeIds.length,
    totalProducts,
    storeIds,
  };
}

export async function getStorePricing(
  companyId: string,
  storeId: number,
): Promise<StorePricing | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("store_pricing")
    .select("*")
    .eq("company_id", companyId)
    .eq("store_external_id", storeId)
    .single();

  if (error || !data) return null;
  return toStorePricing(data);
}

export async function getStoreIdsWithPricing(
  companyId: string,
): Promise<number[]> {
  const idx = await getPricingIndex(companyId);
  return idx?.storeIds ?? [];
}

// ============================================
// WRITE
// ============================================

export async function saveStorePricing(
  companyId: string,
  pricing: StorePricing,
): Promise<boolean> {
  const supabase = createClient();
  const row = {
    company_id: companyId,
    ...toDbRow(pricing),
  };

  const { error } = await supabase.from("store_pricing").upsert(row, {
    onConflict: "company_id,store_external_id",
  });

  if (error) {
    console.error("[pricing.repo] saveStorePricing:", error);
    return false;
  }
  return true;
}

export async function saveAllStorePricings(
  companyId: string,
  pricings: StorePricing[],
): Promise<boolean> {
  if (pricings.length === 0) return true;

  const supabase = createClient();
  const rows = pricings.map((p) => ({
    company_id: companyId,
    ...toDbRow(p),
  }));

  const { error } = await supabase.from("store_pricing").upsert(rows, {
    onConflict: "company_id,store_external_id",
  });

  if (error) {
    console.error("[pricing.repo] saveAllStorePricings:", error);
    return false;
  }
  return true;
}

export async function clearAllPricingData(companyId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("store_pricing")
    .delete()
    .eq("company_id", companyId);

  if (error) {
    console.error("[pricing.repo] clearAllPricingData:", error);
    return false;
  }
  return true;
}

export async function updateStoreDiscount(
  companyId: string,
  storeId: number,
  discount: number,
): Promise<boolean> {
  const pricing = await getStorePricing(companyId, storeId);
  if (!pricing) return false;

  pricing.storeDiscount = Math.max(0, Math.min(100, discount));
  pricing.lastUpdated = new Date().toISOString();
  return saveStorePricing(companyId, pricing);
}

export async function toggleProductExclusion(
  companyId: string,
  storeId: number,
  productId: number,
): Promise<boolean> {
  const pricing = await getStorePricing(companyId, storeId);
  if (!pricing) return false;

  const idx = pricing.excludedProductIds.indexOf(productId);
  if (idx >= 0) {
    pricing.excludedProductIds.splice(idx, 1);
  } else {
    pricing.excludedProductIds.push(productId);
  }

  const product = pricing.products.find((p) => p.productId === productId);
  if (product) {
    product.isExcludedFromStoreDiscount = idx < 0;
  }

  pricing.lastUpdated = new Date().toISOString();
  return saveStorePricing(companyId, pricing);
}

export async function updateProductPrice(
  companyId: string,
  storeId: number,
  productId: number,
  field: "basePrice" | "productDiscount",
  value: number,
): Promise<boolean> {
  const pricing = await getStorePricing(companyId, storeId);
  if (!pricing) return false;

  const product = pricing.products.find((p) => p.productId === productId);
  if (!product) return false;

  if (field === "basePrice") {
    product.basePrice = value;
  } else {
    product.productDiscount = Math.max(0, Math.min(100, value));
  }
  product.priceAfterProductDiscount =
    product.basePrice * (1 - product.productDiscount / 100);
  pricing.lastUpdated = new Date().toISOString();

  return saveStorePricing(companyId, pricing);
}
