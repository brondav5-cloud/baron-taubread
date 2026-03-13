import type {
  AggregatedStore,
  AggregatedProduct,
  AggregatedStoreProduct,
} from "@/types/supabase";

export interface UploadPayload {
  filename: string;
  stores: AggregatedStore[];
  products: AggregatedProduct[];
  storeProducts?: AggregatedStoreProduct[];
  filters: {
    cities: string[];
    networks: string[];
    drivers: string[];
    agents: string[];
    categories: string[];
  };
  periods: {
    all: string[];
    start: string;
    end: string;
    currentYear: number;
    previousYear: number;
  };
  stats: {
    rowsCount: number;
    rowsSkipped?: number;
    skipReasons?: Record<string, number>;
    storesCount: number;
    productsCount: number;
    storeProductsCount?: number;
    totalGrossQty?: number;
    totalNetQty?: number;
    totalReturnsQty?: number;
    totalSalesAmount?: number;
    processingTimeMs: number;
  };
}
