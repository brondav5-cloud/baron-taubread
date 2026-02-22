import type {
  PlanItem,
  PlannedVisit,
  PlannedTask,
  Priority,
  StoreForWorkPlan,
} from "./types";

// ============================================
// WEEK KEY HELPERS
// ============================================

export function getWeekKey(offset: number): string {
  const today = new Date();
  const startOfWeek = new Date(today);
  const dayOfWeek = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek + offset * 7);
  const isoString = startOfWeek.toISOString();
  const datePart = isoString.split("T")[0];
  return datePart ?? isoString.slice(0, 10); // YYYY-MM-DD
}

// ============================================
// DATE HELPERS
// ============================================

export function getWeekDates(weekOffset: number): Date[] {
  const today = new Date();
  const startOfWeek = new Date(today);
  const dayOfWeek = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek + weekOffset * 7);

  return Array.from({ length: 6 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date;
  });
}

export function formatDate(date: Date | undefined): string {
  if (!date) return "";
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

export function isToday(date: Date | undefined): boolean {
  if (!date) return false;
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

// ============================================
// PRIORITY HELPERS
// ============================================

export function getPriorityFromStatus(statusLong: string): Priority {
  if (statusLong === "התרסקות") return "high";
  if (statusLong === "ירידה") return "medium";
  return "low";
}

// ============================================
// INITIAL DATA CREATION
// ============================================

export function createInitialItems(
  stores: StoreForWorkPlan[],
  weekKey: string,
): PlanItem[] {
  const alertStores = stores.filter(
    (s) => s.status_long === "התרסקות" || s.status_long === "ירידה",
  );

  const visits: PlannedVisit[] = alertStores.slice(0, 8).map((store, i) => ({
    id: `visit-${weekKey}-${i}`,
    type: "visit",
    storeId: store.id,
    store,
    day: i % 6,
    order: Math.floor(i / 6),
    priority: getPriorityFromStatus(store.status_long),
    completed: false,
    weekKey,
  }));

  const tasks: PlannedTask[] = [
    {
      id: `task-${weekKey}-1`,
      type: "task",
      title: "ישיבת צוות שבועית",
      description: "סיכום שבוע קודם ותכנון השבוע",
      day: 0,
      order: 0,
      priority: "medium",
      completed: false,
      weekKey,
    },
    {
      id: `task-${weekKey}-2`,
      type: "task",
      title: "הכנת דוח חודשי",
      day: 3,
      order: 0,
      priority: "high",
      completed: false,
      weekKey,
    },
  ];

  return [...visits, ...tasks];
}

// ============================================
// GROUPING HELPERS
// ============================================

export function groupItemsByDay(
  planItems: PlanItem[],
): Record<number, PlanItem[]> {
  const grouped: Record<number, PlanItem[]> = {};

  // Initialize all days (6 ימי עבודה, ללא שבת)
  for (let i = 0; i < 6; i++) {
    grouped[i] = [];
  }

  // Group items
  planItems.forEach((item) => {
    const dayGroup = grouped[item.day];
    if (dayGroup) {
      dayGroup.push(item);
    }
  });

  // Sort each day by order
  Object.keys(grouped).forEach((day) => {
    const dayItems = grouped[Number(day)];
    if (dayItems) {
      dayItems.sort((a, b) => a.order - b.order);
    }
  });

  return grouped;
}

// ============================================
// STATS CALCULATION
// ============================================

export interface WorkPlanStats {
  total: number;
  visits: number;
  tasks: number;
  high: number;
  medium: number;
  low: number;
  completed: number;
}

export function calculateStats(planItems: PlanItem[]): WorkPlanStats {
  const visits = planItems.filter((i) => i.type === "visit");
  const tasks = planItems.filter((i) => i.type === "task");

  return {
    total: planItems.length,
    visits: visits.length,
    tasks: tasks.length,
    high: planItems.filter((i) => i.priority === "high").length,
    medium: planItems.filter((i) => i.priority === "medium").length,
    low: planItems.filter((i) => i.priority === "low").length,
    completed: planItems.filter((i) => i.completed).length,
  };
}

// ============================================
// FILTER HELPERS
// ============================================

export function getAvailableStores(
  stores: StoreForWorkPlan[],
  planItems: PlanItem[],
  selectedCity: string,
  selectedAgent: string,
): StoreForWorkPlan[] {
  const plannedStoreIds = new Set(
    planItems
      .filter((i): i is PlannedVisit => i.type === "visit")
      .map((v) => v.storeId),
  );

  return stores
    .filter((s) => !plannedStoreIds.has(s.id))
    .filter((s) => !selectedCity || s.city === selectedCity)
    .filter((s) => !selectedAgent || s.agent === selectedAgent)
    .sort((a, b) => (b.metric_12v12 ?? 0) - (a.metric_12v12 ?? 0))
    .slice(0, 20);
}
