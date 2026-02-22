// ============================================
// NETWORK TYPES
// ============================================

/**
 * רשת חנויות
 */
export interface Network {
  id: string;
  name: string;
  storeIds: number[];
  detachedStoreIds: number[]; // חנויות מנותקות (מחיר עצמאי)
  createdAt: string;
  updatedAt: string;
}

/**
 * מחירון רשת
 */
export interface NetworkPricing {
  networkId: string;
  products: NetworkProductPrice[];
  lastUpdated: string;
}

/**
 * מחיר מוצר ברשת
 */
export interface NetworkProductPrice {
  productId: number;
  basePrice: number;
  discount: number;
  finalPrice: number;
}

/**
 * רשת עם מידע מורחב
 */
export interface NetworkWithInfo extends Network {
  storeCount: number;
  hasCustomPricing: boolean;
}

/**
 * יצירת מזהה ייחודי לרשת
 */
export function generateNetworkId(): string {
  return `net_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
