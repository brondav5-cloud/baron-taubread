// ============================================================
// PRODUCT DELIVERY TYPES
// סוגי נתונים לקובץ פירוט מוצרים (שבועי לפי חנות+מוצר)
// ============================================================

// Aggregated delivery data per store × week/month (for store_deliveries table)
export interface StoreDeliveryAggregate {
  storeExternalId: number;
  storeName: string;
  year: number;
  month: number;
  week: number | null; // ISO week number, null = monthly total
  deliveriesCount: number;
  totalValue: number;
  totalQuantity: number;
}

// One aggregated record per store × product × month (for store_product_monthly_dist).
// year + month come from Excel col B (document date) and col C (חודש) — not from col D.
export interface MonthlyDistRecord {
  storeExternalId:       number;
  storeName:             string;
  productName:           string;
  productNameNormalized: string;
  year:                  number;
  month:                 number;
  grossQty:              number;
  returnsQty:            number;
  netQty:                number;
  totalValue:            number;
  deliveryCount:         number;
}

// One aggregated record per store × product × week
export interface AggregatedWeeklyRecord {
  storeExternalId: number;
  storeName: string;
  productName: string;
  productNameNormalized: string; // TRIM + LOWER for DB matching
  weekStartDate: string;         // ISO "2024-01-28"
  year: number;
  month: number;
  grossQty: number;              // כמות (before returns)
  returnsQty: number;            // החזרות
  netQty: number;                // סה"כ כמות
  deliveryCount: number;        // unique delivery dates this week for this store+product
  totalValue: number;            // סהכ (sales value), optional in Excel
}

export interface ProductDeliveryProcessingResult {
  success: boolean;
  records: AggregatedWeeklyRecord[];         // → store_product_weekly
  distRecords: MonthlyDistRecord[];           // → store_product_monthly_dist
  storeDeliveries: StoreDeliveryAggregate[];  // → store_deliveries
  stats: {
    rowsProcessed: number;
    rowsSkipped: number;
    storesCount: number;
    productsCount: number;
    weeksCount: number;
    totalGrossQty: number;
    totalReturnsQty: number;
    periodStart: string; // "YYYY-MM-DD" — based on week_start_date (col D)
    periodEnd: string;   // "YYYY-MM-DD" — based on week_start_date (col D)
    // Year-month range for store_product_monthly_dist (from col B/C).
    // Encoded as YYYYMM integer, e.g., 202401. Used to delete stale dist records.
    distYearMonthFrom: number;
    distYearMonthTo:   number;
    processingTimeMs: number;
  };
  error?: string;
}

export interface ProductDeliveryUploadPayload {
  filename: string;
  records: AggregatedWeeklyRecord[];
  distRecords?: MonthlyDistRecord[];          // sent only on last chunk
  storeDeliveries?: StoreDeliveryAggregate[]; // sent only on last chunk
  stats: ProductDeliveryProcessingResult["stats"];
  chunkIndex: number;
  totalChunks: number;
}

// DB row shape
export interface DbStoreProductWeekly {
  id: string;
  company_id: string;
  store_external_id: number;
  store_name: string;
  product_name: string;
  product_name_normalized: string;
  week_start_date: string;
  year: number;
  month: number;
  gross_qty: number;
  returns_qty: number;
  net_qty: number;
  delivery_count: number;
  total_value: number;
  created_at: string;
  updated_at: string;
}
