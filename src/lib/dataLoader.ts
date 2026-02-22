import type {
  StoreData,
  ProductData,
  FiltersData,
  HolidaysData,
  StoreWithStatus,
  ProductWithStatus,
} from "@/types/data";
import { addStatusToStores, addStatusToProducts } from "./calculations";
import {
  validateStores,
  validateProducts,
  validateFilters,
  validateHolidays,
} from "@/validations/dataSchemas";

// Import JSON data
import storesJson from "./data/stores.json";
import productsJson from "./data/products.json";
import filtersJson from "./data/filters.json";
import holidaysJson from "./data/holidays.json";

// ============================================
// DATA INITIALIZATION WITH VALIDATION
// ============================================

let storesWithStatus: StoreWithStatus[] = [];
let productsWithStatus: ProductWithStatus[] = [];
let filters: FiltersData | null = null;
let holidays: HolidaysData | null = null;
let isInitialized = false;
let initError: Error | null = null;

function initializeData(): void {
  if (isInitialized) return;

  try {
    // Validate and load stores
    const validatedStores = validateStores(storesJson);
    storesWithStatus = addStatusToStores(validatedStores as StoreData[]);

    // Validate and load products
    const validatedProducts = validateProducts(productsJson);
    productsWithStatus = addStatusToProducts(
      validatedProducts as ProductData[],
    );

    // Validate and load filters
    filters = validateFilters(filtersJson) as FiltersData;

    // Validate and load holidays
    holidays = validateHolidays(holidaysJson) as HolidaysData;

    isInitialized = true;
    // eslint-disable-next-line no-console
    console.log(
      `✅ Data loaded: ${storesWithStatus.length} stores, ${productsWithStatus.length} products`,
    );
  } catch (error) {
    initError =
      error instanceof Error ? error : new Error("Unknown error loading data");
    console.error("❌ Failed to initialize data:", initError.message);

    // Fallback to empty arrays to prevent crashes
    storesWithStatus = [];
    productsWithStatus = [];
    filters = { cities: [], networks: [], drivers: [], agents: [] };
    holidays = { weeks: {}, types: {} as HolidaysData["types"] };
    isInitialized = true;
  }
}

// Initialize on module load
initializeData();

// ============================================
// ERROR CHECKING
// ============================================

export function getInitError(): Error | null {
  return initError;
}

export function isDataLoaded(): boolean {
  return isInitialized && !initError;
}

// ============================================
// STORES
// ============================================

/**
 * Get all stores with calculated status
 */
export function getStores(): StoreWithStatus[] {
  return storesWithStatus;
}

/**
 * Get store by ID (number)
 */
export function getStoreById(id: number): StoreWithStatus | undefined {
  return storesWithStatus.find((s) => s.id === id);
}

/**
 * Get store by ID (string - for URL params)
 */
export function getStoreByStringId(id: string): StoreWithStatus | undefined {
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return undefined;
  return getStoreById(numId);
}

/**
 * Get stores count
 */
export function getStoresCount(): number {
  return storesWithStatus.length;
}

/**
 * Get stores by city
 */
export function getStoresByCity(city: string): StoreWithStatus[] {
  return storesWithStatus.filter((s) => s.city === city);
}

/**
 * Get stores by agent
 */
export function getStoresByAgent(agent: string): StoreWithStatus[] {
  return storesWithStatus.filter((s) => s.agent === agent);
}

// ============================================
// PRODUCTS
// ============================================

/**
 * Get all products with calculated status
 */
export function getProducts(): ProductWithStatus[] {
  return productsWithStatus;
}

/**
 * Get product by ID (number)
 */
export function getProductById(id: number): ProductWithStatus | undefined {
  return productsWithStatus.find((p) => p.id === id);
}

/**
 * Get product by ID (string - for URL params)
 */
export function getProductByStringId(
  id: string,
): ProductWithStatus | undefined {
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return undefined;
  return getProductById(numId);
}

/**
 * Get products count
 */
export function getProductsCount(): number {
  return productsWithStatus.length;
}

/**
 * Get products by category
 */
export function getProductsByCategory(category: string): ProductWithStatus[] {
  return productsWithStatus.filter((p) => p.category === category);
}

/**
 * Get unique categories
 */
export function getCategories(): string[] {
  const categories = new Set(productsWithStatus.map((p) => p.category));
  return Array.from(categories).sort((a, b) => a.localeCompare(b, "he"));
}

// ============================================
// FILTERS
// ============================================

/**
 * Get all filter options
 */
export function getFilters(): FiltersData {
  return filters || { cities: [], networks: [], drivers: [], agents: [] };
}

/**
 * Get unique cities (cleaned)
 */
export function getCities(): string[] {
  if (!filters) return [];
  const uniqueCities = Array.from(new Set(filters.cities.map((c) => c.trim())));
  return uniqueCities.sort((a, b) => a.localeCompare(b, "he"));
}

