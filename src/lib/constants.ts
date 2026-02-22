import type { StoreStatus } from "@/types";

// ============================================
// STATUS CONFIGURATION
// ============================================

export const STATUS_CONFIG: Record<
  StoreStatus,
  {
    label: string;
    icon: string;
    color: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
  }
> = {
  rising: {
    label: "עליה חדה",
    icon: "🚀",
    color: "emerald",
    bgClass: "bg-emerald-100",
    textClass: "text-emerald-700",
    borderClass: "border-emerald-200",
  },
  growth: {
    label: "צמיחה",
    icon: "📈",
    color: "lime",
    bgClass: "bg-lime-100",
    textClass: "text-lime-700",
    borderClass: "border-lime-200",
  },
  stable: {
    label: "יציב",
    icon: "➡️",
    color: "gray",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600",
    borderClass: "border-gray-200",
  },
  decline: {
    label: "ירידה",
    icon: "📉",
    color: "amber",
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
    borderClass: "border-amber-200",
  },
  crash: {
    label: "התרסקות",
    icon: "⚠️",
    color: "red",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    borderClass: "border-red-200",
  },
  new: {
    label: "חדש",
    icon: "🆕",
    color: "blue",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    borderClass: "border-blue-200",
  },
  inactive: {
    label: "לא פעיל",
    icon: "⏸️",
    color: "gray",
    bgClass: "bg-gray-100",
    textClass: "text-gray-400",
    borderClass: "border-gray-200",
  },
};

// ============================================
// STATUS THRESHOLDS
// ============================================

// Long term status (based on 12v12)
export const STATUS_THRESHOLDS_LONG = {
  RISING: 20, // >= +20%
  GROWTH: 10, // >= +10%
  STABLE: -10, // >= -10%
  DECLINE: -30, // >= -30%
  // Below -30% = CRASH
} as const;

// Short term status (based on 2v2)
export const STATUS_THRESHOLDS_SHORT = {
  RISING: 15, // >= +15%
  STABLE: -10, // >= -10%
  DECLINE: -25, // >= -25%
  // Below -25% = ALARM
} as const;

// Alias for backwards compatibility
export const STATUS_THRESHOLDS = STATUS_THRESHOLDS_LONG;

// ============================================
// USER ROLES
// ============================================

export const USER_ROLES = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  AGENT: "agent",
} as const;

export const ROLE_LABELS: Record<string, string> = {
  superadmin: "מנהל ראשי",
  admin: "מנהל",
  agent: "סוכן",
};

// ============================================
// PAGINATION
// ============================================

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,
  PAGE_SIZE_OPTIONS: [25, 50, 100] as const,
} as const;

// ============================================
// MONTHS (Hebrew)
// ============================================

export const MONTHS = [
  { value: 1, label: "ינואר", short: "ינו" },
  { value: 2, label: "פברואר", short: "פבר" },
  { value: 3, label: "מרץ", short: "מרץ" },
  { value: 4, label: "אפריל", short: "אפר" },
  { value: 5, label: "מאי", short: "מאי" },
  { value: 6, label: "יוני", short: "יונ" },
  { value: 7, label: "יולי", short: "יול" },
  { value: 8, label: "אוגוסט", short: "אוג" },
  { value: 9, label: "ספטמבר", short: "ספט" },
  { value: 10, label: "אוקטובר", short: "אוק" },
  { value: 11, label: "נובמבר", short: "נוב" },
  { value: 12, label: "דצמבר", short: "דצמ" },
] as const;

// ============================================
// COST CATEGORIES
// ============================================

export const COST_CATEGORIES = [
  { key: "rawMaterials", label: "חומרי גלם", icon: "🌾" },
  { key: "returnsCost", label: "עלות החזרות", icon: "📦" },
  { key: "labor", label: "עבודה", icon: "👷" },
  { key: "operations", label: "תפעול", icon: "⚡" },
  { key: "delivery", label: "משלוח", icon: "🚚" },
  { key: "other", label: "אחר", icon: "📋" },
] as const;

// ============================================
// DEBT SETTINGS
// ============================================

export const DEBT_SETTINGS = {
  OVERDUE_DAYS: 90,
} as const;

