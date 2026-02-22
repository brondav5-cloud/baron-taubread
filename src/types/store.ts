// ============================================
// STORE TYPES
// ============================================

export interface Store {
  id: string;
  companyId: string;
  externalId: string; // מזהה לקוח מה-Excel
  name: string;
  network: string;
  city: string;
  address?: string;
  driver: string; // קו חלוקה / נהג
  agentId: string;
  agentName: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoreMetrics {
  storeId: string;
  period: string; // YYYYMM
  metrics: {
    "12v12": number | null;
    "6v6": number | null;
    "3v3": number | null;
    "2v2": number | null;
  };
  totalGross: number;
  totalNet: number;
  totalReturns: number;
  returnsPct: number;
  totalSales: number;
  deliveriesCount: number;
}

export type StoreStatus =
  | "rising"
  | "growth"
  | "stable"
  | "decline"
  | "crash"
  | "new"
  | "inactive";

export interface StoreWithMetrics extends Store {
  metrics: StoreMetrics | null;
  status: StoreStatus;
}

export interface StoreFilters {
  search?: string;
  city?: string;
  network?: string;
  agent?: string;
  driver?: string;
  status?: StoreStatus;
  isActive?: boolean;
}
