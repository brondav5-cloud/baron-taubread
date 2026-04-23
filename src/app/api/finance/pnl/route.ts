/**
 * GET /api/finance/pnl?year=2025&month=3  (month optional)
 *
 * Returns P&L summary grouped by category type and category.
 * If month is omitted → full-year summary with monthly breakdown.
 * Also returns prior-year totals (YoY) and classification coverage %.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { logError } from "@/lib/api/logger";

interface CategoryRow {
  id: string;
  name: string;
  type: "income" | "expense" | "transfer" | "ignore";
  color: string | null;
}

interface TxRow {
  id: string;
  date: string;
  effective_date: string;
  debit: number;
  credit: number;
  category_id: string | null;
  merged_into_id: string | null;
}

interface SplitRow {
  transaction_id: string;
  category_id: string | null;
  amount: number;
}

const FETCH_BATCH_SIZE = 1000;

export interface PnlCategoryLine {
  category_id: string | null;
  category_name: string;
  category_type: "income" | "expense" | "transfer" | "ignore" | "uncategorized";
  color: string | null;
  total: number;
  monthly: Record<string, number>;  // "YYYY-MM" → amount
}

export interface PnlResponse {
  year: number;
  months: string[];            // list of "YYYY-MM" present in data
  income_total: number;
  expense_total: number;
  net: number;
  lines: PnlCategoryLine[];
  // Year-over-year (previous year, same period)
  prev_income_total: number;
  prev_expense_total: number;
  prev_net: number;
  // Classification coverage
  classified_pct: number;      // 0–100, how many tx have a category
}

function lastDayOfMonth(year: number, month: number): string {
  // month is 1-indexed (1=Jan … 12=Dec)
  return new Date(year, month, 0).toISOString().slice(0, 10);
}

function buildLines(
  transactions: TxRow[],
  catMap: Map<string, CategoryRow>,
  splits: SplitRow[] = []
): { lines: PnlCategoryLine[]; monthSet: Set<string>; incomeTotal: number; expenseTotal: number } {
  const linesMap = new Map<string, PnlCategoryLine>();
  const monthSet = new Set<string>();

  const getOrCreate = (catId: string | null): PnlCategoryLine => {
    const key = catId ?? "__none__";
    if (!linesMap.has(key)) {
      const cat = catId ? catMap.get(catId) : null;
      linesMap.set(key, {
        category_id: catId,
        category_name: cat?.name ?? "לא מסווג",
        category_type: cat?.type ?? "uncategorized",
        color: cat?.color ?? null,
        total: 0,
        monthly: {},
      });
    }
    return linesMap.get(key)!;
  };

  // Build splits lookup: tx_id → splits[]
  const splitsMap = new Map<string, SplitRow[]>();
  for (const s of splits) {
    const arr = splitsMap.get(s.transaction_id) ?? [];
    arr.push(s);
    splitsMap.set(s.transaction_id, arr);
  }
  const splitTxIds = new Set(splitsMap.keys());

  // Build tx date map for split month-bucketing
  const txDateMap = new Map<string, string>();
  for (const tx of transactions) txDateMap.set(tx.id, tx.effective_date);

  // Process transactions — skip those handled via splits
  for (const tx of transactions) {
    if (splitTxIds.has(tx.id)) continue;

    const ym = tx.effective_date.slice(0, 7);
    monthSet.add(ym);
    const catId = tx.category_id ?? null;
    const line = getOrCreate(catId);
    const cat = catId ? catMap.get(catId) : null;
    const type = cat?.type ?? "uncategorized";

    const amount = type === "income" ? tx.credit - tx.debit : tx.debit - tx.credit;
    line.total += amount;
    line.monthly[ym] = (line.monthly[ym] ?? 0) + amount;
  }

  // Process splits — each split contributes its own amount to its category
  splitsMap.forEach((txSplits, txId) => {
    const date = txDateMap.get(txId);
    if (!date) return;
    const ym = date.slice(0, 7);
    monthSet.add(ym);

    for (const s of txSplits) {
      const line = getOrCreate(s.category_id ?? null);
      line.total += s.amount;
      line.monthly[ym] = (line.monthly[ym] ?? 0) + s.amount;
    }
  });

  const lines = Array.from(linesMap.values()).sort((a, b) => {
    const order = ["income", "expense", "transfer", "ignore", "uncategorized"];
    const ai = order.indexOf(a.category_type);
    const bi = order.indexOf(b.category_type);
    if (ai !== bi) return ai - bi;
    return b.total - a.total;
  });

  const incomeTotal = lines.filter((l) => l.category_type === "income").reduce((s, l) => s + l.total, 0);
  const expenseTotal = lines.filter((l) => l.category_type === "expense").reduce((s, l) => s + l.total, 0);

  return { lines, monthSet, incomeTotal, expenseTotal };
}

function filterMovementsUsingMergedChildren<T extends { id: string; merged_into_id: string | null }>(rows: T[]): T[] {
  const mergedParentIds = new Set(
    rows
      .map((r) => r.merged_into_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );

  // Keep merged children + standalone rows; drop synthetic merge masters.
  return rows.filter((row) => row.merged_into_id !== null || !mergedParentIds.has(row.id));
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAuth = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

    const { companyId } = await resolveSelectedCompanyId(supabaseAuth, user.id);
    if (!companyId) return NextResponse.json({ error: "לא נבחרה חברה" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
    const monthParam = searchParams.get("month");
    const monthNum = monthParam ? parseInt(monthParam) : null;

    const dateFrom = monthNum
      ? `${year}-${String(monthNum).padStart(2, "0")}-01`
      : `${year}-01-01`;
    const dateTo = monthNum
      ? lastDayOfMonth(year, monthNum)
      : `${year}-12-31`;

    const prevYear = year - 1;
    const prevDateFrom = monthNum
      ? `${prevYear}-${String(monthNum).padStart(2, "0")}-01`
      : `${prevYear}-01-01`;
    const prevDateTo = monthNum
      ? lastDayOfMonth(prevYear, monthNum)
      : `${prevYear}-12-31`;

    const supabase = getSupabaseAdmin();

    const [{ data: categories }] = await Promise.all([
      supabase
        .from("bank_categories")
        .select("id, name, type, color")
        .eq("company_id", companyId),
    ]);

    const catMap = new Map<string, CategoryRow>(
      (categories ?? []).map((c: CategoryRow) => [c.id, c])
    );

    // Fetch all current-period transactions in pages (avoid server row caps)
    const currentAll: TxRow[] = [];
    let currentOffset = 0;
    while (true) {
      const { data: batch, error: batchErr } = await supabase
        .from("bank_transactions")
        .select("id, date, effective_date, debit, credit, category_id, merged_into_id")
        .eq("company_id", companyId)
        .gte("effective_date", dateFrom)
        .lte("effective_date", dateTo)
        .order("effective_date")
        .range(currentOffset, currentOffset + FETCH_BATCH_SIZE - 1);
      if (batchErr) throw batchErr;
      const rows = (batch ?? []) as TxRow[];
      if (rows.length === 0) break;
      currentAll.push(...rows);
      if (rows.length < FETCH_BATCH_SIZE) break;
      currentOffset += FETCH_BATCH_SIZE;
    }

    // Fetch all previous-period transactions in pages
    const previousAll: Array<Pick<TxRow, "id" | "debit" | "credit" | "category_id" | "merged_into_id">> = [];
    let previousOffset = 0;
    while (true) {
      const { data: batch, error: batchErr } = await supabase
        .from("bank_transactions")
        .select("id, debit, credit, category_id, merged_into_id")
        .eq("company_id", companyId)
        .gte("effective_date", prevDateFrom)
        .lte("effective_date", prevDateTo)
        .order("id")
        .range(previousOffset, previousOffset + FETCH_BATCH_SIZE - 1);
      if (batchErr) throw batchErr;
      const rows = (batch ?? []) as typeof previousAll;
      if (rows.length === 0) break;
      previousAll.push(...rows);
      if (rows.length < FETCH_BATCH_SIZE) break;
      previousOffset += FETCH_BATCH_SIZE;
    }

    const currentTxRows = filterMovementsUsingMergedChildren(currentAll);

    // Fetch splits for the current-period transactions
    const txIds = currentTxRows.map((t) => t.id);
    let splits: SplitRow[] = [];
    if (txIds.length > 0) {
      const idChunks = chunkArray(txIds, FETCH_BATCH_SIZE);
      for (const chunk of idChunks) {
        const { data: splitsData, error: splitsErr } = await supabase
          .from("bank_transaction_splits")
          .select("transaction_id, category_id, amount")
          .in("transaction_id", chunk)
          .eq("company_id", companyId);
        if (splitsErr) throw splitsErr;
        splits.push(...((splitsData ?? []) as SplitRow[]));
      }
    }

    // Build current year lines (splits replace their parent transactions)
    const { lines, monthSet, incomeTotal, expenseTotal } =
      buildLines(currentTxRows, catMap, splits);

    // Compute YoY totals
    let prev_income_total = 0;
    let prev_expense_total = 0;
    const previousTxRows = filterMovementsUsingMergedChildren(previousAll);
    for (const tx of previousTxRows) {
      const cat = tx.category_id ? catMap.get(tx.category_id) : null;
      if (cat?.type === "income")  prev_income_total += tx.credit - tx.debit;
      if (cat?.type === "expense") prev_expense_total += tx.debit - tx.credit;
    }

    // Classification coverage
    const totalCount = currentTxRows.length;
    const classifiedCount = currentTxRows.filter((tx) => tx.category_id !== null).length;
    const classified_pct = totalCount > 0
      ? Math.round((classifiedCount / totalCount) * 100)
      : 100;

    const response: PnlResponse = {
      year,
      months: Array.from(monthSet).sort(),
      income_total: incomeTotal,
      expense_total: expenseTotal,
      net: incomeTotal - expenseTotal,
      lines,
      prev_income_total,
      prev_expense_total,
      prev_net: prev_income_total - prev_expense_total,
      classified_pct,
    };

    return NextResponse.json(response);
  } catch (err) {
    logError("finance/pnl: unhandled", err);
    return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
  }
}
