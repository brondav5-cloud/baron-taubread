// ============================================
// DRIVER GROUPS & INDIVIDUAL DRIVERS - Supabase
// ============================================

import { createClient } from "@/lib/supabase/client";
import type {
  DriverGroup,
  IndividualDriver,
  DriverProductCost,
} from "@/types/costs";
import {
  generateDriverGroupId,
  generateIndividualDriverId,
} from "@/types/costs";

// ============================================
// DRIVER GROUPS - READ
// ============================================

export async function getDriverGroups(
  companyId: string,
): Promise<DriverGroup[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("driver_groups")
    .select("*")
    .eq("company_id", companyId);

  if (error) {
    console.error("[driverGroups.repo] getDriverGroups:", error);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    driverNames: Array.isArray(r.driver_names) ? r.driver_names : [],
    productCosts: Array.isArray(r.product_costs) ? r.product_costs : [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function getDriverGroup(
  companyId: string,
  groupId: string,
): Promise<DriverGroup | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("driver_groups")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", groupId)
    .single();

  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    driverNames: Array.isArray(data.driver_names) ? data.driver_names : [],
    productCosts: Array.isArray(data.product_costs) ? data.product_costs : [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getDriverGroupByDriverName(
  companyId: string,
  driverName: string,
): Promise<DriverGroup | null> {
  const groups = await getDriverGroups(companyId);
  return groups.find((g) => g.driverNames.includes(driverName.trim())) ?? null;
}

// ============================================
// INDIVIDUAL DRIVERS - READ
// ============================================

export async function getIndividualDrivers(
  companyId: string,
): Promise<IndividualDriver[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("individual_drivers")
    .select("*")
    .eq("company_id", companyId);

  if (error) {
    console.error("[driverGroups.repo] getIndividualDrivers:", error);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    driverName: r.driver_name,
    productCosts: Array.isArray(r.product_costs) ? r.product_costs : [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function getIndividualDriver(
  companyId: string,
  driverId: string,
): Promise<IndividualDriver | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("individual_drivers")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", driverId)
    .single();

  if (error || !data) return null;
  return {
    id: data.id,
    driverName: data.driver_name,
    productCosts: Array.isArray(data.product_costs) ? data.product_costs : [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getIndividualDriverByName(
  companyId: string,
  driverName: string,
): Promise<IndividualDriver | null> {
  const drivers = await getIndividualDrivers(companyId);
  return drivers.find((d) => d.driverName === driverName.trim()) ?? null;
}

// ============================================
// DELIVERY COST LOOKUP
// ============================================

export async function getDeliveryCostForProduct(
  companyId: string,
  driverName: string,
  productId: number,
): Promise<number> {
  const group = await getDriverGroupByDriverName(companyId, driverName);
  if (group) {
    const cost = group.productCosts.find((pc) => pc.productId === productId);
    return cost?.deliveryCost ?? 0;
  }
  const individual = await getIndividualDriverByName(companyId, driverName);
  if (individual) {
    const cost = individual.productCosts.find(
      (pc) => pc.productId === productId,
    );
    return cost?.deliveryCost ?? 0;
  }
  return 0;
}

// ============================================
// DRIVER GROUPS - WRITE
// ============================================

export async function createDriverGroup(
  companyId: string,
  name: string,
  driverNames: string[] = [],
  productCosts: DriverProductCost[] = [],
): Promise<DriverGroup> {
  const group: DriverGroup = {
    id: generateDriverGroupId(),
    name,
    driverNames,
    productCosts,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const supabase = createClient();
  await supabase.from("driver_groups").insert({
    id: group.id,
    company_id: companyId,
    name,
    driver_names: driverNames,
    product_costs: productCosts,
  });
  return group;
}

export async function updateDriverGroup(
  companyId: string,
  groupId: string,
  updates: Partial<Omit<DriverGroup, "id" | "createdAt">>,
): Promise<boolean> {
  const supabase = createClient();
  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.driverNames !== undefined) row.driver_names = updates.driverNames;
  if (updates.productCosts !== undefined)
    row.product_costs = updates.productCosts;

  const { error } = await supabase
    .from("driver_groups")
    .update(row)
    .eq("company_id", companyId)
    .eq("id", groupId);

  if (error) {
    console.error("[driverGroups.repo] updateDriverGroup:", error);
    return false;
  }
  return true;
}

export async function deleteDriverGroup(
  companyId: string,
  groupId: string,
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("driver_groups")
    .delete()
    .eq("company_id", companyId)
    .eq("id", groupId);

  if (error) {
    console.error("[driverGroups.repo] deleteDriverGroup:", error);
    return false;
  }
  return true;
}

export async function updateGroupProductCosts(
  companyId: string,
  groupId: string,
  productCosts: DriverProductCost[],
): Promise<boolean> {
  return updateDriverGroup(companyId, groupId, { productCosts });
}

// ============================================
// INDIVIDUAL DRIVERS - WRITE
// ============================================

export async function createIndividualDriver(
  companyId: string,
  driverName: string,
  productCosts: DriverProductCost[] = [],
): Promise<IndividualDriver> {
  const driver: IndividualDriver = {
    id: generateIndividualDriverId(),
    driverName,
    productCosts,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const supabase = createClient();
  await supabase.from("individual_drivers").insert({
    id: driver.id,
    company_id: companyId,
    driver_name: driverName,
    product_costs: productCosts,
  });
  return driver;
}

export async function updateIndividualDriver(
  companyId: string,
  driverId: string,
  updates: Partial<Omit<IndividualDriver, "id" | "createdAt">>,
): Promise<boolean> {
  const supabase = createClient();
  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.driverName !== undefined) row.driver_name = updates.driverName;
  if (updates.productCosts !== undefined)
    row.product_costs = updates.productCosts;

  const { error } = await supabase
    .from("individual_drivers")
    .update(row)
    .eq("company_id", companyId)
    .eq("id", driverId);

  if (error) {
    console.error("[driverGroups.repo] updateIndividualDriver:", error);
    return false;
  }
  return true;
}

export async function deleteIndividualDriver(
  companyId: string,
  driverId: string,
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("individual_drivers")
    .delete()
    .eq("company_id", companyId)
    .eq("id", driverId);

  if (error) {
    console.error("[driverGroups.repo] deleteIndividualDriver:", error);
    return false;
  }
  return true;
}

export async function updateIndividualProductCosts(
  companyId: string,
  driverId: string,
  productCosts: DriverProductCost[],
): Promise<boolean> {
  return updateIndividualDriver(companyId, driverId, { productCosts });
}
