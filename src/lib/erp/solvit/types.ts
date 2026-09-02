export type ErpEntityType = "client" | "product";
export type ErpMatchMethod = "id" | "ext_ref" | "name" | "manual";
export type ErpMatchConfidence = "high" | "medium" | "low";

export interface ErpPermissions {
  can_create: boolean;
  can_modify: boolean;
  can_create_docs: boolean;
  can_read_data: boolean;
}

export interface ErpWhoami {
  company_id: string;
  company: string;
  permissions: ErpPermissions;
}

export interface ErpConnectionRow {
  id: string;
  company_id: string;
  erp_company_id: string;
  erp_company_slug: string | null;
  enabled: boolean;
  last_ok_at: string | null;
  last_error: string | null;
  last_catalog_sync_at: string | null;
}

export interface ErpClientRow {
  erp_id: number;
  client_name: string;
  business_name: string | null;
  tax_id: string | null;
  address: string | null;
  phone_primary: string | null;
  email: string | null;
  category: string | null;
  city: string | null;
  agent_name: string | null;
  driver_id: number | null;
  driver_name: string | null;
  collector_id: number | null;
  collector_name: string | null;
  ext_ref: string | null;
  active: boolean;
}

export interface ErpProductRow {
  erp_id: number;
  product_name: string;
  barcode: string | null;
  category: string | null;
  price: number | null;
  ext_ref: string | null;
  active: boolean;
}

export interface ErpEntityMapRow {
  entity_type: ErpEntityType;
  erp_id: number;
  local_external_id: number;
  match_method: ErpMatchMethod;
  confidence: ErpMatchConfidence;
  reviewed: boolean;
}

export interface MappingCandidate {
  erp_id: number;
  erp_name: string;
  erp_ext_ref: string | null;
  local_external_id: number | null;
  local_name: string | null;
  match_method: ErpMatchMethod | null;
  confidence: ErpMatchConfidence | null;
  reviewed: boolean;
  status: "matched" | "unmatched_erp" | "unmatched_local" | "duplicate";
}

export interface SolvitApiResponse<T = unknown> {
  status: "SUCCESS" | "ERROR";
  status_msg: T;
}
