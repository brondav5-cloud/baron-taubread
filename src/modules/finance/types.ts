export type SourceBank = "leumi" | "hapoalim" | "mizrahi";

export type DocType =
  | "salary_xlsx"
  | "credit_card_xlsx"
  | "transfers_pdf"
  | "leumi_credit_xls"
  | "other";

export type MatchMethod = "manual" | "auto_reference" | "auto_date_amount";

export type CategoryType = "income" | "expense" | "transfer" | "ignore";

// ─── Parsed output from bank file parsers ────────────────────────────────────

export interface ParsedBankTransaction {
  date: string;           // ISO YYYY-MM-DD
  description: string;
  details: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number | null;
  operation_code?: string;  // hapoalim only
  batch_code?: string;      // hapoalim only (צרור)
  notes?: string;
  source_bank: SourceBank;
  raw_row: Record<string, unknown>;
}

export interface BankParseResult {
  transactions: ParsedBankTransaction[];
  account_number: string;
  date_from?: string;
  date_to?: string;
  errors: string[];
}

// ─── DB row shapes (from Supabase) ───────────────────────────────────────────

export interface BankAccount {
  id: string;
  company_id: string;
  bank: SourceBank;
  account_number: string;
  display_name: string;
  currency: string;
  is_active: boolean;
  created_at: string;
}

export interface BankTransaction {
  id: string;
  company_id: string;
  bank_account_id: string;
  uploaded_file_id: string | null;
  date: string;
  description: string;
  details: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number | null;
  operation_code?: string;
  batch_code?: string;
  notes?: string;
  category_id?: string;
  category_override?: string;
  source_bank: SourceBank;
  raw_row: Record<string, unknown>;
  created_at: string;
}

export interface BankCategory {
  id: string;
  company_id: string;
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
  sort_order: number;
}

export interface TransactionDetailDocument {
  id: string;
  company_id: string;
  file_name: string;
  doc_type: DocType;
  doc_date?: string;
  total_amount?: number;
  reference?: string;
  uploaded_at: string;
  notes?: string;
}

// ─── Transaction splits ───────────────────────────────────────────────────────

/** A single line in a split transaction. Stored in bank_transaction_splits. */
export interface TransactionSplit {
  id?: string;
  transaction_id?: string;
  company_id?: string;
  description: string;
  supplier_name?: string;
  category_id?: string | null;
  amount: number;
  notes?: string;
  sort_order?: number;
}

/** A row from a linked detail document (e.g. credit card statement line) */
export interface DocDetailRow {
  business_name?: string;
  payee_name?: string;
  charge_amount?: number;
  amount?: number;
  transaction_date?: string;
  category?: string;
  [key: string]: unknown;
}
