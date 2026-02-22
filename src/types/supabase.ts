// ============================================
// SUPABASE DATABASE TYPES
// ============================================

// Company
export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  is_active: boolean;
}

// User
export type UserPermissionModule =
  | "dashboard"
  | "stores"
  | "products"
  | "tasks"
  | "faults"
  | "treatment"
  | "work_plan"
  | "competitors"
  | "compare"
  | "visits"
  | "profitability"
  | "upload"
  | "settings";

export type UserPermissions = Partial<Record<UserPermissionModule, boolean>>;

export interface DbUser {
  id: string;
  company_id: string;
  email: string;
  name: string | null;
  role: "super_admin" | "admin" | "editor" | "viewer";
  department: string | null;
  avatar: string | null;
  position: string | null;
  phone: string | null;
  permissions: UserPermissions | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Task Category (from Supabase)
export interface DbTaskCategory {
  id: string;
  company_id: string;
  name: string;
  icon: string;
  color: string;
  default_assignee_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Data Metadata - Dynamic periods
export interface DataMetadata {
  company_id: string;
  current_year: number;
  previous_year: number;
  period_start: string; // "202401"
  period_end: string; // "202601"
  months_list: string[]; // כל החודשים שיש בנתונים (נצבר)

  // תקופת המדדים (24 החודשים האחרונים מהקובץ)
  metrics_period_start: string; // "202402"
  metrics_period_end: string; // "202601"
  metrics_months: string[]; // רשימת 24 החודשים למדדים

  last_upload_at: string;
  updated_at: string;
}

// Monthly data structure
export interface MonthlyData {
  [period: string]: number; // "202401": 205
}

// Metrics structure
export interface StoreMetrics {
  qty_current_year: number;
  qty_previous_year: number;
  sales_current_year: number;
  sales_previous_year: number;
  metric_12v12: number;
  metric_6v6: number;
  metric_3v3: number;
  metric_2v2: number;

  // Absolute values for display under percentages
  qty_12v12_current?: number;
  qty_12v12_previous?: number;
  qty_6v6_current?: number;
  qty_6v6_previous?: number;
  qty_3v3_current?: number;
  qty_3v3_previous?: number;
  qty_2v2_current?: number;
  qty_2v2_previous?: number;

