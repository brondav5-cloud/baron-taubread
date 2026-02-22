// ============================================
// PRICING TYPES
// ============================================

/**
 * מחיר מוצר בחנות בודדת
 */
export interface ProductPrice {
  productId: number;
  productName?: string;
  basePrice: number; // מחיר בסיס (עמודה G)
  productDiscount: number; // הנחה על המוצר באחוזים (עמודה H)
  priceAfterProductDiscount: number; // מחיר לאחר הנחת מוצר (עמודה I)
  isExcludedFromStoreDiscount: boolean; // מוחרג מהנחה כללית?
}

/**
 * מחירון חנות מלא
 */
export interface StorePricing {
  storeId: number;
  storeName: string;
  agent: string;
  driver: string;
  storeDiscount: number; // הנחה כללית על החנות
  excludedProductIds: number[]; // מוצרים מוחרגים מהנחה כללית
  products: ProductPrice[];
  lastUpdated: string;
}

/**
 * אינדקס מחירונים - מידע כללי
 */
export interface PricingIndex {
  lastUpdated: string;
  uploadedBy: string;
  totalStores: number;
  totalProducts: number;
  storeIds: number[];
}

/**
 * תוצאת פענוח קובץ Excel
 */
export interface ExcelParseResult {
  success: boolean;
  storePricings: StorePricing[];
  summary: {
    totalRows: number;
    totalStores: number;
    totalProducts: number;
  };
  errors: ExcelParseError[];
  warnings: ExcelParseWarning[];
}

export interface ExcelParseError {
  row: number;
  message: string;
}

export interface ExcelParseWarning {
  type: "unknown_store" | "unknown_product" | "invalid_price";
  message: string;
  id?: number;
}

/**
 * חישוב מחיר סופי
 */
export function calculateFinalPrice(
  basePrice: number,
  productDiscount: number,
  storeDiscount: number,
  isExcluded: boolean,
): number {
  const afterProduct = basePrice * (1 - productDiscount / 100);
  const afterStore = isExcluded
    ? afterProduct
    : afterProduct * (1 - storeDiscount / 100);
  return Math.round(afterStore * 100) / 100;
}
