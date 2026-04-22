export interface CategoryRuleView {
  id: string;
  category_id: string;
  match_field: string;
  match_type: string;
  match_value: string;
  priority: number;
}

export interface SupplierRuleConflict {
  supplier_key: string;
  supplier_display: string;
  categories: Array<{ id: string; name: string }>;
  rules: CategoryRuleView[];
}

export type ClassificationSource =
  | "supplier_rule"
  | "description_rule"
  | "details_rule"
  | "reference_rule"
  | "operation_code_rule"
  | "split_rule"
  | "manual_or_unknown";

export interface ClassifiedTransactionRow {
  id: string;
  kind: "transaction" | "split";
  date: string;
  description: string;
  supplier_name: string | null;
  amount: number;
  category_id: string;
  category_name: string;
  matched_by: ClassificationSource;
  matched_rule_value: string | null;
}
