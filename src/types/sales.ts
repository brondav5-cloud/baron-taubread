// ============================================
// SALES DATA TYPES
// ============================================

export interface MonthlySalesData {
  id: string;
  companyId: string;
  storeId: string;
  productId: string;
  period: string; // YYYYMM format
  year: number;
  month: number;
  gross: number; // כמות שסופק
  returns: number; // חזרות
  returnsPct: number; // אחוז חזרות
  net: number; // כמות נטו
  sales: number; // סך מחזור מכירות
  driver: string;
  agent: string;
  createdAt: string;
}

export interface DeliveryData {
  id: string;
  companyId: string;
  storeId: string;
  date: string;
  week: string;
  month: number;
  year: number;
  amount: number;
  documentType: string;
}

// ============================================
// DEBT TYPES
// ============================================

export interface Debt {
  id: string;
  companyId: string;
  storeId: string;
  storeName: string;
  period: string; // YYYYMM
  amount: number;
  dueDate: string;
  isOverdue: boolean;
  daysOverdue: number;
  createdAt: string;
  updatedAt: string;
}
