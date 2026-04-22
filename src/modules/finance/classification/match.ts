export type MatchField = "description" | "details" | "reference" | "operation_code" | "supplier_name";
export type MatchType = "contains" | "starts_with" | "exact" | "regex";

export interface MatchRule {
  match_field: MatchField;
  match_type: MatchType;
  match_value: string;
}

type MatchableRow = Partial<Record<MatchField, string | null | undefined>>;

const QUOTE_RE = /["'`׳״]/g;
const NON_TEXT_RE = /[^a-z0-9א-ת\s]/gi;

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeForMatch(value: string): string {
  return collapseSpaces(value.toLowerCase().replace(QUOTE_RE, "").replace(NON_TEXT_RE, " "));
}

export function normalizeSupplierDisplay(value: string): string {
  return collapseSpaces(value.toLowerCase().replace(QUOTE_RE, ""));
}

export function baseSupplierKey(value: string): string {
  return normalizeSupplierDisplay(value)
    .replace(/\b(בעמ|בע\s?מ|בע"מ|בע''מ|בע׳׳מ)\b/g, "")
    .replace(/\bחברה\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function containsWholeToken(haystack: string, needle: string): boolean {
  if (!needle) return false;
  const paddedHaystack = ` ${haystack} `;
  const paddedNeedle = ` ${needle} `;
  return paddedHaystack.includes(paddedNeedle) || haystack.includes(needle);
}

export function matchesRuleNormalized(row: MatchableRow, rule: MatchRule): boolean {
  const rawRuleValue = collapseSpaces(rule.match_value ?? "");
  if (!rawRuleValue) return false;

  const rawFieldValue = String(row[rule.match_field] ?? "");
  if (!rawFieldValue.trim()) return false;

  if (rule.match_type === "regex") {
    try {
      return new RegExp(rawRuleValue, "i").test(rawFieldValue);
    } catch {
      return false;
    }
  }

  const needle = normalizeForMatch(rawRuleValue);
  const haystack = normalizeForMatch(rawFieldValue);
  if (!needle || !haystack) return false;

  switch (rule.match_type) {
    case "contains":
      return containsWholeToken(haystack, needle);
    case "starts_with":
      return haystack.startsWith(needle);
    case "exact":
      return haystack === needle;
    default:
      return false;
  }
}
