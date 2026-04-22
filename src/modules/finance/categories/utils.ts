import type { BankCategory } from "@/modules/finance/types";
import type {
  CategoryRuleView,
  ClassificationSource,
  SupplierRuleConflict,
  SupplierSimilarityWarning,
} from "./types";

function normalizeSupplierValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/["'`׳״]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function baseSupplierValue(value: string): string {
  return normalizeSupplierValue(value)
    .replace(/\bבעמ\b/g, "")
    .replace(/\bבע\s?מ\b/g, "")
    .replace(/\b(בע"מ|בע''מ|בע׳׳מ)\b/g, "")
    .replace(/\bחברה\b/g, "")
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

export function buildSupplierSimilarityWarnings(
  rules: CategoryRuleView[],
  categories: BankCategory[]
): SupplierSimilarityWarning[] {
  const supplierRules = rules.filter((r) => r.match_field === "supplier_name");
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const byBase = new Map<
    string,
    { variants: Set<string>; categoryIds: Set<string>; normalizedVariants: Set<string> }
  >();

  for (const rule of supplierRules) {
    const normalized = normalizeSupplierValue(rule.match_value);
    const base = baseSupplierValue(rule.match_value);
    if (!normalized || !base) continue;
    const group = byBase.get(base) ?? {
      variants: new Set<string>(),
      categoryIds: new Set<string>(),
      normalizedVariants: new Set<string>(),
    };
    group.variants.add(rule.match_value.trim());
    group.categoryIds.add(rule.category_id);
    group.normalizedVariants.add(normalized);
    byBase.set(base, group);
  }

  const warnings: SupplierSimilarityWarning[] = [];
  for (const [baseKey, group] of Array.from(byBase.entries())) {
    if (group.normalizedVariants.size <= 1) continue;
    const variants = Array.from(group.variants).sort((a, b) => a.localeCompare(b, "he"));
    const catList = Array.from(group.categoryIds)
      .map((id) => categoryById.get(id))
      .filter(Boolean)
      .map((cat) => ({ id: cat!.id, name: cat!.name }));
    warnings.push({
      base_key: baseKey,
      variants,
      categories: catList,
    });
  }

  return warnings.sort((a, b) => a.variants[0]!.localeCompare(b.variants[0]!, "he"));
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