  metric_peak_distance: number;
  peak_value: number;
  current_value: number;
  returns_pct_current: number;
  returns_pct_previous: number;
  returns_change: number;
  status_long: string;
  status_short: string;
}

// Store (from Supabase)
export interface DbStore {
  id: string;
  company_id: string;
  external_id: number;
  name: string;
  city: string | null;
  network: string | null;
  driver: string | null;
  agent: string | null;
  monthly_qty: MonthlyData;
  monthly_sales: MonthlyData;
  monthly_gross: MonthlyData;
  monthly_returns: MonthlyData;
  metrics: StoreMetrics;
  created_at: string;
  updated_at: string;
}

// Product metrics
export interface ProductMetrics {
  qty_current_year: number;
  qty_previous_year: number;
  sales_current_year: number;
  sales_previous_year: number;
  metric_12v12: number;
  metric_6v6: number;
  metric_3v3: number;
  metric_2v2: number;
  // Absolute values for display
  qty_12v12_current?: number;
  qty_12v12_previous?: number;
  qty_6v6_current?: number;
  qty_6v6_previous?: number;
  qty_3v3_current?: number;
  qty_3v3_previous?: number;
  qty_2v2_current?: number;
  qty_2v2_previous?: number;
  status_long: string;
  status_short: string;
}

// Product (from Supabase)
export interface DbProduct {
  id: string;
  company_id: string;
  external_id: number;
  name: string;
  category: string | null;
  monthly_qty: MonthlyData;
  monthly_sales: MonthlyData;
  metrics: ProductMetrics;
  created_at: string;
  updated_at: string;
}

// Snapshot summary
export interface SnapshotSummary {
  total_stores: number;
  total_products: number;
  total_sales: number;
  total_qty: number;
  avg_metric_12v12: number;
}

// Snapshot store data (simplified for comparison)
export interface SnapshotStoreData {
  external_id: number;
  name: string;
  city: string | null;
  sales: number;
  qty: number;
  metric_12v12: number;
  metric_6v6: number;
  status_long: string;
}

// Snapshot (from Supabase)
export interface DbSnapshot {
  id: string;
  company_id: string;
  name: string;
  period_end: string;
  created_at: string;
  summary: SnapshotSummary;
  stores_data: SnapshotStoreData[];
  products_data: Array<{
    external_id: number;
    name: string;
    category: string | null;
    sales: number;
    qty: number;
    metric_12v12: number;
  }>;
}

// Upload record
export interface DbUpload {
  id: string;
  company_id: string;
  filename: string;
  uploaded_by: string | null;
  uploaded_at: string;
  period_start: string | null;
  period_end: string | null;
  rows_count: number | null;
  stores_count: number | null;
  products_count: number | null;
  status: "processing" | "completed" | "failed";
  error_message: string | null;
  processing_time_ms: number | null;
}

// Store Pricing (from Supabase)
export interface DbStorePricing {
  id: string;
  company_id: string;
  store_external_id: number;
  store_name: string;
  agent: string;
  driver: string;
  store_discount: number;
  excluded_product_ids: number[];
  products: Array<{
    productId: number;
    productName?: string;
    basePrice: number;
    productDiscount: number;
    priceAfterProductDiscount: number;
    isExcludedFromStoreDiscount: boolean;
  }>;
  last_updated: string;
  created_at: string;
}

// Filters
export interface DbFilters {
  company_id: string;
  cities: string[];
  networks: string[];
  drivers: string[];
  agents: string[];
  categories: string[];
  updated_at: string;
}

// Visit (from Supabase)
export interface DbVisit {
  id: string;
  company_id: string;
  store_external_id: number;
  store_name: string;
  store_city: string;
  agent_name: string;
  date: string;
  time: string | null;
  notes: string;
  checklist: Array<{ id: string; label: string; checked: boolean }>;
  competitors: Array<{ id: string; name: string; notes: string }>;
  photos: Array<{ id: string; name: string; url?: string }>;
  status: "completed" | "draft";
  created_at: string;
}

// Task (from Supabase) - משימות רגילות
export interface DbTask {
  id: string;
  company_id: string;
  task_type: "store" | "general";
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  visit_id: string | null;
  store_id: number | null;
  store_name: string | null;
  category_id: string;
  category_name: string;
  category_icon: string;
  priority: "urgent" | "normal" | "low";
  title: string;
  description: string;
  photos: string[];
  status: "new" | "seen" | "in_progress" | "done" | "approved" | "rejected";
  checklist: Array<{
    id: string;
    text: string;
    completed: boolean;
    completedAt?: string;
    completedBy?: string;
  }>;
  comments: Array<{
    id: string;
    userId: string;
    userName: string;
    text: string;
    createdAt: string;
  }>;
  history: Array<{
    id: string;
    action: string;
    userId: string;
    userName: string;
    timestamp: string;
    details?: string;
  }>;
  assignees: Array<{
    userId: string;
    userName: string;
    role: string;
    status: string;
    seenAt?: string;
    handledAt?: string;
    response?: string;
  }>;
  handler_response: string | null;
  handler_photos: string[];
  handled_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  due_date: string;
}

// Workflow (from Supabase) - משימות מורכבות
export interface DbWorkflow {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  store_id: number | null;
  store_name: string | null;
  priority: "urgent" | "normal" | "low";
  status:
    | "active"
    | "awaiting_approval"
    | "completed"
    | "rejected"
    | "cancelled";
  due_date: string;
  steps: unknown[]; // WorkflowStep[] - complex nested
  comments: Array<{
    id: string;
    userId: string;
    userName: string;
    text: string;
    createdAt: string;
  }>;
  history: Array<{
    id: string;
    action: string;
    userId: string;
    userName: string;
    timestamp: string;
    details?: string;
  }>;
  approved_at: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejected_by_name: string | null;
  rejection_reason: string | null;
}

// ============================================
// INSERT/UPDATE TYPES (without auto-generated fields)
// ============================================

export type VisitInsert = Omit<DbVisit, "id" | "created_at">;
export type TaskInsert = Omit<DbTask, "id" | "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
};
export type WorkflowInsert = Omit<
  DbWorkflow,
  "id" | "created_at" | "updated_at"
> & { created_at?: string; updated_at?: string };
export type StoreInsert = Omit<DbStore, "id" | "created_at" | "updated_at">;
export type ProductInsert = Omit<DbProduct, "id" | "created_at" | "updated_at">;
export type SnapshotInsert = Omit<DbSnapshot, "id" | "created_at">;
export type UploadInsert = Omit<DbUpload, "id" | "uploaded_at">;

// ============================================
// EXCEL PARSING TYPES
// ============================================

export interface ExcelRow {
  "חודש ושנה": string;
  "מזהה לקוח": number;
  "שם לקוח": string;
  רשת: string | null;
  עיר: string;
  "מזהה מוצר": number;
  מוצר: string;
  "קטגורית מוצרים": string;
  "כמות שסופק": number;
  חזרות: number;
  "חזרות(%)": number;
  "כמות נטו ": number;
  "סך מחזור מכירות ": number;
  נהג: string;
  סוכן: string;
}

export interface ParsedPeriod {
  month: number;
  year: number;
  key: string; // "202401"
}

// Store Treatment (חנויות בטיפול)
export interface DbStoreTreatment {
  id: string;
  company_id: string;
  store_id: number;
  store_name: string;
  store_city: string;
  store_agent: string;
  status_long: string;
  metric_12v12: number;
  metric_2v2: number;
  returns_pct: number;
  reason: string;
  treatment_status: "pending" | "in_progress" | "resolved";
  notes: string;
  added_by: string;
  added_by_name: string | null;
  added_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

// Store Treatment History
export interface DbStoreTreatmentHistory {
  id: string;
  company_id: string;
  store_id: number;
  store_name: string;
  event_type:
    | "added"
    | "status_updated"
    | "notes_updated"
    | "resolved"
    | "removed";
  reason: string | null;
  old_status: string | null;
  new_status: string | null;
  notes: string | null;
  created_by: string;
  created_by_name: string | null;
  created_at: string;
}

// Work Plan Item
export interface DbWorkPlanItem {
  id: string;
  company_id: string;
  week_key: string;
  day: number;
  item_type: "visit" | "task";
  sort_order: number;
  priority: "high" | "medium" | "low";
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  store_id: number | null;
  store_name: string | null;
  store_city: string | null;
  store_agent: string | null;
  task_title: string | null;
  task_description: string | null;
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
