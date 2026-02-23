// ============================================
// NETWORK DATA LOADER
// ============================================

import type {
  Network,
  NetworkPricing,
  NetworkProductPrice,
} from "@/types/network";
import { generateNetworkId } from "@/types/network";

const KEYS = {
  NETWORKS: "bakery_networks",
  PRICING_PREFIX: "bakery_network_pricing_",
};

// ============================================
// NETWORKS CRUD
// ============================================

export function getNetworks(): Network[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(KEYS.NETWORKS);
  return data ? JSON.parse(data) : [];
}

export function saveNetworks(networks: Network[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.NETWORKS, JSON.stringify(networks));
}

export function getNetwork(networkId: string): Network | null {
  const networks = getNetworks();
  return networks.find((n) => n.id === networkId) ?? null;
}

export function createNetwork(name: string, storeIds: number[] = []): Network {
  const network: Network = {
    id: generateNetworkId(),
    name,
    storeIds,
    detachedStoreIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const networks = getNetworks();
  networks.push(network);
  saveNetworks(networks);

  return network;
}

export function updateNetwork(
  networkId: string,
  updates: Partial<Network>,
): void {
  const networks = getNetworks();
  const index = networks.findIndex((n) => n.id === networkId);
  if (index === -1) return;

  const current = networks[index];
  if (!current) return;

  networks[index] = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveNetworks(networks);
}

export function deleteNetwork(networkId: string): void {
  const networks = getNetworks().filter((n) => n.id !== networkId);
  saveNetworks(networks);
  localStorage.removeItem(`${KEYS.PRICING_PREFIX}${networkId}`);
}

// ============================================
// NETWORK PRICING
// ============================================

export function getNetworkPricing(networkId: string): NetworkPricing | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(`${KEYS.PRICING_PREFIX}${networkId}`);
  return data ? JSON.parse(data) : null;
}

export function saveNetworkPricing(pricing: NetworkPricing): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    `${KEYS.PRICING_PREFIX}${pricing.networkId}`,
    JSON.stringify(pricing),
  );
}

export function updateNetworkProductPrice(
  networkId: string,
  productId: number,
  updates: Partial<NetworkProductPrice>,
): void {
  const pricing = getNetworkPricing(networkId);
  if (!pricing) return;

  const product = pricing.products.find((p) => p.productId === productId);
  if (product) {
    Object.assign(product, updates);
    product.finalPrice = product.basePrice * (1 - product.discount / 100);
  }

  pricing.lastUpdated = new Date().toISOString();
  saveNetworkPricing(pricing);
}

// ============================================
// INIT FROM EXISTING DATA
// ============================================

export function initNetworksFromStores(
  stores: Array<{ id: number; network?: string | null }>,
): Network[] {
  const existingNetworks = getNetworks();

  if (existingNetworks.length > 0) return existingNetworks;

  const networkMap = new Map<string, number[]>();

  stores.forEach((store) => {
    if (store.network && store.network.trim()) {
      const name = store.network.trim();
      const existing = networkMap.get(name) ?? [];
      existing.push(store.id);
      networkMap.set(name, existing);
    }
  });

  const networks: Network[] = [];
  networkMap.forEach((storeIds, name) => {
    networks.push({
      id: generateNetworkId(),
      name,
      storeIds,
      detachedStoreIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  saveNetworks(networks);
  return networks;
}

// ============================================
// STORE NETWORK QUERIES
// ============================================

export function getNetworkForStore(storeId: number): Network | null {
  const networks = getNetworks();
  return networks.find((n) => n.storeIds.includes(storeId)) ?? null;
}

export function getNetworkStoresData<
  T extends { id: number; sales_2025?: number },
>(
  networkId: string,
  allStores: T[],
): {
  stores: T[];
  avgSales: number;
  totalSales: number;
} {
  const network = getNetwork(networkId);
  if (!network) return { stores: [], avgSales: 0, totalSales: 0 };

  const networkStores = allStores.filter((s) =>
    network.storeIds.includes(s.id),
  );

  const totalSales = networkStores.reduce(
    (sum, s) => sum + (s.sales_2025 || 0),
    0,
  );
  const avgSales =
    networkStores.length > 0 ? totalSales / networkStores.length : 0;

  return { stores: networkStores, avgSales, totalSales };
}
