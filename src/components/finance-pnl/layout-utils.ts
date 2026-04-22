import type { PnlCategoryLine } from "@/app/api/finance/pnl/route";
import { DEFAULT_BLOCKS } from "./constants";
import type {
  PnlLayoutBlock,
  PnlLayoutCategoryOption,
  PnlStatementBlock,
  PnlStatementCategory,
  PnlStatementView,
} from "./types";

function expenseKindByName(name: string): PnlLayoutBlock["kind"] {
  const n = name.toLowerCase();
  if (
    n.includes("עלות") ||
    n.includes("מכר") ||
    n.includes("קניות") ||
    n.includes("חומר") ||
    n.includes("סחורה")
  ) {
    return "cost_of_goods";
  }
  if (n.includes("מימון") || n.includes("ריבית") || n.includes("עמלות בנק")) {
    return "finance";
  }
  if (n.includes("הנהלה") || n.includes("משרד") || n.includes("שכר הנהלה")) {
    return "admin";
  }
  if (n.includes("אחר") || n.includes("שונות")) {
    return "other";
  }
  return "operating";
}

export function buildSuggestedLayout(lines: PnlCategoryLine[]): PnlLayoutBlock[] {
  const base: PnlLayoutBlock[] = [
    { id: "seed-income", name: "הכנסות", kind: "income", sort_order: 0, categories: [] },
    { id: "seed-cogs", name: "עלות המכר", kind: "cost_of_goods", sort_order: 1, categories: [] },
    { id: "seed-operating", name: "הוצאות תפעול", kind: "operating", sort_order: 2, categories: [] },
    { id: "seed-admin", name: "הוצאות הנהלה", kind: "admin", sort_order: 3, categories: [] },
    { id: "seed-finance", name: "הוצאות מימון", kind: "finance", sort_order: 4, categories: [] },
    { id: "seed-other", name: "אחר", kind: "other", sort_order: 5, categories: [] },
  ];

  const blockByKind = new Map(base.map((block) => [block.kind, block]));

  const sorted = [...lines]
    .filter((line) => line.category_id && (line.category_type === "income" || line.category_type === "expense"))
    .sort((a, b) => b.total - a.total);

  for (const line of sorted) {
    const kind = line.category_type === "income" ? "income" : expenseKindByName(line.category_name);
    const target = blockByKind.get(kind);
    if (!target) continue;
    target.categories.push({
      category_id: line.category_id!,
      sort_order: target.categories.length,
    });
  }

  return base
    .filter((block) => block.categories.length > 0)
    .map((block, index) => ({ ...block, sort_order: index }));
}

function getCategoryById(lines: PnlCategoryLine[]) {
  const map = new Map<string, PnlCategoryLine>();
  for (const line of lines) {
    if (!line.category_id) continue;
    map.set(line.category_id, line);
  }
  return map;
}

function mappedCategoriesForBlock(
  block: PnlLayoutBlock,
  lineByCategory: Map<string, PnlCategoryLine>,
): PnlStatementCategory[] {
  return [...block.categories]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((link) => lineByCategory.get(link.category_id))
    .filter((line): line is PnlCategoryLine => Boolean(line))
    .map((line) => ({
      id: line.category_id!,
      name: line.category_name,
      type: line.category_type,
      total: line.total,
      monthly: line.monthly,
    }));
}

