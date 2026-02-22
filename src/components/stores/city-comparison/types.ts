import type { StoreWithStatus } from "@/types/data";

export type ViewMode = "metrics" | "data";
export type SortDirection = "asc" | "desc" | null;
export type SortKey =
  | "name"
  | "status_long"
  | "metric_12v12"
  | "metric_6v6"
  | "metric_2v2"
  | "metric_peak_distance"
  | "returns_pct_last6"
  | "gross"
  | "qty"
  | "returns"
  | "sales";

export interface CityComparisonProps {
  currentStore: StoreWithStatus;
}

export interface RankingCardProps {
  title: string;
  icon: React.ReactNode;
  rank: number;
  total: number;
  value: string;
  cityAverage: string;
  percentile: number;
  color: string;
}

export interface Rankings {
  qty: {
    rank: number;
    percentile: number;
    value: number;
    cityAverage: number;
  };
  long: {
    rank: number;
    percentile: number;
    value: number;
    cityAverage: number;
  };
  short: {
    rank: number;
    percentile: number;
    value: number;
    cityAverage: number;
  };
  total: number;
}

export interface CityTotals {
  count: number;
  qty: number;
  sales: number;
  gross: number;
  returns: number;
  returnsPct: number;
  metric_12v12: number;
  metric_6v6: number;
  metric_3v3: number;
  metric_2v2: number;
}

export interface StatusCounts {
  rising: number;
  stable: number;
  declining: number;
}
