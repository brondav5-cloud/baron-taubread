// ============================================
// TYPES
// ============================================

export type PlanItemType = "visit" | "task";
export type Priority = "high" | "medium" | "low";

export interface StoreForWorkPlan {
  id: number;
  name: string;
  city: string;
  agent: string;
  status_long: string;
  metric_12v12?: number;
}

export interface PlannedVisit {
  id: string;
  type: "visit";
  storeId: number;
  store: StoreForWorkPlan;
  day: number;
  order: number;
  priority: Priority;
  notes?: string;
  completed: boolean;
  weekKey: string;
}

export interface PlannedTask {
  id: string;
  type: "task";
  title: string;
  description?: string;
  day: number;
  order: number;
  priority: Priority;
  completed: boolean;
  weekKey: string;
}

export type PlanItem = PlannedVisit | PlannedTask;

// ============================================
// CONSTANTS
// ============================================

export const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי"]; // 6 ימי עבודה (ללא שבת)

export const PRIORITY_COLORS: Record<Priority, string> = {
  high: "bg-red-100 border-red-300 text-red-700",
  medium: "bg-amber-100 border-amber-300 text-amber-700",
  low: "bg-green-100 border-green-300 text-green-700",
};

export const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "high", label: "דחוף" },
  { value: "medium", label: "רגיל" },
  { value: "low", label: "נמוך" },
];
