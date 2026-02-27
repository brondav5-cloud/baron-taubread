import type {
  DbAccount,
  DbCustomGroup,
  DbAccountClassificationOverride,
  ParentSection,
} from "@/types/accounting";

export type AccountTransaction = {
  account_id: string;
  transaction_date: string;
  group_code: string;
  counter_account: string | null;
  debit?: number;
  credit?: number;
};

export function getEffectiveGroup(
  acct: DbAccount,
  customGroups: DbCustomGroup[],
  overrides: DbAccountClassificationOverride[],
): DbCustomGroup | null {
  const override = overrides.find(o => o.account_id === acct.id);
  if (override) return customGroups.find(g => g.id === override.custom_group_id) ?? null;
  for (const g of customGroups) {
    if ((g.account_codes ?? []).includes(acct.code)) return g;
  }
  for (const g of customGroups) {
    if (g.group_codes.includes(acct.latest_group_code ?? "")) return g;
  }
  return null;
}

export const SECTION_COLORS: Record<ParentSection, string> = {
  cost_of_goods: "#EF4444",
  operating: "#F97316",
  admin: "#A855F7",
  finance: "#3B82F6",
  other: "#6B7280",
};

export const TAG_PALETTE = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E", "#14B8A6",
  "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280", "#111827",
];
