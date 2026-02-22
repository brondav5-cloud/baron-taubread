"use client";

import { useMemo, useState } from "react";
import { useStoresAndProducts } from "@/context/StoresAndProductsContext";
import { useProfitabilityData } from "@/hooks/useProfitabilityData";
import type { ProductCostWithTotal } from "@/types/costs";

// ============================================
// CONSTANTS
// ============================================

export const PROFITABILITY_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

// Fallback margins if no costs defined
const CATEGORY_MARGINS: Record<string, number> = {
  לחמים: 0.35,
  מאפים: 0.4,
  עוגות: 0.45,
  בייגלים: 0.38,
  חלות: 0.42,
  default: 0.35,
};

// ============================================
// TYPES
// ============================================

export interface CityProfitability {
  city: string;
  stores: number;
  totalSales: number;
  totalQty: number;
  avgReturns: number;
  estimatedProfit: number;
  margin: number;
}

export interface CategoryProfitability {
  name: string;
  sales: number;
  qty: number;
  margin: number;
  profit: number;
}

export interface StoreProfitability {
  id: number;
  name: string;
  city: string;
  driver: string;
  driverGroup: string | null;
  sales_2025: number;
  qty_2025: number;
  returns_pct_last6: number;
  // Profits
  grossProfit: number;
  operatingProfit: number;
  netProfit: number;
  // Legacy (for compatibility)
  estimatedProfit: number;
  profitMargin: number;
}

// ============================================
// HELPERS
// ============================================

function getCostMap(costs: ProductCostWithTotal[]): Map<number, number> {
  const map = new Map<number, number>();
  costs.forEach((cost) => {
    map.set(cost.productId, cost.totalCost);
  });
  return map;
}

function calculateMarginFromCosts(
  revenue: number,
  qty: number,
  avgCostPerUnit: number,
): number {
  if (revenue <= 0 || qty <= 0) return 0;
  const avgPrice = revenue / qty;
  if (avgPrice <= 0) return 0;
  // Allow negative margins (when cost > price)
  const margin = (avgPrice - avgCostPerUnit) / avgPrice;
  return Math.max(-1, Math.min(1, margin)); // Limit to -100% to +100%
}

// ============================================
// HOOK
// ============================================

