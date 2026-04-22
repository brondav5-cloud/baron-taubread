import type { PnlCategoryLine } from "@/app/api/finance/pnl/route";
import { DEFAULT_BLOCKS } from "./constants";
import type {
  PnlLayoutBlock,
  PnlLayoutCategoryOption,
  PnlStatementBlock,
  PnlStatementCategory,
  PnlStatementView,
} from "./types";

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
