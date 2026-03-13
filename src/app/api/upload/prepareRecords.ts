import type { MonthlyData } from "@/types/supabase";
import {
  calculateStoreMetrics,
  calculateProductMetrics,
} from "@/lib/excelProcessor";
import { mergeMonthlyData } from "./mergeUtils";
import {
  validateMonthlyMap,
  computeTotals,
} from "@/lib/storeProducts/normalize";

interface StoreInput {
  external_id: number;
  name: string;
  city?: string | null;
  network?: string | null;
  driver?: string | null;
  agent?: string | null;
  monthly_qty: Record<string, number>;
  monthly_sales: Record<string, number>;
  monthly_gross: Record<string, number>;
  monthly_returns: Record<string, number>;
}

interface ProductInput {
  external_id: number;
  name: string;
  category?: string | null;
  monthly_qty: Record<string, number>;
  monthly_sales: Record<string, number>;
}

interface ValidatedSP {
  store_external_id: number;
  product_external_id: number;
  product_name: string;
  product_category: string | null;
  monthly_qty: Record<string, number>;
  monthly_sales: Record<string, number>;
  monthly_returns?: Record<string, number>;
}

interface MetricsContext {
  metricsMonths: string[];
  allMonthsList: string[];
  currentYear: number;
  previousYear: number;
}

interface ExistingStoreLite {
  external_id: number;
  monthly_qty: MonthlyData;
  monthly_sales: MonthlyData;
  monthly_gross: MonthlyData;
  monthly_returns: MonthlyData;
}

interface ExistingProductLite {
  external_id: number;
  monthly_qty: MonthlyData;
  monthly_sales: MonthlyData;
}

export function prepareStoreRecords(
  stores: StoreInput[],
  existingStoresMap: Map<number, ExistingStoreLite>,
  companyId: string,
  ctx: MetricsContext,
) {
  const validStores = stores.filter((store) => {
    const storeKey = Number(store.external_id);
    if (!Number.isFinite(storeKey) || storeKey <= 0) {
      console.warn("[UPLOAD] Skipping store with invalid external_id", {
        external_id: store.external_id,
        name: store.name,
      });
      return false;
    }
    return true;
  });

  // Deduplicate by external_id — merge monthly data for stores that appear more than once
  const storeMap = new Map<number, StoreInput>();
  for (const store of validStores) {
    const prev = storeMap.get(store.external_id);
    if (!prev) {
      storeMap.set(store.external_id, { ...store });
    } else {
      // Keep the latest metadata but sum monthly data across duplicate rows
      storeMap.set(store.external_id, {
        ...store,
        monthly_qty: { ...prev.monthly_qty, ...store.monthly_qty },
        monthly_sales: { ...prev.monthly_sales, ...store.monthly_sales },
        monthly_gross: { ...prev.monthly_gross, ...store.monthly_gross },
        monthly_returns: { ...prev.monthly_returns, ...store.monthly_returns },
      });
    }
  }
  const deduplicatedStores = Array.from(storeMap.values());

  return deduplicatedStores.map((store) => {
    const existing = existingStoresMap.get(store.external_id);
    const mergedMonthlyQty = mergeMonthlyData(existing?.monthly_qty || null, store.monthly_qty);
    const mergedMonthlySales = mergeMonthlyData(existing?.monthly_sales || null, store.monthly_sales);
    const mergedMonthlyGross = mergeMonthlyData(existing?.monthly_gross || null, store.monthly_gross);
    const mergedMonthlyReturns = mergeMonthlyData(existing?.monthly_returns || null, store.monthly_returns);

    const storeIdentity = {
      storeKey: store.external_id,
      storeMeta: { storeName: store.name },
    };
    const metrics = calculateStoreMetrics(
      mergedMonthlyQty,
      mergedMonthlyGross,
      mergedMonthlyReturns,
      ctx.metricsMonths.length > 0 ? ctx.metricsMonths : ctx.allMonthsList,
      ctx.currentYear,
      ctx.previousYear,
      storeIdentity,
    );

    return {
      company_id: companyId,
      external_id: store.external_id,
      name: store.name,
      city: store.city || null,
      network: store.network || null,
      driver: store.driver || null,
      agent: store.agent || null,
      monthly_qty: mergedMonthlyQty,
      monthly_sales: mergedMonthlySales,
      monthly_gross: mergedMonthlyGross,
      monthly_returns: mergedMonthlyReturns,
      metrics,
    };
  });
}