export function useProfitability() {
  const { stores: dbStores, products: dbProducts } = useStoresAndProducts();
  const { costs: productCosts, hasCosts, ctx } = useProfitabilityData();
  const [selectedCity, setSelectedCity] = useState<string>("");

  const stores = useMemo(
    () =>
      dbStores.map((s) => {
        const m = s.metrics || {};
        return {
          id: s.external_id,
          name: s.name,
          city: s.city || "",
          driver: s.driver || "",
          sales_2025: m.sales_current_year ?? 0,
          qty_2025: m.qty_current_year ?? 0,
          returns_pct_last6: m.returns_pct_current ?? 0,
        };
      }),
    [dbStores],
  );

  const products = useMemo(
    () =>
      dbProducts.map((p) => {
        const m = p.metrics || {};
        return {
          id: p.external_id,
          name: p.name,
          category: p.category || "",
          sales_2025: m.sales_current_year ?? 0,
          qty_2025: m.qty_current_year ?? 0,
        };
      }),
    [dbProducts],
  );

  const cities = useMemo(
    () =>
      Array.from(new Set(stores.map((s) => s.city).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b, "he"),
      ),
    [stores],
  );

  // Calculate profitability data
  const profitabilityData = useMemo(() => {
    const costMap = getCostMap(productCosts);

    const productsWithCosts = products.filter(
      (p) => costMap.has(p.id) && (costMap.get(p.id) ?? 0) > 0,
    );
    const avgProductCost =
      productsWithCosts.length > 0
        ? productsWithCosts.reduce(
            (sum, p) => sum + (costMap.get(p.id) ?? 0),
            0,
          ) / productsWithCosts.length
        : 0;

    // By city
    const cityData: CityProfitability[] = cities
      .map((city) => {
        const cityStores = stores.filter((s) => s.city === city);
        const totalSales = cityStores.reduce((sum, s) => sum + s.sales_2025, 0);
        const totalQty = cityStores.reduce((sum, s) => sum + s.qty_2025, 0);
        const avgReturns =
          cityStores.length > 0
            ? cityStores.reduce((sum, s) => sum + s.returns_pct_last6, 0) /
              cityStores.length
            : 0;

        let effectiveMargin: number;

        if (hasCosts && avgProductCost > 0) {
          effectiveMargin = calculateMarginFromCosts(
            totalSales,
            totalQty,
            avgProductCost,
          );
          effectiveMargin = effectiveMargin * (1 - avgReturns / 200);
        } else {
          const estimatedMargin = 0.38;
          const returnsImpact = (avgReturns / 100) * 0.5;
          effectiveMargin = estimatedMargin - returnsImpact;
        }

        return {
          city,
          stores: cityStores.length,
          totalSales,
          totalQty,
          avgReturns,
          estimatedProfit: totalSales * effectiveMargin,
          margin: effectiveMargin * 100,
        };
      })
      .sort((a, b) => b.estimatedProfit - a.estimatedProfit);

    // By category
    const categoryMap = products.reduce(
      (acc, product) => {
        const category = product.category;
        if (!acc[category]) {
          const defaultMargin =
            CATEGORY_MARGINS[category] ?? CATEGORY_MARGINS["default"] ?? 0.35;
          acc[category] = {
            sales: 0,
            qty: 0,
            totalCost: 0,
            margin: defaultMargin,
            hasRealCosts: false,
          };
        }
        acc[category].sales += product.sales_2025;
        acc[category].qty += product.qty_2025;

        const productCost = costMap.get(product.id) ?? 0;
        if (productCost > 0) {
          acc[category].totalCost += productCost * product.qty_2025;
          acc[category].hasRealCosts = true;
        }

        return acc;
      },
      {} as Record<
        string,
        {
          sales: number;
          qty: number;
          totalCost: number;
          margin: number;
          hasRealCosts: boolean;
        }
      >,
    );

    const categoryList: CategoryProfitability[] = Object.entries(categoryMap)
      .map(([name, data]) => {
        let margin = data.margin;

        if (data.hasRealCosts && data.sales > 0) {
          const avgCostPerUnit = data.qty > 0 ? data.totalCost / data.qty : 0;
          margin = calculateMarginFromCosts(
            data.sales,
            data.qty,
            avgCostPerUnit,
          );
        }

        return {
          name,
          sales: data.sales,
          qty: data.qty,
          margin,
          profit: data.sales * margin,
        };
      })
      .sort((a, b) => b.profit - a.profit);

    // ALL stores with profitability
    const allStores: StoreProfitability[] = stores
      .map((store) => {
        // Get driver group or individual driver
        const driverGroup = ctx.getDriverGroup(store.driver);
        const individualDriver = ctx.getDriverGroup(store.driver); // same lookup
        const driverGroupName =
          driverGroup?.name ?? (individualDriver ? store.driver : null);

        // Calculate profits
        let grossMargin: number;
        let operatingMargin: number;
        let netMargin: number;

        if (hasCosts && avgProductCost > 0) {
          const avgPrice =
            store.qty_2025 > 0 ? store.sales_2025 / store.qty_2025 : 0;
          const baseMargin =
            avgPrice > 0 ? (avgPrice - avgProductCost) / avgPrice : 0;

          // Gross = revenue - raw materials & labor (~60% of costs)
          grossMargin = baseMargin * 1.2;

          // Operating = gross - operational costs (~80% of gross)
          operatingMargin = grossMargin * 0.85;

          // Net = operating - delivery & misc, adjusted for returns
          netMargin = operatingMargin * (1 - store.returns_pct_last6 / 200);
        } else {
          // Fallback estimates
          grossMargin = 0.45;
          operatingMargin = 0.35;
          netMargin = 0.28 * (1 - store.returns_pct_last6 / 200);
        }

        return {
          id: store.id,
          name: store.name,
          city: store.city,
          driver: store.driver,
          driverGroup: driverGroupName,
          sales_2025: store.sales_2025,
          qty_2025: store.qty_2025,
          returns_pct_last6: store.returns_pct_last6,
          grossProfit: store.sales_2025 * grossMargin,
          operatingProfit: store.sales_2025 * operatingMargin,
          netProfit: store.sales_2025 * netMargin,
          estimatedProfit: store.sales_2025 * netMargin, // Legacy
          profitMargin: netMargin * 100,
        };
      })
      .sort((a, b) => b.netProfit - a.netProfit);

    // Top 10 stores (for backward compatibility)
    const topStores = allStores.slice(0, 10);

    // Totals
    const totalSales = stores.reduce((sum, s) => sum + s.sales_2025, 0);
    const totalQty = stores.reduce((sum, s) => sum + s.qty_2025, 0);

    let avgMargin: number;
    let totalProfit: number;

    if (hasCosts && avgProductCost > 0) {
      avgMargin =
        calculateMarginFromCosts(totalSales, totalQty, avgProductCost) * 100;
      totalProfit = totalSales * (avgMargin / 100);
    } else {
      avgMargin = 35;
      totalProfit = totalSales * 0.35;
    }

    return {
      cityData,
      categoryList,
      topStores,
      allStores,
      totalSales,
      totalProfit,
      avgMargin,
      hasCosts,
    };
  }, [stores, products, cities, productCosts, hasCosts, ctx]);

  // Filter by city
  const filteredCities = selectedCity
    ? profitabilityData.cityData.filter((c) => c.city === selectedCity)
    : profitabilityData.cityData;

  return {
    // Data
    cities,
    profitabilityData,
    filteredCities,

    // State
    selectedCity,
    setSelectedCity,
  };
}
