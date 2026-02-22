// ============================================
// USE COSTS HOOK
// ============================================

import { useState, useCallback, useMemo, useEffect } from "react";
import type { ProductCostWithTotal, CostKey } from "@/types/costs";
import { useAuth } from "@/hooks/useAuth";
import { useStoresAndProducts } from "@/context/StoresAndProductsContext";
import * as costsRepo from "@/lib/db/costs.repo";

// ============================================
// TYPES
// ============================================

export interface ProductCostRow extends ProductCostWithTotal {
  productName: string;
  category: string;
}

export interface CostsFilters {
  search: string;
  category: string;
}

export interface DragFillState {
  isActive: boolean;
  startRow: number;
  startCol: CostKey;
  value: number;
  selectedRows: number[];
}

// ============================================
// HOOK
// ============================================

export function useCosts() {
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;
  const { products } = useStoresAndProducts();

  const productsForCosts = useMemo(
    () =>
      products.map((p) => ({
        id: p.external_id,
        name: p.name,
        category: p.category || "",
      })),
    [products],
  );

  const [costs, setCosts] = useState<ProductCostRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    productsWithCosts: 0,
    hasCosts: false,
  });

  const refreshCosts = useCallback(async () => {
    if (!companyId) {
      setCosts([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const data = await costsRepo.getProductCostsWithProducts(
      companyId,
      productsForCosts,
    );
    setCosts(data);
    const [productsWithCosts, hasCosts] = await Promise.all([
      costsRepo.countProductsWithCosts(companyId),
      costsRepo.hasCostsDefined(companyId),
    ]);
    setStats({
      totalProducts: data.length,
      productsWithCosts,
      hasCosts,
    });
    setIsLoading(false);
  }, [companyId, productsForCosts]);

  useEffect(() => {
    refreshCosts();
  }, [refreshCosts]);

  const [filters, setFilters] = useState<CostsFilters>({
    search: "",
    category: "",
  });
  const [dragFill, setDragFill] = useState<DragFillState>({
    isActive: false,
    startRow: -1,
    startCol: "rawMaterial",
    value: 0,
    selectedRows: [],
  });

  const categories = useMemo(() => {
    const cats = Array.from(new Set(costs.map((c) => c.category)));
    return cats.sort((a, b) => a.localeCompare(b, "he"));
  }, [costs]);

  const filteredCosts = useMemo(() => {
    return costs.filter((cost) => {
      if (filters.search) {
        const search = filters.search.toLowerCase();
        if (
          !cost.productName.toLowerCase().includes(search) &&
          !cost.productId.toString().includes(search)
        ) {
          return false;
        }
      }
      if (filters.category && cost.category !== filters.category) return false;
      return true;
    });
  }, [costs, filters]);

  const updateCost = useCallback(
    async (productId: number, key: CostKey, value: number) => {
      if (!companyId) return;
      await costsRepo.updateSingleCostValue(companyId, productId, key, value);
      refreshCosts();
    },
    [companyId, refreshCosts],
  );

  const handleFilterChange = useCallback(
    (key: keyof CostsFilters, value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setFilters({ search: "", category: "" });
  }, []);

  const handleResetAll = useCallback(async () => {
    if (!companyId) return;
    await costsRepo.resetAllCosts(companyId);
    refreshCosts();
  }, [companyId, refreshCosts]);

  const startDragFill = useCallback(
    (rowIndex: number, col: CostKey, value: number) => {
      setDragFill({
        isActive: true,
        startRow: rowIndex,
        startCol: col,
        value,
        selectedRows: [rowIndex],
      });
    },
    [],
  );

  const updateDragFill = useCallback((rowIndex: number) => {
    setDragFill((prev) => {
      if (!prev.isActive) return prev;
      const start = Math.min(prev.startRow, rowIndex);
      const end = Math.max(prev.startRow, rowIndex);
      const selectedRows = Array.from(
        { length: end - start + 1 },
        (_, i) => start + i,
      );
      return { ...prev, selectedRows };
    });
  }, []);

  const endDragFill = useCallback(async () => {
    if (!dragFill.isActive || dragFill.selectedRows.length <= 1 || !companyId) {
      setDragFill({
        isActive: false,
        startRow: -1,
        startCol: "rawMaterial",
        value: 0,
        selectedRows: [],
      });
      return;
    }

    const productIds = dragFill.selectedRows
      .map((rowIndex) => filteredCosts[rowIndex]?.productId)
      .filter((id): id is number => id !== undefined);

    await costsRepo.fillCostValue(
      companyId,
      productIds,
      dragFill.startCol,
      dragFill.value,
    );
    refreshCosts();
    setDragFill({
      isActive: false,
      startRow: -1,
      startCol: "rawMaterial",
      value: 0,
      selectedRows: [],
    });
  }, [dragFill, filteredCosts, companyId, refreshCosts]);

  const cancelDragFill = useCallback(() => {
    setDragFill({
      isActive: false,
      startRow: -1,
      startCol: "rawMaterial",
      value: 0,
      selectedRows: [],
    });
  }, []);

  return {
    costs: filteredCosts,
    allCosts: costs,
    categories,
    stats,
    isLoading,
    filters,
    handleFilterChange,
    clearFilters,
    updateCost,
    refreshCosts,
    resetAll: handleResetAll,
    dragFill,
    startDragFill,
    updateDragFill,
    endDragFill,
    cancelDragFill,
  };
}

export { COST_KEYS, COST_LABELS } from "@/types/costs";
export type { CostKey } from "@/types/costs";
