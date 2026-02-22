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
import { getStores } from "@/lib/dataLoader";
import type { Network, NetworkPricing, NetworkWithInfo } from "@/types/network";

export function useNetworks() {
  const [networks, setNetworks] = useState<Network[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    setIsLoading(true);
    const data = initNetworksFromStores();
    setNetworks(data);
    setIsLoading(false);
  }, []);

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
    const allStores = getStores();
    const assignedIds = new Set(networks.flatMap((n) => n.storeIds));
    return allStores.filter((s) => !assignedIds.has(s.id));
  }, [networks]);

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

  useEffect(() => {
    const data = getNetwork(networkId);
    setNetwork(data);
  }, [networkId]);

  const stores = useMemo(() => {
    if (!network) return [];
    const allStores = getStores();
    return allStores.filter((s) => network.storeIds.includes(s.id));
  }, [network]);

  return { network, stores };
}