export function buildStatement(lines: PnlCategoryLine[], months: string[], layout: PnlLayoutBlock[]): PnlStatementView {
  const lineByCategory = getCategoryById(lines);
  const effectiveLayout = layout.length > 0
    ? [...layout].sort((a, b) => a.sort_order - b.sort_order)
    : DEFAULT_BLOCKS;

  const blocks: PnlStatementBlock[] = [];
  const assigned = new Set<string>();

  for (const block of effectiveLayout) {
    const categories = mappedCategoriesForBlock(block, lineByCategory);
    for (const category of categories) assigned.add(category.id);
    blocks.push({
      id: block.id,
      name: block.name,
      kind: block.kind,
      sortOrder: block.sort_order,
      categories,
      total: categories.reduce((sum, row) => sum + row.total, 0),
    });
  }

  const unassignedIncome = lines
    .filter((line) => line.category_type === "income" && line.category_id && !assigned.has(line.category_id))
    .sort((a, b) => b.total - a.total)
    .map((line) => ({
      id: line.category_id!,
      name: line.category_name,
      type: line.category_type,
      total: line.total,
      monthly: line.monthly,
    }));

  const unassignedExpense = lines
    .filter((line) => line.category_type === "expense" && line.category_id && !assigned.has(line.category_id))
    .sort((a, b) => b.total - a.total)
    .map((line) => ({
      id: line.category_id!,
      name: line.category_name,
      type: line.category_type,
      total: line.total,
      monthly: line.monthly,
    }));

  if (unassignedIncome.length > 0) {
    blocks.push({
      id: "auto-unassigned-income",
      name: "הכנסות לא משויכות",
      kind: "income",
      sortOrder: 9990,
      categories: unassignedIncome,
      total: unassignedIncome.reduce((sum, row) => sum + row.total, 0),
    });
  }

  if (unassignedExpense.length > 0) {
    blocks.push({
      id: "auto-unassigned-expense",
      name: "הוצאות לא משויכות",
      kind: "other",
      sortOrder: 9991,
      categories: unassignedExpense,
      total: unassignedExpense.reduce((sum, row) => sum + row.total, 0),
    });
  }

  blocks.sort((a, b) => a.sortOrder - b.sortOrder);

  const revenueTotal = blocks
    .filter((block) => block.kind === "income")
    .reduce((sum, block) => sum + block.total, 0);
  const costOfGoodsTotal = blocks
    .filter((block) => block.kind === "cost_of_goods")
    .reduce((sum, block) => sum + block.total, 0);
  const operatingExpensesTotal = blocks
    .filter((block) => block.kind === "operating" || block.kind === "admin")
    .reduce((sum, block) => sum + block.total, 0);
  const financeAndOtherTotal = blocks
    .filter((block) => block.kind === "finance" || block.kind === "other")
    .reduce((sum, block) => sum + block.total, 0);

  const grossProfit = revenueTotal - costOfGoodsTotal;
  const operatingProfit = grossProfit - operatingExpensesTotal;
  const netProfit = operatingProfit - financeAndOtherTotal;

  return {
    months,
    blocks,
    revenueTotal,
    costOfGoodsTotal,
    operatingExpensesTotal,
    financeAndOtherTotal,
    grossProfit,
    operatingProfit,
    netProfit,
  };
}

export function pnlDisplayMonths(compareMonths: string[], allMonths: string[]): string[] {
  return compareMonths.length > 0 ? compareMonths : allMonths;
}

export function sumCategoryInMonths(
  monthly: Record<string, number>,
  months: string[],
): number {
  return months.reduce((s, m) => s + (monthly[m] ?? 0), 0);
}

export function sumBlockInMonths(block: PnlStatementBlock, months: string[]): number {
  return block.categories.reduce(
    (sum, row) => sum + sumCategoryInMonths(row.monthly, months),
    0,
  );
}

export function subtotalBlocksInMonth(blocks: PnlStatementBlock[], month: string): number {
  let sum = 0;
  for (const block of blocks) {
    for (const row of block.categories) {
      sum += row.monthly[month] ?? 0;
    }
  }
  return sum;
}

export function computePnlPeriodKpis(
  view: PnlStatementView,
  months: string[],
): {
  revenueTotal: number;
  costOfGoodsTotal: number;
  operatingExpensesTotal: number;
  financeAndOtherTotal: number;
  grossProfit: number;
  operatingProfit: number;
  netProfit: number;
} {
  const revenueTotal = view.blocks
    .filter((b) => b.kind === "income")
    .reduce((sum, b) => sum + sumBlockInMonths(b, months), 0);
  const costOfGoodsTotal = view.blocks
    .filter((b) => b.kind === "cost_of_goods")
    .reduce((sum, b) => sum + sumBlockInMonths(b, months), 0);
  const operatingExpensesTotal = view.blocks
    .filter((b) => b.kind === "operating" || b.kind === "admin")
    .reduce((sum, b) => sum + sumBlockInMonths(b, months), 0);
  const financeAndOtherTotal = view.blocks
    .filter((b) => b.kind === "finance" || b.kind === "other")
    .reduce((sum, b) => sum + sumBlockInMonths(b, months), 0);
  const grossProfit = revenueTotal - costOfGoodsTotal;
  const operatingProfit = grossProfit - operatingExpensesTotal;
  const netProfit = operatingProfit - financeAndOtherTotal;
  return {
    revenueTotal,
    costOfGoodsTotal,
    operatingExpensesTotal,
    financeAndOtherTotal,
    grossProfit,
    operatingProfit,
    netProfit,
  };
}

export function buildLayoutCategoryOptions(lines: PnlCategoryLine[]): PnlLayoutCategoryOption[] {
  return lines
    .filter((line) => line.category_id && (line.category_type === "income" || line.category_type === "expense"))
    .map((line) => ({
      id: line.category_id!,
      name: line.category_name,
      type: line.category_type,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "he"));
}