/**
 * Get unique networks
 */
export function getNetworks(): string[] {
  if (!filters) return [];
  return Array.from(filters.networks).sort((a, b) => a.localeCompare(b, "he"));
}

/**
 * Get unique drivers
 */
export function getDrivers(): string[] {
  if (!filters) return [];
  return Array.from(filters.drivers).sort((a, b) => a.localeCompare(b, "he"));
}

/**
 * Get unique agents
 */
export function getAgents(): string[] {
  if (!filters) return [];
  return Array.from(filters.agents).sort((a, b) => a.localeCompare(b, "he"));
}

// ============================================
// HOLIDAYS
// ============================================

/**
 * Get holidays data
 */
export function getHolidays(): HolidaysData {
  return holidays || { weeks: {}, types: {} as HolidaysData["types"] };
}

/**
 * Get holiday info for a specific week
 */
export function getHolidayForWeek(
  weekStart: string,
): { name: string; type: string; emoji: string } | null {
  if (!holidays) return null;
  const week = holidays.weeks[weekStart];
  if (!week) return null;

  const typeInfo = holidays.types[week.type];
  return {
    name: week.name,
    type: week.type,
    emoji: typeInfo?.emoji || "",
  };
}

/**
 * Get holiday info for a month
 */
export function getHolidayForMonth(
  year: number,
  month: number,
): { name: string; type: string; emoji: string } | null {
  if (!holidays) return null;

  for (const [weekStart, week] of Object.entries(holidays.weeks)) {
    const weekDate = new Date(weekStart);
    if (weekDate.getFullYear() === year && weekDate.getMonth() + 1 === month) {
      const typeInfo = holidays.types[week.type];
      return {
        name: week.name,
        type: week.type,
        emoji: typeInfo?.emoji || "",
      };
    }
  }
  return null;
}

// ============================================
// AGGREGATED STATS
// ============================================

export interface OverviewStats {
  totalStores: number;
  totalProducts: number;
  totalQuantity2025: number;
  totalSales2025: number;
  avgMetric12v12: number;
  avgMetric6v6: number;
  storesByStatus: Record<string, number>;
}

/**
 * Get overview statistics
 */
export function getOverviewStats(): OverviewStats {
  const stores = getStores();

  if (stores.length === 0) {
    return {
      totalStores: 0,
      totalProducts: 0,
      totalQuantity2025: 0,
      totalSales2025: 0,
      avgMetric12v12: 0,
      avgMetric6v6: 0,
      storesByStatus: {},
    };
  }

  const totalQuantity2025 = stores.reduce((sum, s) => sum + s.qty_2025, 0);
  const totalSales2025 = stores.reduce((sum, s) => sum + s.sales_2025, 0);
  const avgMetric12v12 =
    stores.reduce((sum, s) => sum + s.metric_12v12, 0) / stores.length;
  const avgMetric6v6 =
    stores.reduce((sum, s) => sum + s.metric_6v6, 0) / stores.length;

  const storesByStatus: Record<string, number> = {
    עליה_חדה: 0,
    צמיחה: 0,
    יציב: 0,
    ירידה: 0,
    התרסקות: 0,
  };

  stores.forEach((s) => {
    const status = s.status_long;
    if (storesByStatus[status] !== undefined) {
      storesByStatus[status]++;
    }
  });

  return {
    totalStores: stores.length,
    totalProducts: getProductsCount(),
    totalQuantity2025,
    totalSales2025,
    avgMetric12v12,
    avgMetric6v6,
    storesByStatus,
  };
}

// ============================================
// TOP/BOTTOM STORES
// ============================================

/**
 * Get top performing stores
 */
export function getTopStores(limit = 10): StoreWithStatus[] {
  return [...storesWithStatus]
    .sort((a, b) => b.metric_12v12 - a.metric_12v12)
    .slice(0, limit);
}

/**
 * Get bottom performing stores
 */
export function getBottomStores(limit = 10): StoreWithStatus[] {
  return [...storesWithStatus]
    .sort((a, b) => a.metric_12v12 - b.metric_12v12)
    .slice(0, limit);
}

/**
 * Get stores in alert (התרסקות or ירידה)
 */
export function getAlertStores(): StoreWithStatus[] {
  return storesWithStatus.filter(
    (s) => s.status_long === "התרסקות" || s.status_long === "ירידה",
  );
}

/**
 * Get store rank in city
 */
export function getStoreRankInCity(
  storeId: number,
): { rank: number; total: number } | null {
  const store = getStoreById(storeId);
  if (!store) return null;

  const cityStores = getStoresByCity(store.city).sort(
    (a, b) => b.metric_12v12 - a.metric_12v12,
  );

  const rank = cityStores.findIndex((s) => s.id === storeId) + 1;
  return { rank, total: cityStores.length };
}
