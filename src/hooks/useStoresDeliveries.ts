"use client";

import { useState, useEffect } from "react";
import { getDeliveriesByPeriod } from "@/lib/db/deliveries.repo";
import * as driverGroupsRepo from "@/lib/db/driverGroups.repo";

export function useStoresDeliveries(
  companyId: string | null,
  primaryMonths: string[],
  compareEnabled: boolean,
  compareMonths: string[],
) {
  const [deliveriesByStore, setDeliveriesByStore] = useState<
    Map<number, number>
  >(new Map());
  const [deliveriesByStoreCompare, setDeliveriesByStoreCompare] = useState<
    Map<number, number>
  >(new Map());
  const [driverToGroup, setDriverToGroup] = useState<Map<string, string>>(
    new Map(),
  );

  // Fetch driver groups
  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      driverGroupsRepo.getDriverGroups(companyId),
      driverGroupsRepo.getIndividualDrivers(companyId),
    ]).then(([groups, individuals]) => {
      const map = new Map<string, string>();
      groups.forEach((g) => {
        g.driverNames.forEach((d) => map.set(d.trim(), g.name));
      });
      individuals.forEach((i) => map.set(i.driverName.trim(), i.driverName));
      setDriverToGroup(map);
    });
  }, [companyId]);

  // Stable key to avoid unnecessary re-fetches
  const primaryMonthsKey = primaryMonths.join(",");
  const compareMonthsKey = compareMonths.join(",");

  // Fetch primary period deliveries
  useEffect(() => {
    if (!companyId || primaryMonths.length === 0) {
      setDeliveriesByStore(new Map());
      return;
    }
    getDeliveriesByPeriod(companyId, primaryMonths).then((rows) => {
      const map = new Map<number, number>();
      rows.forEach((r) => {
        const curr = map.get(r.store_external_id) ?? 0;
        map.set(r.store_external_id, curr + r.deliveries_count);
      });
      setDeliveriesByStore(map);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, primaryMonthsKey]);

  // Fetch compare period deliveries
  useEffect(() => {
    if (!companyId || !compareEnabled || compareMonths.length === 0) {
      setDeliveriesByStoreCompare(new Map());
      return;
    }
    getDeliveriesByPeriod(companyId, compareMonths).then((rows) => {
      const map = new Map<number, number>();
      rows.forEach((r) => {
        const curr = map.get(r.store_external_id) ?? 0;
        map.set(r.store_external_id, curr + r.deliveries_count);
      });
      setDeliveriesByStoreCompare(map);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, compareEnabled, compareMonthsKey]);

  return { deliveriesByStore, deliveriesByStoreCompare, driverToGroup };
}
