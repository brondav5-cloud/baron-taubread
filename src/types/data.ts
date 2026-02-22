// ============================================
// STORE DATA TYPES (matches stores.json)
// ============================================

export interface MonthlyData {
  [period: string]: number; // "202401": 205
}

export interface StoreData {
  id: number;
  name: string;
  city: string;
  network: string;
  driver: string;
  agent: string;

  // Yearly totals
  qty_2024: number;
  qty_2025: number;
  qty_total: number;
  sales_2024: number;
  sales_2025: number;

  // Period quantities for metrics calculation
  qty_prev6: number; // Jan-Jun 2025
  qty_last6: number; // Jul-Dec 2025
  qty_prev3: number; // Oct-Dec 2024
  qty_last3: number; // Oct-Dec 2025
  qty_prev2: number; // Sep-Oct 2025
  qty_last2: number; // Nov-Dec 2025

  // Calculated metrics (percentages)
  metric_12v12: number; // Year over year
  metric_6v6: number; // Half year comparison
  metric_3v3: number; // Quarter comparison
  metric_2v2: number; // 2 month comparison

  // Peak distance
  metric_peak_distance: number;
  peak_value: number;
  current_value: number;

  // Returns
  returns_pct_prev6: number;
  returns_pct_last6: number;
  returns_change: number;

  // Monthly data
  monthly_qty: MonthlyData;
  monthly_sales: MonthlyData;
  monthly_gross: MonthlyData;
  monthly_returns?: MonthlyData;
  monthly_deliveries?: MonthlyData;
}

// ============================================
// PRODUCT DATA TYPES (matches products.json)
// ============================================

export interface ProductData {
  id: number;
  name: string;
  category: string;

  // Yearly totals
  qty_2024: number;
  qty_2025: number;
  qty_total: number;
  sales_2024: number;
  sales_2025: number;

  // Period quantities
  qty_prev6: number;
  qty_last6: number;
  qty_prev3: number;
  qty_last3: number;
  qty_prev2: number;
  qty_last2: number;

  // Metrics
  metric_12v12: number;
  metric_6v6: number;
  metric_3v3: number;
  metric_2v2: number;
  metric_peak_distance: number;
  peak_value: number;
  current_value: number;

  // Returns
  returns_pct_prev6: number;
  returns_pct_last6: number;
  returns_change: number;

  // Monthly data
  monthly_qty: MonthlyData;
  monthly_sales: MonthlyData;
}

// ============================================
// FILTERS DATA (matches filters.json)
// ============================================

export interface FiltersData {
  cities: string[];
  networks: string[];
  drivers: string[];
  agents: string[];
}

// ============================================
// HOLIDAYS DATA (matches holidays.json)
// ============================================

export type HolidayType = "closed" | "pre_holiday" | "partial" | "active";

export interface HolidayWeek {
  name: string;
  type: HolidayType;
  dates: string;
}

export interface HolidayTypeInfo {
  label: string;
  emoji: string;
}

export interface HolidaysData {
  weeks: Record<string, HolidayWeek>;
  types: Record<HolidayType, HolidayTypeInfo>;
}

// ============================================
// STATUS TYPES
// ============================================

// Long term status (based on 12v12)
export type StatusLong = "עליה_חדה" | "צמיחה" | "יציב" | "ירידה" | "התרסקות";

// Short term status (based on 2v2)
export type StatusShort = "עליה_חדה" | "יציב" | "ירידה" | "אזעקה";

// Display names
export const STATUS_DISPLAY_LONG: Record<StatusLong, string> = {
  עליה_חדה: "עליה חדה",
  צמיחה: "צמיחה",
  יציב: "יציב",
  ירידה: "ירידה",
  התרסקות: "התרסקות",
};

export const STATUS_DISPLAY_SHORT: Record<StatusShort, string> = {
  עליה_חדה: "עליה חדה",
  יציב: "יציב",
  ירידה: "ירידה",
  אזעקה: "אזעקה",
};

// Status icons
export const STATUS_ICONS: Record<StatusLong, string> = {
  עליה_חדה: "🚀",
  צמיחה: "📈",
  יציב: "➡️",
  ירידה: "📉",
  התרסקות: "⚠️",
};

// Status card colors (for dashboard cards)
export const STATUS_CARD_COLORS: Record<StatusLong, string> = {
  עליה_חדה: "bg-emerald-100 text-emerald-700",
  צמיחה: "bg-lime-100 text-lime-700",
  יציב: "bg-gray-100 text-gray-600",
  ירידה: "bg-amber-100 text-amber-700",
  התרסקות: "bg-red-100 text-red-700",
};

// Status colors
export const STATUS_COLORS_LONG: Record<
  StatusLong,
  { bg: string; text: string; border: string }
> = {
  עליה_חדה: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    border: "border-emerald-300",
  },
  צמיחה: {
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-300",
  },
  יציב: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
  ירידה: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-300",
  },
  התרסקות: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300" },
};

export const STATUS_COLORS_SHORT: Record<
  StatusShort,
  { bg: string; text: string; border: string }
> = {
  עליה_חדה: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    border: "border-emerald-300",
  },
  יציב: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
  ירידה: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-300",
  },
  אזעקה: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300" },
};

// ============================================
// EXTENDED STORE TYPE (with calculated status)
// ============================================

export interface StoreWithStatus extends StoreData {
  status_long: StatusLong;
  status_short: StatusShort;
}

export interface ProductWithStatus extends ProductData {
  status_long: StatusLong;
  status_short: StatusShort;
}
