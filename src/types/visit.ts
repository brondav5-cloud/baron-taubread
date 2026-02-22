// ============================================
// VISIT TYPES
// ============================================

export interface Visit {
  id: string;
  companyId: string;
  storeId: string;
  storeName: string;
  agentId: string;
  agentName: string;
  date: string;
  checklist: ChecklistItem[];
  notes?: string;
  competitors?: CompetitorInfo[];
  photos: VisitPhoto[];
  status: "draft" | "completed";
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  notes?: string;
}

export interface CompetitorInfo {
  name: string;
  product?: string;
  price?: number;
  notes?: string;
}

export interface VisitPhoto {
  id: string;
  url: string;
  thumbnailUrl: string;
  caption?: string;
  uploadedAt: string;
}

export interface VisitFilters {
  search?: string;
  storeId?: string;
  agentId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: "draft" | "completed";
}
