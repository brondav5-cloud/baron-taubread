// ============================================================
// Accounting Ledger System — Types
// ============================================================

export type FileType = "yearly" | "monthly";
export type FileStatus = "processing" | "completed" | "error";
export type AccountType = "revenue" | "expense";
export type ParentSection = "cost_of_goods" | "operating" | "admin" | "finance" | "other";
export type OverrideType = "amount" | "category" | "note" | "exclude";
export type AlertRuleType =
  | "monthly_change_pct"
  | "yearly_change_pct"
  | "absolute_threshold"
  | "consecutive_increase"
  | "margin_below"
  | "new_account";
export type ClassificationMode = "latest" | "original";

export const PARENT_SECTION_LABELS: Record<ParentSection, string> = {
  cost_of_goods: "עלות המכר",
  operating: "הוצאות תפעול",
  admin: "הוצאות הנהלה",
  finance: "הוצאות מימון",
  other: "אחר",
};

export const PARENT_SECTION_ORDER: ParentSection[] = [
  "cost_of_goods",
  "operating",
  "admin",
  "finance",
  "other",
];

// ── DB Row Types ─────────────────────────────────────────────

export interface DbUploadedFile {
  id: string;
  user_id: string;
  filename: string;
  year: number;
  month: number | null;
  file_type: FileType;
  uploaded_at: string;
  row_count: number | null;
  status: FileStatus;
  error_msg: string | null;
}

export interface DbAccount {
  id: string;
  user_id: string;
  code: string;
  name: string;
  latest_group_code: string | null;
  account_type: AccountType;
}

export interface DbTransaction {
  id: string;
  user_id: string;
  file_id: string;
  account_id: string;
  group_code: string;
  original_account_name: string | null;
  transaction_date: string; // ISO date string
  value_date: string | null;
  debit: number;
  credit: number;
  description: string | null;
  counter_account: string | null;
  reference_number: string | null;
  header_number: string | null;
  movement_number: string | null;
}

export interface DbTransactionOverride {
  id: string;
  transaction_id: string;
  user_id: string;
  override_type: OverrideType;
  original_value: string | null;
  new_value: string | null;
  note: string | null;
  created_at: string;
}

export interface DbCustomGroup {
  id: string;
  user_id: string;
  name: string;
  display_order: number;
  color: string;
  group_codes: string[];
  account_codes: string[]; // individual account codes (higher priority than group_codes)
  parent_section: ParentSection;
}

export interface DbCustomTag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string | null;
}

export interface DbAccountTag {
  account_id: string;
  tag_id: string;
}

export interface DbCounterAccountName {
  id: string;
  user_id: string;
  counter_account_code: string;
  display_name: string;
}

export interface DbAccountClassificationOverride {
  id: string;
  user_id: string;
  account_id: string;
  custom_group_id: string;
  note: string | null;
  created_at: string;
}

export interface DbAlertRule {
  id: string;
  user_id: string;
  account_id: string | null;
  rule_type: AlertRuleType;
  threshold_value: number | null;
  is_active: boolean;
  created_at: string;
  // Extended fields (migration 003)
  name?: string | null;
  severity?: "warning" | "critical";
  applies_to?: "all" | "specific";
  is_preset?: boolean;
}

// ── Parser Types ─────────────────────────────────────────────

export interface ParsedAccount {
  code: string;
  name: string;
  group_code: string;
  account_type: AccountType;
}

export interface ParsedTransaction {
  account_code: string;
  group_code: string;
  original_account_name: string;
  transaction_date: string;
  value_date: string | null;
  debit: number;
  credit: number;
  description: string | null;
  counter_account: string | null;
  reference_number: string | null;
  header_number: string | null;
  movement_number: string | null;
}

export interface ParsedAccountingResult {
  success: boolean;
  accounts: ParsedAccount[];
  transactions: ParsedTransaction[];
  stats: {
    rowsCount: number;
    accountsCount: number;
    dateRange: { from: string | null; to: string | null };
  };
  error?: string;
}

// ── P&L Calculation Types ────────────────────────────────────

export interface MonthlyGroupAmount {
  groupId: string;
  groupName: string;
  parentSection: ParentSection;
  amount: number;
  byAccount: Map<string, number>;
}

export interface MonthlyPnl {
  month: number; // 1-12
  revenue: number;
  bySection: Record<ParentSection, number>;
  byGroup: Map<string, number>; // groupId → amount
  byAccount: Map<string, number>; // accountId → amount
  grossProfit: number;
  operatingProfit: number;
  adminTotal: number;
  financeTotal: number;
  otherTotal: number;
  netProfit: number;
}

export interface YearlyPnl {
  year: number;
  months: MonthlyPnl[];
  total: MonthlyPnl;
}

// ── Alert / Anomaly Types ────────────────────────────────────

export interface AccountAnomaly {
  accountId: string;
  accountCode: string;
  accountName: string;
  type: "monthly_spike" | "yoy_increase" | "consecutive_increase" | "margin_below" | "new_account";
  severity: "warning" | "critical";
  month?: number;
  currentValue: number;
  referenceValue: number;
  changePct: number;
  months?: number[]; // for consecutive
  description?: string;
}
