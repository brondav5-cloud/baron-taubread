import type { PnlBlockKind, PnlLayoutBlock } from "./types";

export const MONTH_NAMES = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

export const BLOCK_KIND_LABELS: Record<PnlBlockKind, string> = {
  income: "הכנסות",
  cost_of_goods: "עלות המכר",
  operating: "הוצאות תפעול",
  admin: "הוצאות הנהלה",
  finance: "הוצאות מימון",
  other: "אחר",
};

export const BLOCK_KIND_ORDER: PnlBlockKind[] = [
  "income",
  "cost_of_goods",
  "operating",
  "admin",
  "finance",
  "other",
];

export const DEFAULT_BLOCKS: PnlLayoutBlock[] = [
  { id: "default-income", name: "הכנסות", kind: "income", sort_order: 0, categories: [] },
  { id: "default-cogs", name: "עלות המכר", kind: "cost_of_goods", sort_order: 1, categories: [] },
  { id: "default-operating", name: "הוצאות תפעול", kind: "operating", sort_order: 2, categories: [] },
  { id: "default-admin", name: "הוצאות הנהלה", kind: "admin", sort_order: 3, categories: [] },
  { id: "default-finance", name: "הוצאות מימון", kind: "finance", sort_order: 4, categories: [] },
  { id: "default-other", name: "אחר", kind: "other", sort_order: 5, categories: [] },
];
