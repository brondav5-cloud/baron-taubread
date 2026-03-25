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
  date: string;
  debit: number;
  credit: number;
  category_id: string | null;
  category_override: string | null;
}

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
  catMap: Map<string, CategoryRow>
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

  for (const tx of transactions) {
    const ym = tx.date.slice(0, 7);
    monthSet.add(ym);
    const catId = tx.category_id ?? null;
    const line = getOrCreate(catId);
    const cat = catId ? catMap.get(catId) : null;
    const type = cat?.type ?? "uncategorized";

    let amount = 0;
    if (type === "income") {
      amount = tx.credit - tx.debit;
    } else {
      amount = tx.debit - tx.credit;
    }

    line.total += amount;
    line.monthly[ym] = (line.monthly[ym] ?? 0) + amount;
  }

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

    const [
      { data: categories },
      { data: transactions },
      { data: prevTransactions },
      { count: totalCount },
      { count: classifiedCount },
    ] = await Promise.all([
      supabase
        .from("bank_categories")
        .select("id, name, type, color")
        .eq("company_id", companyId),
      supabase
        .from("bank_transactions")
        .select("date, debit, credit, category_id, category_override")
        .eq("company_id", companyId)
        .gte("date", dateFrom)
        .lte("date", dateTo)
        .order("date"),
      supabase
        .from("bank_transactions")
        .select("debit, credit, category_id")
        .eq("company_id", companyId)
        .gte("date", prevDateFrom)
        .lte("date", prevDateTo),
      supabase
        .from("bank_transactions")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("date", dateFrom)
        .lte("date", dateTo),
      supabase
        .from("bank_transactions")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("date", dateFrom)
        .lte("date", dateTo)
        .not("category_id", "is", null),
    ]);

    const catMap = new Map<string, CategoryRow>(
      (categories ?? []).map((c: CategoryRow) => [c.id, c])
    );

    // Build current year lines
    const { lines, monthSet, incomeTotal, expenseTotal } =
      buildLines((transactions ?? []) as TxRow[], catMap);

    // Compute YoY totals
    let prev_income_total = 0;
    let prev_expense_total = 0;
    for (const tx of (prevTransactions ?? []) as Pick<TxRow, "debit" | "credit" | "category_id">[]) {
      const cat = tx.category_id ? catMap.get(tx.category_id) : null;
      if (cat?.type === "income")  prev_income_total += tx.credit - tx.debit;
      if (cat?.type === "expense") prev_expense_total += tx.debit - tx.credit;
    }

    // Classification coverage
    const classified_pct = (totalCount ?? 0) > 0
      ? Math.round(((classifiedCount ?? 0) / totalCount!) * 100)
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
