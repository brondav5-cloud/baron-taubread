// ============================================
// TASK SYSTEM TYPES
// ============================================

// סטטוס משימה
export type TaskStatus =
  | "new" // חדש - ממתין לצפייה
  | "seen" // נצפה
  | "in_progress" // בטיפול
  | "done" // טופל - ממתין לאישור
  | "approved" // אושר - נסגר
  | "rejected"; // נדחה - חזר לטיפול

// דחיפות
export type TaskPriority = "urgent" | "normal" | "low";

// פריט בצ'קליסט
export interface TaskChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}

// הערה/תגובה
export interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

// היסטוריית פעולות
export interface TaskHistoryItem {
  id: string;
  action:
    | "created"
    | "seen"
    | "started"
    | "done"
    | "approved"
    | "rejected"
    | "comment"
    | "checklist";
  userId: string;
  userName: string;
  timestamp: string;
  details?: string;
}

// המשימה עצמה
export interface Task {
  id: string;

  // סוג משימה
  taskType: "store" | "general";

  // מי ומתי
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;

  // מוקצים - תמיכה במספר אנשים
  assignees: TaskAssignee[];

  // קשר לביקור וחנות (אופציונלי - רק למשימת חנות)
  visitId?: string;
  storeId?: number;
  storeName?: string;

  // תוכן
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  priority: TaskPriority;
  title: string;
  description: string;
  photos: string[];

  // סטטוס
  status: TaskStatus;

  // צ'קליסט
  checklist: TaskChecklistItem[];

  // הערות
  comments: TaskComment[];

  // היסטוריה
  history: TaskHistoryItem[];

  // תגובת המטפל
  handlerResponse?: string;
  handlerPhotos: string[];
  handledAt?: string;

  // אישור/דחייה
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;

  // דדליין (מחושב לפי דחיפות)
  dueDate: string;
}

// מוקצה למשימה
export interface TaskAssignee {
  userId: string;
  userName: string;
  role: "primary" | "secondary"; // ראשי או משני
  status: TaskStatus; // סטטוס אישי של כל מוקצה
  seenAt?: string;
  handledAt?: string;
  response?: string;
}

// ============================================
// TASK CATEGORY TYPES
// ============================================

export interface TaskCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  defaultAssigneeId?: string;
  defaultAssigneeName?: string;
  isActive: boolean;
  order: number;
}

// ============================================
// WORKFLOW TYPES (משימות מורכבות עם שלבים)
// ============================================

// סטטוס שלב ב-workflow
export type WorkflowStepStatus =
  | "pending" // ממתין (שלב קודם לא הסתיים)
  | "active" // פעיל - אפשר להתחיל
  | "in_progress" // בטיפול
  | "completed" // הושלם
  | "returned"; // הוחזר לתיקון

// פריט בצ'קליסט של שלב
export interface WorkflowChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  completedByName?: string;
}

// הערה בשלב
export interface WorkflowStepComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

// שלב בודד ב-workflow
export interface WorkflowStep {
  id: string;
  order: number;
  title: string;
  description?: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  assignees: {
    userId: string;
    userName: string;
  }[];
  isBlocking: boolean; // האם חוסם את השלבים הבאים?
  status: WorkflowStepStatus;
  dueDate?: string; // תאריך יעד לשלב
  completedAt?: string;
  completedBy?: string;
  completedByName?: string;
  response?: string; // תגובת המשלים

  // 🆕 צ'קליסט והערות
  checklist: WorkflowChecklistItem[];
  comments: WorkflowStepComment[];

  // 🆕 החזרה
  returnedBy?: string;
  returnedByName?: string;
  returnedAt?: string;
  returnReason?: string;
  wasReturned?: boolean; // האם הוחזר בעבר
}

// משימת workflow (משימה מורכבת)
export interface WorkflowTask {
  id: string;
  title: string;
  description?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  storeId?: number;
  storeName?: string;
  priority: TaskPriority;
  steps: WorkflowStep[];
  status:
    | "active"
    | "awaiting_approval"
    | "completed"
    | "rejected"
    | "cancelled";
  dueDate: string;
  comments: TaskComment[];
  history: TaskHistoryItem[];
  // שדות אישור יוצר
  approvedAt?: string;
  approvedBy?: string;
  approvedByName?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectionReason?: string;
}

// ============================================
// DEMO USER TYPES
// ============================================

export type DemoUserRole =
  | "agent" // סוכן שטח
  | "warehouse_manager" // מנהל מחסן
  | "pricing_manager" // מנהל תמחור
  | "logistics_manager" // מנהל לוגיסטיקה
  | "accountant" // הנהלת חשבונות
  | "quality_manager" // מנהל איכות
  | "sales_manager" // מנהל מכירות
  | "admin"; // מנהל כללי

export interface DemoUser {
  id: string;
  name: string;
  role: DemoUserRole;
  avatar: string;
  email: string;
  department: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateCommentId(): string {
  return `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateChecklistItemId(): string {
  return `checklist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateHistoryId(): string {
  return `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// חישוב תאריך יעד לפי דחיפות
export function calculateDueDate(priority: TaskPriority): string {
  const now = new Date();
  switch (priority) {
    case "urgent":
      now.setHours(now.getHours() + 24);
      break;
    case "normal":
      now.setDate(now.getDate() + 3);
      break;
    case "low":
      now.setDate(now.getDate() + 7);
      break;
  }
  return now.toISOString();
}

// בדיקה אם משימה באיחור
export function isTaskOverdue(task: Task): boolean {
  if (task.status === "approved") return false;
  return new Date(task.dueDate) < new Date();
}

// ============================================
// DISPLAY HELPERS
// ============================================

export const TASK_STATUS_CONFIG: Record<
  TaskStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: string;
  }
> = {
  new: {
    label: "חדש",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    icon: "🆕",
  },
  seen: {
    label: "נצפה",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
    icon: "👀",
  },
  in_progress: {
    label: "בטיפול",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    icon: "🔧",
  },
  done: {
    label: "טופל",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
    icon: "✅",
  },
  approved: {
    label: "אושר",
    color: "text-green-700",
    bgColor: "bg-green-100",
    icon: "✔️",
  },
  rejected: {
    label: "נדחה",
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: "❌",
  },
};

export const TASK_PRIORITY_CONFIG: Record<
  TaskPriority,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: string;
  }
> = {
  urgent: {
    label: "דחוף",
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: "🔴",
  },
  normal: {
    label: "רגיל",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
    icon: "🟡",
  },
  low: {
    label: "נמוך",
    color: "text-green-700",
    bgColor: "bg-green-100",
    icon: "🟢",
  },
};

export const DEMO_USER_ROLE_CONFIG: Record<
  DemoUserRole,
  {
    label: string;
    icon: string;
  }
> = {
  agent: { label: "סוכן שטח", icon: "🚗" },
  warehouse_manager: { label: "מנהל מחסן", icon: "📦" },
  pricing_manager: { label: "מנהל תמחור", icon: "💰" },
  logistics_manager: { label: "מנהל לוגיסטיקה", icon: "🚚" },
  accountant: { label: "הנהלת חשבונות", icon: "💳" },
  quality_manager: { label: "מנהל איכות", icon: "⚠️" },
  sales_manager: { label: "מנהל מכירות", icon: "📊" },
  admin: { label: "מנהל", icon: "👔" },
};
