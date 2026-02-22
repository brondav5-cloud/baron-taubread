// ============================================
// PROFITABILITY DATA - costs + driver groups
// ============================================

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import * as costsRepo from "@/lib/db/costs.repo";
import * as driverGroupsRepo from "@/lib/db/driverGroups.repo";
import type { ProductCostWithTotal } from "@/types/costs";
import type { ProfitCalculatorContext } from "@/lib/profitCalculations";

export function useProfitabilityData() {
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;

  const [costs, setCosts] = useState<ProductCostWithTotal[]>([]);
  const [groups, setGroups] = useState<
    Array<{
      id: string;
      name: string;
      driverNames: string[];
      productCosts: Array<{ productId: number; deliveryCost: number }>;
    }>
  >([]);
  const [individuals, setIndividuals] = useState<
    Array<{
      driverName: string;
      productCosts: Array<{ productId: number; deliveryCost: number }>;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!companyId) {
      setCosts([]);
      setGroups([]);
      setIndividuals([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const [costsData, groupsData, individualsData] = await Promise.all([
      costsRepo.getAllProductCosts(companyId),
      driverGroupsRepo.getDriverGroups(companyId),
      driverGroupsRepo.getIndividualDrivers(companyId),
    ]);
    setCosts(costsData);
    setGroups(groupsData);
    setIndividuals(individualsData);
    setIsLoading(false);
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const hasCosts = useMemo(() => costs.some((c) => c.totalCost > 0), [costs]);

  const ctx: ProfitCalculatorContext = useMemo(
    () => ({
      getProductCost: (productId: number) =>
        costs.find((c) => c.productId === productId) ?? null,
      getDeliveryCost: (driverName: string, productId: number) => {
        const group = groups.find((g) =>
          g.driverNames.includes(driverName.trim()),
        );
        if (group) {
          const c = group.productCosts.find((pc) => pc.productId === productId);
          return c?.deliveryCost ?? 0;
        }
        const ind = individuals.find((d) => d.driverName === driverName.trim());
        if (ind) {
          const c = ind.productCosts.find((pc) => pc.productId === productId);
          return c?.deliveryCost ?? 0;
        }
        return 0;
      },
      getDriverGroup: (driverName: string) => {
        const group = groups.find((g) =>
          g.driverNames.includes(driverName.trim()),
        );
        if (group) return { id: group.id, name: group.name };
        const ind = individuals.find((d) => d.driverName === driverName.trim());
        if (ind) return { id: "", name: driverName };
        return null;
      },
    }),
    [costs, groups, individuals],
  );

  return {
    costs,
    hasCosts,
    groups,
    individuals,
    isLoading,
    ctx,
    refresh: load,
  };
}