export function prepareProductRecords(
  products: ProductInput[],
  existingProductsMap: Map<number, ExistingProductLite>,
  companyId: string,
  ctx: MetricsContext,
) {
  return products.map((product) => {
    const existing = existingProductsMap.get(product.external_id);
    const mergedMonthlyQty = mergeMonthlyData(existing?.monthly_qty || null, product.monthly_qty);
    const mergedMonthlySales = mergeMonthlyData(existing?.monthly_sales || null, product.monthly_sales);

    const metrics = calculateProductMetrics(
      mergedMonthlyQty,
      mergedMonthlySales,
      ctx.metricsMonths.length > 0 ? ctx.metricsMonths : ctx.allMonthsList,
      ctx.currentYear,
      ctx.previousYear,
    );

    return {
      company_id: companyId,
      external_id: product.external_id,
      name: product.name,
      category: product.category || null,
      monthly_qty: mergedMonthlyQty,
      monthly_sales: mergedMonthlySales,
      metrics,
    };
  });
}

export function prepareStoreProductRecords(
  validatedStoreProducts: ValidatedSP[],
  existingStoreProductsMap: Map<string, { monthly_qty: MonthlyData; monthly_sales: MonthlyData; monthly_returns?: MonthlyData }>,
): { records: Array<ValidatedSP & { total_qty: number; total_sales: number; monthly_returns: Record<string, number> }>; errors: string[] } {
  const records: Array<ValidatedSP & { total_qty: number; total_sales: number; monthly_returns: Record<string, number> }> = [];
  const errors: string[] = [];

  for (const validated of validatedStoreProducts) {
    const key = `${validated.store_external_id}_${validated.product_external_id}`;
    const existing = existingStoreProductsMap.get(key);

    const mergedMonthlyQty = mergeMonthlyData(
      (existing?.monthly_qty as Record<string, number>) ?? null,
      validated.monthly_qty,
    );
    const mergedMonthlySales = mergeMonthlyData(
      (existing?.monthly_sales as Record<string, number>) ?? null,
      validated.monthly_sales,
    );
    const mergedMonthlyReturns = mergeMonthlyData(
      (existing?.monthly_returns as Record<string, number>) ?? null,
      validated.monthly_returns ?? {},
    );

    const qtyRes     = validateMonthlyMap(mergedMonthlyQty,     "monthly_qty");
    const salesRes   = validateMonthlyMap(mergedMonthlySales,   "monthly_sales");
    const returnsRes = validateMonthlyMap(mergedMonthlyReturns, "monthly_returns");

    if (!qtyRes.ok || !salesRes.ok || !returnsRes.ok) {
      errors.push(
        ...(qtyRes.ok     ? [] : qtyRes.errors),
        ...(salesRes.ok   ? [] : salesRes.errors),
        ...(returnsRes.ok ? [] : returnsRes.errors),
      );
      continue;
    }

    const { total_qty, total_sales } = computeTotals(qtyRes.value, salesRes.value);
    records.push({
      store_external_id:   validated.store_external_id,
      product_external_id: validated.product_external_id,
      product_name:        validated.product_name,
      product_category:    validated.product_category,
      monthly_qty:         qtyRes.value,
      monthly_sales:       salesRes.value,
      monthly_returns:     returnsRes.value,
      total_qty,
      total_sales,
    });
  }

  return { records, errors };
}