// ============================================
// IMAGE SETTINGS
// ============================================

export const IMAGE_SETTINGS = {
  MAX_IMAGES_PER_VISIT: 3,
  MAX_SIZE_MB: 5,
  MAX_SIZE_BYTES: 5 * 1024 * 1024,
  COMPRESSED_MAX_WIDTH: 1200,
  THUMBNAIL_SIZE: 150,
  ACCEPTED_TYPES: ["image/jpeg", "image/png", "image/webp"],
} as const;

// ============================================
// VALIDATION MESSAGES (Hebrew)
// ============================================

export const VALIDATION_MESSAGES = {
  REQUIRED: "שדה חובה",
  INVALID_EMAIL: "כתובת אימייל לא תקינה",
  PASSWORD_MIN_LENGTH: "הסיסמה חייבת להכיל לפחות 8 תווים",
  PASSWORD_UPPERCASE: "הסיסמה חייבת להכיל אות גדולה",
  PASSWORD_LOWERCASE: "הסיסמה חייבת להכיל אות קטנה",
  PASSWORD_NUMBER: "הסיסמה חייבת להכיל מספר",
  PASSWORDS_DONT_MATCH: "הסיסמאות לא תואמות",
  INVALID_PHONE: "מספר טלפון לא תקין",
  MIN_VALUE: (min: number) => `הערך המינימלי הוא ${min}`,
  MAX_VALUE: (max: number) => `הערך המקסימלי הוא ${max}`,
} as const;

// ============================================
// FIREBASE ERROR MESSAGES (Hebrew)
// ============================================

export const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  "auth/user-not-found": "משתמש לא נמצא",
  "auth/wrong-password": "סיסמה שגויה",
  "auth/email-already-in-use": "כתובת האימייל כבר בשימוש",
  "auth/weak-password": "הסיסמה חלשה מדי",
  "auth/invalid-email": "כתובת אימייל לא תקינה",
  "auth/too-many-requests": "יותר מדי ניסיונות, נסה שוב מאוחר יותר",
  "auth/network-request-failed": "בעיית תקשורת, בדוק את החיבור לאינטרנט",
  "auth/invalid-credential": "פרטי ההתחברות שגויים",
  "auth/user-disabled": "החשבון הושבת",
  "permission-denied": "אין לך הרשאה לביצוע פעולה זו",
  "not-found": "הפריט לא נמצא",
  "already-exists": "הפריט כבר קיים",
  default: "אירעה שגיאה, נסה שוב",
};

// ============================================
// QUERY KEYS (for React Query)
// ============================================

export const QUERY_KEYS = {
  // Auth
  USER: ["user"] as const,

  // Companies
  COMPANIES: ["companies"] as const,
  COMPANY: (id: string) => ["company", id] as const,

  // Stores
  STORES: ["stores"] as const,
  STORE: (id: string) => ["store", id] as const,
  STORE_METRICS: (id: string) => ["store", id, "metrics"] as const,

  // Products
  PRODUCTS: ["products"] as const,
  PRODUCT: (id: string) => ["product", id] as const,

  // Visits
  VISITS: ["visits"] as const,
  VISIT: (id: string) => ["visit", id] as const,
  STORE_VISITS: (storeId: string) => ["visits", "store", storeId] as const,

  // Sales Data
  SALES_DATA: ["salesData"] as const,
  STORE_SALES: (storeId: string) => ["salesData", "store", storeId] as const,
  PRODUCT_SALES: (productId: string) =>
    ["salesData", "product", productId] as const,

  // Pricing
  PRICES: ["prices"] as const,
  PRODUCT_PRICES: (productId: string) =>
    ["prices", "product", productId] as const,

  // Costs
  COSTS: ["costs"] as const,
  PRODUCT_COSTS: (productId: string) =>
    ["costs", "product", productId] as const,

  // Debts
  DEBTS: ["debts"] as const,
  STORE_DEBTS: (storeId: string) => ["debts", "store", storeId] as const,

  // Dashboard
  DASHBOARD_STATS: ["dashboard", "stats"] as const,
  DASHBOARD_CHARTS: ["dashboard", "charts"] as const,
} as const;
