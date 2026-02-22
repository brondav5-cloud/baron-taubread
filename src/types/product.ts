// ============================================
// PRODUCT TYPES
// ============================================

export interface Product {
  id: string;
  companyId: string;
  externalId: string; // מזהה מוצר מה-Excel
  name: string;
  category: string;
  sku?: string;
  defaultPrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductMetrics {
  productId: string;
  period: string;
  totalGross: number;
  totalNet: number;
  totalReturns: number;
  returnsPct: number;
  totalSales: number;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  isActive?: boolean;
}

export interface ProductPrice {
  id: string;
  companyId: string;
  productId: string;
  storeId?: string; // null = default price
  basePrice: number;
  discountPct: number;
  finalPrice: number;
  validFrom: string;
  validTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCost {
  id: string;
  companyId: string;
  productId: string;
  rawMaterials: number; // חומרי גלם
  returnsCost: number; // עלות החזרות
  labor: number; // עבודה
  operations: number; // תפעול
  delivery: number; // משלוח
  other: number; // אחר
  totalCost: number;
  validFrom: string;
  validTo?: string;
  createdAt: string;
  updatedAt: string;
}
