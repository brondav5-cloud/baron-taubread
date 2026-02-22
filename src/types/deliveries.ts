// ============================================
// DELIVERY TYPES
// סוגי נתונים לתעודות משלוח
// ============================================

// Raw row from Excel file
export interface DeliveryExcelRow {
  "תאריך מסמך": string;
  סוג: string;
  "מזהה לקוח": number;
  "שם לקוח": string;
  שבוע: number;
  שנה: number;
  "ערך כספי(לפני מעמ)": number;
  כמות?: number;
}

// Aggregated delivery data (what we store)
export interface AggregatedDelivery {
  storeExternalId: number;
  storeName: string;
  year: number;
  month: number;
  week: number | null; // null for monthly totals
  deliveriesCount: number;
  totalValue: number;
  totalQuantity: number;
}

// DB record
export interface DbStoreDelivery {
  id: string;
  company_id: string;
  store_external_id: number;
  store_name: string;
  year: number;
  month: number;
  week: number | null;
  deliveries_count: number;
  total_value: number;
  total_quantity: number;
  created_at: string;
  updated_at: string;
}

// Upload tracking record
export interface DbDeliveryUpload {
  id: string;
  company_id: string;
  filename: string;
  uploaded_by: string | null;
  uploaded_at: string;
  period_start: string | null;
  period_end: string | null;
  rows_processed: number | null;
  stores_count: number | null;
  total_deliveries: number | null;
  total_value: number | null;
  status: "processing" | "completed" | "failed";
  error_message: string | null;
  processing_time_ms: number | null;
}

// Processing result from Excel
export interface DeliveryProcessingResult {
  success: boolean;
  deliveries: AggregatedDelivery[];
  stats: {
    rowsProcessed: number;
    rowsFiltered: number; // rows with negative value
    storesCount: number;
    totalDeliveries: number;
    totalValue: number;
    periodStart: string;
    periodEnd: string;
    processingTimeMs: number;
  };
  error?: string;
}

// Store delivery summary (for display)
export interface StoreDeliverySummary {
  storeExternalId: number;
  storeName: string;
  // Totals
  totalDeliveries: number;
  totalValue: number;
  totalQuantity: number;
  // Averages
  avgDeliveriesPerMonth: number;
  avgValuePerDelivery: number;
  avgValuePerMonth: number;
  avgQuantityPerMonth: number;
  // Recent
  lastMonthDeliveries: number;
  lastMonthValue: number;
  lastMonthQuantity: number;
}

// Upload payload for API
export interface DeliveryUploadPayload {
  filename: string;
  deliveries: AggregatedDelivery[];
  stats: DeliveryProcessingResult["stats"];
}
