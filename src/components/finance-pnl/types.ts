import type { PnlCategoryLine, PnlResponse } from "@/app/api/finance/pnl/route";

export type PnlBlockKind =
  | "income"
  | "cost_of_goods"
  | "operating"
  | "admin"
  | "finance"
  | "other";

export interface PnlLayoutCategory {
  category_id: string;
  sort_order: number;
}

export interface PnlLayoutBlock {
  id: string;
  name: string;
  kind: PnlBlockKind;
  sort_order: number;
  categories: PnlLayoutCategory[];
}

export interface PnlLayoutResponse {
  blocks: PnlLayoutBlock[];
}

export interface PnlStatementCategory {
  id: string;
  name: string;
  type: PnlCategoryLine["category_type"];
  total: number;
  monthly: Record<string, number>;
}

export interface PnlStatementBlock {
  id: string;
  name: string;
  kind: PnlBlockKind;
  sortOrder: number;
  categories: PnlStatementCategory[];
  total: number;
}

export interface PnlStatementView {
  months: string[];
  blocks: PnlStatementBlock[];
  revenueTotal: number;
  costOfGoodsTotal: number;
  operatingExpensesTotal: number;
  financeAndOtherTotal: number;
  grossProfit: number;
  operatingProfit: number;
  netProfit: number;
}

export interface PnlLayoutCategoryOption {
  id: string;
  name: string;
  type: PnlCategoryLine["category_type"];
}

export interface PnlPageData {
  pnl: PnlResponse | null;
  layout: PnlLayoutBlock[];
}
