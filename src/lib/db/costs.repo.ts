// ============================================
// PRODUCT COSTS REPOSITORY - Supabase CRUD
// ============================================

import { createClient } from "@/lib/supabase/client";
import type { ProductCost } from "@/types/costs";
import { createEmptyProductCost, withTotalCost } from "@/types/costs";

function toProductCost(row: {
  product_external_id: number;
  raw_material: number;
  labor: number;
  operational: number;
  packaging: number;
  storage: number;
  misc: number;
}): ProductCost {
  return {
    productId: row.product_external_id,
    rawMaterial: Number(row.raw_material),
    labor: Number(row.labor),
    operational: Number(row.operational),
    packaging: Number(row.packaging),
    storage: Number(row.storage),
    misc: Number(row.misc),
  };
}

// ============================================
// READ
// ============================================

export async function getAllProductCosts(
  companyId: string,
): Promise<ReturnType<typeof withTotalCost>[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("product_costs")
    .select("*")
    .eq("company_id", companyId);

  if (error) {
    console.error("[costs.repo] getAllProductCosts:", error);
    return [];
  }
  return (data ?? []).map((r) => withTotalCost(toProductCost(r)));
}

export async function getProductCostsWithProducts(
  companyId: string,
  products: { id: number; name: string; category: string }[],
): Promise<
  Array<
    ReturnType<typeof withTotalCost> & { productName: string; category: string }
  >
> {
  const costs = await getAllProductCosts(companyId);
  return products.map((product) => {
    const existing = costs.find((c) => c.productId === product.id);
    const cost = existing ?? createEmptyProductCost(product.id);
    return {
      ...withTotalCost(cost),
      productName: product.name,
      category: product.category,
    };
  });
}

export async function getProductCost(
  companyId: string,
  productId: number,
): Promise<ReturnType<typeof withTotalCost> | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("product_costs")
    .select("*")
    .eq("company_id", companyId)
    .eq("product_external_id", productId)
    .single();

  if (error || !data) return null;
  return withTotalCost(toProductCost(data));
}

// ============================================
// WRITE
// ============================================

export async function updateProductCost(
  companyId: string,
  productId: number,
  updates: Partial<Omit<ProductCost, "productId">>,
): Promise<boolean> {
  const existing = await getProductCost(companyId, productId);
  const base: ProductCost = existing
    ? {
        productId,
        rawMaterial: existing.rawMaterial,
        labor: existing.labor,
        operational: existing.operational,
        packaging: existing.packaging,
        storage: existing.storage,
        misc: existing.misc,
      }
    : {
        productId,
        rawMaterial: 0,
        labor: 0,
        operational: 0,
        packaging: 0,
        storage: 0,
        misc: 0,
      };

  const merged = { ...base, ...updates };
  const supabase = createClient();
  const row = {
    company_id: companyId,
    product_external_id: productId,
    raw_material: merged.rawMaterial,
    labor: merged.labor,
    operational: merged.operational,
    packaging: merged.packaging,
    storage: merged.storage,
    misc: merged.misc,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("product_costs").upsert(row, {
    onConflict: "company_id,product_external_id",
  });

  if (error) {
    console.error("[costs.repo] updateProductCost:", error);
    return false;
  }
  return true;
}

export async function updateSingleCostValue(
  companyId: string,
  productId: number,
  key: keyof Omit<ProductCost, "productId">,
  value: number,
): Promise<boolean> {
  return updateProductCost(companyId, productId, { [key]: value });
}

export async function fillCostValue(
  companyId: string,
  productIds: number[],
  key: keyof Omit<ProductCost, "productId">,
  value: number,
): Promise<boolean> {
  for (const productId of productIds) {
    const ok = await updateSingleCostValue(companyId, productId, key, value);
    if (!ok) return false;
  }
  return true;
}

export async function resetAllCosts(companyId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("product_costs")
    .delete()
    .eq("company_id", companyId);
  if (error) {
    console.error("[costs.repo] resetAllCosts:", error);
    return false;
  }
  return true;
}

export async function hasCostsDefined(companyId: string): Promise<boolean> {
  const costs = await getAllProductCosts(companyId);
  return costs.some((c) => c.totalCost > 0);
}

export async function countProductsWithCosts(
  companyId: string,
): Promise<number> {
  const costs = await getAllProductCosts(companyId);
  const keys: (keyof Omit<ProductCost, "productId">)[] = [
    "rawMaterial",
    "labor",
    "operational",
    "packaging",
    "storage",
    "misc",
  ];
  return costs.filter((c) => keys.some((k) => (c as ProductCost)[k] > 0))
    .length;
}
