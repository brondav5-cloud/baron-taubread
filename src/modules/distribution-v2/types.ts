/**
 * Distribution V2 — types and contracts.
 * Single source of truth for the unified distribution screen.
 */

export type GroupByMode = "products" | "customers" | "drivers";

/** Table display: flat list of rows or grouped by product/customer/driver */
export type DistributionViewMode = "flat" | "grouped";

/** One collapsible group in the table (by product / customer / driver) */
export interface DistributionV2GroupBlock {
  id: string;
  label: string;
  subLabel?: string;
  rows: DistributionV2Row[];
  rowCount: number;
  uniqueStoreCount: number;
  periodCount: number;
  totalQuantity: number;
  totalReturns: number;
  totalSales: number;
}

export interface DistributionV2Filters {
  dateFrom: string;
  dateTo: string;
  cities: string[];
  networks: string[];
  drivers: string[];
  agents: string[];
  search: string;
}

/** Aggregates over the currently filtered rows (panel + column filters) */
export interface DistributionV2SummaryStats {
  rowCount: number;
  storeCount: number;
  cityCount: number;
  networkCount: number;
  driverCount: number;
  agentCount: number;
  productCount: number;
  categoryCount: number;
  /** Distinct month labels in selection */
  periodCount: number;
  totalQuantity: number;
  totalReturns: number;
  totalSales: number;
  /** Weighted returns % = totalReturns / (totalQuantity + totalReturns) * 100 */
  returnsPctWeighted: number;
}

/** @deprecated use DistributionV2SummaryStats */
export interface DistributionV2Kpi {
  totalRows: number;
  totalQuantity: number;
  totalReturns: number;
  totalSales: number;
  storesCount: number;
  productsCount: number;
}

export type DistributionV2SummaryMetricKey = keyof DistributionV2SummaryStats;

export const DISTRIBUTION_V2_SUMMARY_METRIC_ORDER: {
  key: DistributionV2SummaryMetricKey;
  label: string;
  format: "int" | "money" | "percent";
}[] = [
  { key: "rowCount", label: "שורות בטבלה", format: "int" },
  { key: "storeCount", label: "מספר חנויות (ייחודי)", format: "int" },
  { key: "cityCount", label: "מספר ערים", format: "int" },
  { key: "networkCount", label: "מספר רשתות", format: "int" },
  { key: "driverCount", label: "מספר נהגים", format: "int" },
  { key: "agentCount", label: "מספר סוכנים", format: "int" },
  { key: "productCount", label: "מספר מוצרים", format: "int" },
  { key: "categoryCount", label: "מספר קטגוריות", format: "int" },
  { key: "periodCount", label: "מספר חודשים (תקופות)", format: "int" },
  { key: "totalQuantity", label: "סה״כ כמות", format: "int" },
  { key: "totalReturns", label: "סה״כ חזרות", format: "int" },
  { key: "totalSales", label: "סה״כ מכירות", format: "money" },
  { key: "returnsPctWeighted", label: "אחוז חזרות (משוקלל)", format: "percent" },
];

export const DISTRIBUTION_V2_SUMMARY_DEFAULT_KEYS: DistributionV2SummaryMetricKey[] = [
  "storeCount",
  "cityCount",
  "productCount",
  "totalQuantity",
  "totalReturns",
  "totalSales",
  "rowCount",
];

export interface DistributionV2Row {
  id: string;
  month?: string;
  /** End-of-month date for the period (DD/MM/YYYY) */
  periodDate?: string;
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
  "periodDate",
  "customerId",
  "customer",
  "network",
  "city",
  "productId",
  "product",
  "productCategory",
  "quantity",
  "returns",
  "returnsPct",
  "sales",
  "driver",
  "agent",
] as const;

export type DistributionV2ColumnKey = (typeof DISTRIBUTION_V2_COLUMNS)[number];

export type ColumnFiltersState = Partial<Record<DistributionV2ColumnKey, string>>;

/** Multi-select exact match per column (smart filter) */
export type ColumnPicklistsState = Partial<Record<DistributionV2ColumnKey, string[]>>;

export interface UseDistributionV2Return {
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  filters: DistributionV2Filters;
  setFilters: (updater: (prev: DistributionV2Filters) => DistributionV2Filters) => void;
  filterOptions: DistributionV2FilterOptions;
  columnFilters: ColumnFiltersState;
  setColumnFilter: (column: DistributionV2ColumnKey, value: string) => void;
  columnPicklists: ColumnPicklistsState;
  setColumnPicklist: (column: DistributionV2ColumnKey, values: string[]) => void;
  clearColumnFilters: () => void;
  /** Rows after panel filters only — for building column filter value lists */
  rowsBeforeColumnFilter: DistributionV2Row[];
  groupBy: GroupByMode;
  setGroupBy: (mode: GroupByMode) => void;
  rows: DistributionV2Row[];
  /** "flat" = list of rows; "grouped" = one row per group with expand */
  viewMode: DistributionViewMode;
  setViewMode: (mode: DistributionViewMode) => void;
  /** Paginated rows for flat view */
  displayRows: DistributionV2Row[];
  /** Paginated group blocks for grouped view */
  displayGroupBlocks: DistributionV2GroupBlock[];
  groupCount: number;
  summaryStats: DistributionV2SummaryStats | null;
  kpi: DistributionV2Kpi | null;
  totalRows: number;
  /** Pagination: applies to rows (flat) or groups (grouped) */
  pageSize: number;
  setPageSize: (size: number) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  /** For pagination label: rows vs groups */
  totalItems: number;
  /** Latest period end date in current data (DD/MM/YYYY), for "data inclusive until" banner */
  dataLastDate: string | null;
  sortColumn: DistributionV2ColumnKey | null;
  sortDirection: "asc" | "desc";
  setSort: (column: DistributionV2ColumnKey) => void;
}
