// ============================================
// Excel parsing and processing types
// ============================================

import type { MonthlyData } from "./db";

export interface ExcelRow {
  // Old column names
  "חודש ושנה"?: string;
  "שם לקוח"?: string;
  "כמות שסופק"?: number;
  "כמות נטו "?: number;
  "כמות נטו"?: number;
  "סך מחזור מכירות "?: number;
  "סך מחזור מכירות"?: number;
  // New column names
  "חודש"?: string;
  "לקוח"?: string;
  "כמות"?: number;
  'סה"כ כמות'?: number;
  "סהכ"?: number;
  // Common columns
  "מזהה לקוח": number;
  רשת: string | null;
  עיר: string;
  "מזהה מוצר": number;
  מוצר: string;
  "קטגורית מוצרים": string;
  חזרות: number;
  "חזרות(%)"?: number;
  נהג: string;
  סוכן: string;
  [key: string]: unknown;
}

export interface ParsedPeriod {
  month: number;
  year: number;
  key: string; // "202401"
}

export interface AggregatedStore {
  external_id: number;
  name: string;
  city: string;
  network: string;
  driver: string;
  agent: string;
  monthly_qty: MonthlyData;
  monthly_sales: MonthlyData;
  monthly_gross: MonthlyData;
  monthly_returns: MonthlyData;
}

export interface AggregatedProduct {
  external_id: number;
  name: string;
  category: string;
  monthly_qty: MonthlyData;
  monthly_sales: MonthlyData;
}

export interface AggregatedStoreProduct {
  store_external_id: number;
  product_external_id: number;
  product_name: string;
  product_category: string;
  monthly_qty: MonthlyData;
  monthly_sales: MonthlyData;
  monthly_returns: MonthlyData;
}

export interface ProcessingResult {
  success: boolean;
  stores: AggregatedStore[];
  products: AggregatedProduct[];
  storeProducts: AggregatedStoreProduct[];
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
    storesCount: number;
    productsCount: number;
    processingTimeMs: number;
  };
  error?: string;
}
