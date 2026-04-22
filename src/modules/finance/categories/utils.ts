import type { BankCategory } from "@/modules/finance/types";
import type { CategoryRuleView, ClassificationSource, SupplierRuleConflict } from "./types";

function normalizeSupplierValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/["'`׳״]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildSupplierRuleConflicts(
  rules: CategoryRuleView[],
  categories: BankCategory[]
): SupplierRuleConflict[] {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const supplierRules = rules.filter((r) => r.match_field === "supplier_name");
  const grouped = new Map<string, CategoryRuleView[]>();

  for (const rule of supplierRules) {
    const key = normalizeSupplierValue(rule.match_value);
    if (!key) continue;
    const list = grouped.get(key) ?? [];
    list.push(rule);
    grouped.set(key, list);
  }

  const conflicts: SupplierRuleConflict[] = [];
  for (const [supplierKey, groupRules] of Array.from(grouped.entries())) {
    const uniqueCategoryIds = Array.from(new Set(groupRules.map((r) => r.category_id)));
    if (uniqueCategoryIds.length <= 1) continue;
    const categoriesForSupplier = uniqueCategoryIds
      .map((id) => categoryById.get(id))
      .filter(Boolean)
      .map((cat) => ({ id: cat!.id, name: cat!.name }));

    conflicts.push({
      supplier_key: supplierKey,
      supplier_display: groupRules[0]?.match_value ?? supplierKey,
      categories: categoriesForSupplier,
      rules: groupRules,
    });
  }

  return conflicts.sort((a, b) => a.supplier_display.localeCompare(b.supplier_display, "he"));
}

export function classificationSourceLabel(source: ClassificationSource): string {
  switch (source) {
    case "supplier_rule":
      return "כלל שם ספק";
    case "description_rule":
      return "כלל תיאור";
    case "details_rule":
      return "כלל פרטים";
    case "reference_rule":
      return "כלל אסמכתא";
    case "operation_code_rule":
      return "כלל קוד פעולה";
    case "split_rule":
      return "כלל פיצול";
    default:
      return "ידני/לא מזוהה";
  }
}
