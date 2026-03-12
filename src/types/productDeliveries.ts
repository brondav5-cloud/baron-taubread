// ============================================================
// PRODUCT DELIVERY TYPES
// סוגי נתונים לקובץ פירוט מוצרים (שבועי לפי חנות+מוצר)
// ============================================================

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
  deliveryCount: number;         // unique delivery dates this week for this store+product
}

export interface ProductDeliveryProcessingResult {
  success: boolean;
  records: AggregatedWeeklyRecord[];
  stats: {
    rowsProcessed: number;
    rowsSkipped: number;
    storesCount: number;
    productsCount: number;
    weeksCount: number;
    totalGrossQty: number;
    totalReturnsQty: number;
    periodStart: string; // "YYYY-MM-DD"
    periodEnd: string;   // "YYYY-MM-DD"
    processingTimeMs: number;
  };
  error?: string;
}

export interface ProductDeliveryUploadPayload {
  filename: string;
  records: AggregatedWeeklyRecord[];
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
  created_at: string;
  updated_at: string;
}
