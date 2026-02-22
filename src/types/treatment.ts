// ============================================
// TREATMENT TYPES
// ============================================

export type TreatmentStatus = "pending" | "in_progress" | "resolved";
export type AlertType =
  | "crash"
  | "decline"
  | "returns"
  | "short_term"
  | "manual";

// סף התראות - ניתן לשינוי על ידי המשתמש
export interface AlertThresholds {
  crash: number; // ברירת מחדל: -30
  decline: number; // ברירת מחדל: -10
  returns: number; // ברירת מחדל: 20
  shortTerm: number; // ברירת מחדל: -25
}

export const DEFAULT_THRESHOLDS: AlertThresholds = {
  crash: -30,
  decline: -10,
  returns: 20,
  shortTerm: -25,
};

// חנות בטיפול
export interface TreatmentStore {
  id: number;
  name: string;
  city: string;
  agent: string;
  status_long: string;
  metric_12v12: number;
  metric_2v2: number;
  returns_pct_last6: number;
  alertType: AlertType;
  treatmentStatus: TreatmentStatus;
  isManual: boolean; // האם נוסף ידנית
  addedAt?: string; // תאריך הוספה
  notes?: string; // הערות
  lastContact?: string; // תאריך קשר אחרון
}

// הגדרת התראה - תצוגה
export interface AlertConfig {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

// סטטוס טיפול - תצוגה
export interface TreatmentStatusConfig {
  label: string;
  icon: React.ElementType;
  color: string;
}

// ============================================
// TASK TYPES (for work plan)
// ============================================

export type TaskPriority = "high" | "medium" | "low";

export interface Task {
  id: string;
  type: "visit" | "task";
  title: string;
  description?: string;
  day: number;
  priority: TaskPriority;
  storeId?: number;
  storeName?: string;
  storeCity?: string;
  createdAt: string;
  completed: boolean;
}

// ============================================
// VISIT HISTORY TYPES
// ============================================

export interface StoreVisitSummary {
  storeId: number;
  storeName: string;
  storeCity: string;
  agent: string;
  totalVisits: number;
  lastVisitDate: string | null;
  daysSinceLastVisit: number | null;
  hasRecentVisit: boolean; // ביקור ב-30 יום אחרונים
}
