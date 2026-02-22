// ============================================
// COSTS & PROFITABILITY TYPES
// ============================================

/**
 * עלויות מוצר - 6 סוגי עלויות
 * זהה לכל החנויות (עלות גלובלית למוצר)
 */
export interface ProductCost {
  productId: number;
  rawMaterial: number; // עלות גולמית (חומרי גלם)
  labor: number; // עלות עובדים (ייצור)
  operational: number; // עלות תפעולית (תקורות)
  packaging: number; // עלות אריזה
  storage: number; // עלות מחסן (אחסון/קירור)
  misc: number; // עלויות שונות (פחת, ביטוח)
}

/**
 * סה"כ עלויות מוצר מחושב
 */
export interface ProductCostWithTotal extends ProductCost {
  totalCost: number; // סה"כ 6 העלויות
}

/**
 * שמות העלויות בעברית
 */
export const COST_LABELS: Record<keyof Omit<ProductCost, "productId">, string> =
  {
    rawMaterial: "גולמית",
    labor: "עובדים",
    operational: "תפעולית",
    packaging: "אריזה",
    storage: "מחסן",
    misc: "שונות",
  };

/**
 * מפתחות העלויות (לשימוש בלולאות)
 */
export const COST_KEYS = [
  "rawMaterial",
  "labor",
  "operational",
  "packaging",
  "storage",
  "misc",
] as const;

export type CostKey = (typeof COST_KEYS)[number];

// ============================================
// DRIVER GROUPS (קבוצות נהגים)
// ============================================

/**
 * עלות משלוח למוצר בקבוצת נהגים
 */
export interface DriverProductCost {
  productId: number;
  deliveryCost: number; // עלות משלוח ליחידה
}

/**
 * קבוצת נהגים
 */
export interface DriverGroup {
  id: string;
  name: string; // שם הקבוצה (צפון, מרכז, דרום...)
  driverNames: string[]; // שמות הנהגים בקבוצה
  productCosts: DriverProductCost[]; // עלויות משלוח למוצרים
  createdAt: string;
  updatedAt: string;
}

/**
 * נהג בודד עם עלות אישית (לא בקבוצה)
 */
export interface IndividualDriver {
  id: string;
  driverName: string; // שם הנהג
  productCosts: DriverProductCost[]; // עלויות משלוח למוצרים
  createdAt: string;
  updatedAt: string;
}

/**
 * יצירת מזהה ייחודי לקבוצת נהגים
 */
export function generateDriverGroupId(): string {
  return `dg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * יצירת מזהה ייחודי לנהג בודד
 */
export function generateIndividualDriverId(): string {
  return `drv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================
// PROFITABILITY CALCULATIONS (חישובי רווחיות)
// ============================================

/**
 * רווחיות מוצר בחנות
 */
export interface ProductProfit {
  productId: number;
  productName: string;
  category: string;

  // נתוני מכירה
  qty: number; // כמות נטו שנמכרה
  grossQty: number; // כמות ברוטו (כולל החזרות)
  revenue: number; // הכנסה (נטו × מחיר)

  // עלויות
  productionCost: number; // עלות ייצור (ברוטו × עלויות מוצר)
  deliveryCost: number; // עלות משלוח (נטו × עלות נהג)
  totalCost: number; // סה"כ עלויות

  // רווחים
  grossProfit: number; // רווח גולמי
  operatingProfit: number; // רווח תפעולי
  netProfit: number; // רווח נקי (סופי)
  profitMargin: number; // אחוז רווח
}

/**
 * סיכום רווחיות חנות
 */
export interface StoreProfitSummary {
  storeId: number;
  storeName: string;
  driverGroupId: string | null;
  driverGroupName: string | null;

  // סיכומים
  totalRevenue: number;
  totalProductionCost: number;
  totalDeliveryCost: number;
  totalCost: number;

  // רווחים
  grossProfit: number;
  operatingProfit: number;
  netProfit: number;
  profitMargin: number;

  // פירוט לפי מוצרים
  products: ProductProfit[];
}

// ============================================
// DEFAULT VALUES
// ============================================

/**
 * עלות מוצר ריקה (ברירת מחדל)
 */
export function createEmptyProductCost(productId: number): ProductCost {
  return {
    productId,
    rawMaterial: 0,
    labor: 0,
    operational: 0,
    packaging: 0,
    storage: 0,
    misc: 0,
  };
}

/**
 * חישוב סה"כ עלות מוצר
 */
export function calculateTotalCost(cost: ProductCost): number {
  return (
    cost.rawMaterial +
    cost.labor +
    cost.operational +
    cost.packaging +
    cost.storage +
    cost.misc
  );
}

/**
 * המרה לעלות עם סה"כ
 */
export function withTotalCost(cost: ProductCost): ProductCostWithTotal {
  return {
    ...cost,
    totalCost: calculateTotalCost(cost),
  };
}
