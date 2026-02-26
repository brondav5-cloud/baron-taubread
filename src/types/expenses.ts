// ============================================
// EXPENSES & P&L MODULE TYPES
// ============================================

export type ExpenseCategoryParentType =
  | "cost_of_goods"
  | "operating"
  | "finance"
  | "other";

export const PARENT_TYPE_LABELS: Record<ExpenseCategoryParentType, string> = {
  cost_of_goods: "עלות המכר",
  operating: "הוצאות תפעול",
  finance: "הוצאות מימון",
  other: "אחר",
};

export interface DbExpenseCategory {
  id: string;
  company_id: string;
  name: string;
  parent_type: ExpenseCategoryParentType;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbSupplier {
  id: string;
  company_id: string;
  name: string;
  account_key: string;
  category_id: string | null;
  merged_into_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: DbExpenseCategory;
}

export interface DbExpenseUpload {
  id: string;
  company_id: string;
  uploaded_by: string;
  file_name: string;
  period_month: number | null;
  period_year: number | null;
  rows_count: number;
  suppliers_found: number;
  total_debits: number;
  total_credits: number;
  status: "processing" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
}

export interface DbExpenseEntry {
  id: string;
  company_id: string;
  upload_id: string;
  supplier_id: string;
  account_key: string;
  reference_date: string | null;
  details: string | null;
  credits: number;
  debits: number;
  balance: number;
  month: number;
  year: number;
  created_at: string;
  supplier?: DbSupplier;
}

export interface DbRevenueEntry {
  id: string;
  company_id: string;
  month: number;
  year: number;
  category: string;
  amount: number;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// PARSED EXPENSE ROW (from Hashbshevet Excel)
// ============================================

export interface ParsedExpenseRow {
  supplierName: string;
  accountKey: string;
  referenceDate: string | null;
  details: string | null;
  credits: number;
  debits: number;
  balance: number;
}

export interface ExpenseProcessingResult {
  success: boolean;
  rows: ParsedExpenseRow[];
  suppliers: Array<{ name: string; accountKey: string }>;
  totals: {
    totalDebits: number;
    totalCredits: number;
    totalBalance: number;
  };
  stats: {
    rowsCount: number;
    suppliersCount: number;
  };
  error?: string;
}

// ============================================
// P&L REPORT TYPES
// ============================================

export interface PnlLineItem {
  label: string;
  amount: number;
  previousAmount?: number;
  percentOfRevenue?: number;
  isSubtotal?: boolean;
  isBold?: boolean;
}

export interface PnlSection {
  title: string;
  parentType: ExpenseCategoryParentType | "revenue" | "subtotal";
  items: PnlLineItem[];
  total: number;
  previousTotal?: number;
}

export interface PnlReport {
  companyId: string;
  month: number;
  year: number;
  sections: PnlSection[];
  revenue: number;
  costOfGoods: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingProfit: number;
  financeExpenses: number;
  netProfit: number;
  previousRevenue?: number;
  previousNetProfit?: number;
}

// ============================================
// COMPARISON TYPES
// ============================================

export interface MonthlyExpenseSummary {
  month: number;
  year: number;
  periodKey: string;
  totalExpenses: number;
  totalRevenue: number;
  netProfit: number;
  byCategory: Record<string, number>;
}

export interface ExpenseComparison {
  current: MonthlyExpenseSummary;
  previous: MonthlyExpenseSummary;
  changes: {
    expenseChange: number;
    expenseChangePct: number;
    revenueChange: number;
    revenueChangePct: number;
    profitChange: number;
    profitChangePct: number;
    categoryChanges: Record<string, { change: number; changePct: number }>;
  };
}
