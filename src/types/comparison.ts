// ============================================
// Comparison page — shared types and constants
// ============================================

export interface ComparisonStore {
  id: string;
  external_id: number;
  name: string;
  city: string;
  network: string;
  driver: string;
  driver_group: string | null;
  agent: string;
  metric_12v12: number;
  metric_6v6: number;
  metric_3v3: number;
  metric_2v2: number;
  metric_peak_distance: number;
  returns_pct_last6: number;
  status_long: string;
  status_short: string;
  sales_current_year: number;
  monthly_qty: Record<string, number>;
  monthly_sales: Record<string, number>;
  monthly_gross: Record<string, number>;
  monthly_returns: Record<string, number>;
}

export interface CityStats {
  avg12v12: number;
  avg6v6: number;
  avg2v2: number;
  avgReturns: number;
  totalSales: number;
  count: number;
}

export interface ComparisonDataPoint {
  metric: string;
  [key: string]: string | number;
}

export interface CompareFilters {
  cities: string[];
  networks: string[];
  agents: string[];
  drivers: string[];
  driver_groups: string[];
  status_long: string[];
  status_short: string[];
}

export const CHART_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#84cc16",
  "#06b6d4",
];
