// ============================================
// USE DRIVER GROUPS HOOK
// ============================================

import { useState, useCallback, useMemo, useEffect } from "react";
import type {
  DriverGroup,
  IndividualDriver,
  DriverProductCost,
} from "@/types/costs";
import { useAuth } from "@/hooks/useAuth";
import { useStoresAndProducts } from "@/context/StoresAndProductsContext";
import * as driverGroupsRepo from "@/lib/db/driverGroups.repo";

// ============================================
// TYPES
// ============================================

export interface DriverGroupWithInfo extends DriverGroup {
  storeCount: number;
  hasCosts: boolean;
}

export interface IndividualDriverWithInfo extends IndividualDriver {
  storeCount: number;
  hasCosts: boolean;
}

export interface EditModalState {
  isOpen: boolean;
  mode: "create-group" | "edit-group" | "create-individual" | "edit-individual";
  groupId: string | null;
  driverId: string | null;
}

// ============================================
// HOOK
// ============================================

export function useDriverGroups() {
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;
  const { stores } = useStoresAndProducts();

  const storesForDriver = useMemo(
    () => stores.map((s) => ({ driver: s.driver || "" })),
    [stores],
  );

  const [groups, setGroups] = useState<DriverGroupWithInfo[]>([]);
  const [individuals, setIndividuals] = useState<IndividualDriverWithInfo[]>(
    [],
  );
  const [unassigned, setUnassigned] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editModal, setEditModal] = useState<EditModalState>({
    isOpen: false,
    mode: "create-group",
    groupId: null,
    driverId: null,
  });

  const refreshAll = useCallback(async () => {
    if (!companyId) {
      setGroups([]);
      setIndividuals([]);
      setUnassigned([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const [rawGroups, rawIndividuals] = await Promise.all([
      driverGroupsRepo.getDriverGroups(companyId),
      driverGroupsRepo.getIndividualDrivers(companyId),
    ]);

    const allDrivers = Array.from(
      new Set(storesForDriver.map((s) => s.driver).filter(Boolean)),
    );
    const assignedToGroups = new Set(rawGroups.flatMap((g) => g.driverNames));
    const individualNames = new Set(rawIndividuals.map((d) => d.driverName));
    const unassignedDrivers = allDrivers.filter(
      (d) => !assignedToGroups.has(d) && !individualNames.has(d),
    );

    const groupsWithInfo: DriverGroupWithInfo[] = rawGroups.map((g) => ({
      ...g,
      storeCount: storesForDriver.filter((s) =>
        g.driverNames.includes(s.driver || ""),
      ).length,
      hasCosts:
        g.productCosts.length > 0 &&
        g.productCosts.some((pc) => pc.deliveryCost > 0),
    }));

    const individualsWithInfo: IndividualDriverWithInfo[] = rawIndividuals.map(
      (d) => ({
        ...d,
        storeCount: storesForDriver.filter((s) => s.driver === d.driverName)
          .length,
        hasCosts:
          d.productCosts.length > 0 &&
          d.productCosts.some((pc) => pc.deliveryCost > 0),
      }),
    );

    setGroups(groupsWithInfo);
    setIndividuals(individualsWithInfo);
    setUnassigned(unassignedDrivers);
    setIsLoading(false);
  }, [companyId, storesForDriver]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const stats = useMemo(
    () => ({
      totalGroups: groups.length,
      totalIndividuals: individuals.length,
      totalDriversInGroups: groups.reduce(
        (sum, g) => sum + g.driverNames.length,
        0,
      ),
      unassignedCount: unassigned.length,
      groupsWithCosts: groups.filter((g) => g.hasCosts).length,
      individualsWithCosts: individuals.filter((d) => d.hasCosts).length,
    }),
    [groups, individuals, unassigned],
  );

  const openCreateGroupModal = useCallback(() => {
    setEditModal({
      isOpen: true,
      mode: "create-group",
      groupId: null,
      driverId: null,
    });
  }, []);

  const openEditGroupModal = useCallback((groupId: string) => {
    setEditModal({ isOpen: true, mode: "edit-group", groupId, driverId: null });
  }, []);

  const openCreateIndividualModal = useCallback(() => {
    setEditModal({
      isOpen: true,
      mode: "create-individual",
      groupId: null,
      driverId: null,
    });
  }, []);

  const openEditIndividualModal = useCallback((driverId: string) => {
    setEditModal({
      isOpen: true,
      mode: "edit-individual",
      groupId: null,
      driverId,
    });
  }, []);

  const closeModal = useCallback(() => {
    setEditModal({
      isOpen: false,
      mode: "create-group",
      groupId: null,
      driverId: null,
    });
  }, []);

  const handleCreateGroup = useCallback(
    async (
      name: string,
      driverNames: string[],
      productCosts: DriverProductCost[],
    ) => {
      if (!companyId) return null;
      const newGroup = await driverGroupsRepo.createDriverGroup(
        companyId,
        name,
        driverNames,
        productCosts,
      );
      await refreshAll();
      return newGroup;
    },
    [companyId, refreshAll],
  );

  const handleUpdateGroup = useCallback(
    async (
      groupId: string,
      name: string,
      driverNames: string[],
      productCosts: DriverProductCost[],
    ) => {
      if (!companyId) return;
      await driverGroupsRepo.updateDriverGroup(companyId, groupId, {
        name,
        driverNames,
      });
      await driverGroupsRepo.updateGroupProductCosts(
        companyId,
        groupId,
        productCosts,
      );
      await refreshAll();
    },
    [companyId, refreshAll],
  );

  const handleDeleteGroup = useCallback(
    async (groupId: string) => {
      if (!companyId) return;
      await driverGroupsRepo.deleteDriverGroup(companyId, groupId);
      await refreshAll();
    },
    [companyId, refreshAll],
  );

  const handleCreateIndividual = useCallback(
    async (driverName: string, productCosts: DriverProductCost[]) => {
      if (!companyId) return null;
      const newDriver = await driverGroupsRepo.createIndividualDriver(
        companyId,
        driverName,
        productCosts,
      );
      await refreshAll();
      return newDriver;
    },
    [companyId, refreshAll],
  );

  const handleUpdateIndividual = useCallback(
    async (driverId: string, productCosts: DriverProductCost[]) => {
      if (!companyId) return;
      await driverGroupsRepo.updateIndividualProductCosts(
        companyId,
        driverId,
        productCosts,
      );
      await refreshAll();
    },
    [companyId, refreshAll],
  );

  const handleDeleteIndividual = useCallback(
    async (driverId: string) => {
      if (!companyId) return;
      await driverGroupsRepo.deleteIndividualDriver(companyId, driverId);
      await refreshAll();
    },
    [companyId, refreshAll],
  );

  return {
    groups,
    individuals,
    unassigned,
    stats,
    isLoading,
    editModal,
    openCreateGroupModal,
    openEditGroupModal,
    openCreateIndividualModal,
    openEditIndividualModal,
    closeModal,
    createGroup: handleCreateGroup,
    updateGroup: handleUpdateGroup,
    deleteGroup: handleDeleteGroup,
    createIndividual: handleCreateIndividual,
    updateIndividual: handleUpdateIndividual,
    deleteIndividual: handleDeleteIndividual,
    refreshAll,
  };
}
