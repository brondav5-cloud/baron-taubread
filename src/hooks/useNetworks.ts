"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getNetwork,
  createNetwork,
  updateNetwork,
  deleteNetwork,
  getNetworkPricing,
  saveNetworkPricing,
  initNetworksFromStores,
} from "@/lib/networkLoader";
import { useSupabaseData } from "./useSupabaseData";
import type { Network, NetworkPricing, NetworkWithInfo } from "@/types/network";

export function useNetworks() {
  const [networks, setNetworks] = useState<Network[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { stores: dbStores } = useSupabaseData();

  const storesForNetworks = useMemo(
    () =>
      dbStores.map((s) => ({
        id: s.external_id,
        network: s.network,
      })),
    [dbStores],
  );

  const load = useCallback(() => {
    setIsLoading(true);
    const data = initNetworksFromStores(storesForNetworks);
    setNetworks(data);
    setIsLoading(false);
  }, [storesForNetworks]);

  useEffect(() => {
    load();
  }, [load]);

  const networksWithInfo: NetworkWithInfo[] = useMemo(() => {
    return networks.map((n) => ({
      ...n,
      storeCount: n.storeIds.length,
      hasCustomPricing: getNetworkPricing(n.id) !== null,
    }));
  }, [networks]);

  const addNetwork = useCallback(
    (name: string, storeIds: number[] = []) => {
      createNetwork(name, storeIds);
      load();
    },
    [load],
  );

  const editNetwork = useCallback(
    (networkId: string, updates: Partial<Network>) => {
      updateNetwork(networkId, updates);
      load();
    },
    [load],
  );

  const removeNetwork = useCallback(
    (networkId: string) => {
      deleteNetwork(networkId);
      load();
    },
    [load],
  );

  const storesWithoutNetwork = useMemo(() => {
    const assignedIds = new Set(networks.flatMap((n) => n.storeIds));
    return storesForNetworks.filter((s) => !assignedIds.has(s.id));
  }, [networks, storesForNetworks]);

  return {
    networks: networksWithInfo,
    isLoading,
    addNetwork,
    editNetwork,
    removeNetwork,
    refresh: load,
    storesWithoutNetwork,
  };
}

export function useNetworkPricing(networkId: string) {
  const [pricing, setPricing] = useState<NetworkPricing | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    setIsLoading(true);
    const data = getNetworkPricing(networkId);
    setPricing(data);
    setIsLoading(false);
  }, [networkId]);

  useEffect(() => {
    load();
  }, [load]);

  const savePricing = useCallback(
    (products: NetworkPricing["products"]) => {
      const newPricing: NetworkPricing = {
        networkId,
        products,
        lastUpdated: new Date().toISOString(),
      };
      saveNetworkPricing(newPricing);
      load();
    },
    [networkId, load],
  );

  return {
    pricing,
    isLoading,
    savePricing,
    refresh: load,
  };
}

export function useNetworkDetail(networkId: string) {
  const [network, setNetwork] = useState<Network | null>(null);
  const { stores: dbStores } = useSupabaseData();

  useEffect(() => {
    const data = getNetwork(networkId);
    setNetwork(data);
  }, [networkId]);

  const stores = useMemo(() => {
    if (!network) return [];
    return dbStores
      .filter((s) => network.storeIds.includes(s.external_id))
      .map((s) => ({
        id: s.external_id,
        name: s.name,
        city: s.city ?? "",
        network: s.network ?? "",
      }));
  }, [network, dbStores]);

  return { network, stores };
}
