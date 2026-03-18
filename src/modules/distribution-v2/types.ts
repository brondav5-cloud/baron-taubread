/**
 * Distribution V2 — types and contracts.
 * Single source of truth for the unified distribution screen.
 */

export type GroupByMode = "products" | "customers" | "drivers";

export interface DistributionV2Filters {
  dateFrom: string;
  dateTo: string;
  cities: string[];
  networks: string[];
  drivers: string[];
  agents: string[];
  search: string;
}

export interface DistributionV2Kpi {
  totalRows: number;
  totalQuantity: number;
  totalReturns: number;
  totalSales: number;
  storesCount: number;
  productsCount: number;
}

export interface DistributionV2Row {
  id: string;
  month?: string;
  customerId?: number;
  customer?: string;
  network?: string;
  city?: string;
  productId?: number;
  product?: string;
  productCategory?: string;
  quantity: number;
  returns: number;
  returnsPct?: number;
  sales?: number;
  driver?: string;
  agent?: string;
}

export interface DistributionV2FilterOptions {
  cities: string[];
  networks: string[];
  drivers: string[];
  agents: string[];
}

/** Column keys for table and per-column filter */
export const DISTRIBUTION_V2_COLUMNS = [
  "month",
  "customerId",
  "customer",
  "network",
  "city",
  "productId",
  "product",
  "productCategory",
  "quantity",
  "returns",
  "sales",
  "driver",
  "agent",
] as const;

export type DistributionV2ColumnKey = (typeof DISTRIBUTION_V2_COLUMNS)[number];

export type ColumnFiltersState = Partial<Record<DistributionV2ColumnKey, string>>;

export interface UseDistributionV2Return {
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  filters: DistributionV2Filters;
  setFilters: (updater: (prev: DistributionV2Filters) => DistributionV2Filters) => void;
  filterOptions: DistributionV2FilterOptions;
  columnFilters: ColumnFiltersState;
  setColumnFilter: (column: DistributionV2ColumnKey, value: string) => void;
  clearColumnFilters: () => void;
  groupBy: GroupByMode;
  setGroupBy: (mode: GroupByMode) => void;
  rows: DistributionV2Row[];
  /** Rows sorted by groupBy, for display (possibly paginated) */
  displayRows: DistributionV2Row[];
  kpi: DistributionV2Kpi | null;
  totalRows: number;
  /** Pagination */
  pageSize: number;
  setPageSize: (size: number) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
}
