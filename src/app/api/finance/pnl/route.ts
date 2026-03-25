/**
 * GET /api/finance/pnl?year=2025&month=3  (month optional)
 *
 * Returns P&L summary grouped by category type and category.
 * If month is omitted → full-year summary with monthly breakdown.
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

    const dateFrom = monthParam
      ? `${year}-${String(monthParam).padStart(2, "0")}-01`
      : `${year}-01-01`;
    // Use actual last day of month (handles 28/29/30/31 correctly)
    const dateTo = monthParam
      ? new Date(year, parseInt(monthParam), 0).toISOString().slice(0, 10)
      : `${year}-12-31`;

    const supabase = getSupabaseAdmin();

    const [{ data: categories }, { data: transactions }] = await Promise.all([
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
    ]);

    const catMap = new Map<string, CategoryRow>(
      (categories ?? []).map((c: CategoryRow) => [c.id, c])
    );

    // Build lines map: category_id (or "__none__") → line
    const linesMap = new Map<string, PnlCategoryLine>();

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

    const monthSet = new Set<string>();

    for (const tx of (transactions ?? []) as TxRow[]) {
      const ym = tx.date.slice(0, 7); // "YYYY-MM"
      monthSet.add(ym);

      const catId = tx.category_id ?? null;
      const line = getOrCreate(catId);

      // For income categories: use credit; for expense: use debit; for uncategorized: net
      const cat = catId ? catMap.get(catId) : null;
      const type = cat?.type ?? "uncategorized";

      let amount = 0;
      if (type === "income") {
        amount = tx.credit - tx.debit;
      } else if (type === "expense") {
        amount = tx.debit - tx.credit;
      } else {
        // transfer / ignore / uncategorized: net outflow
        amount = tx.debit - tx.credit;
      }

      line.total += amount;
      line.monthly[ym] = (line.monthly[ym] ?? 0) + amount;
    }

    const lines = Array.from(linesMap.values()).sort((a, b) => {
      // Sort: income first, then expense, then transfer, then ignore, then uncategorized
      const order = ["income", "expense", "transfer", "ignore", "uncategorized"];
      const ai = order.indexOf(a.category_type);
      const bi = order.indexOf(b.category_type);
      if (ai !== bi) return ai - bi;
      return b.total - a.total;
    });

    const income_total = lines
      .filter((l) => l.category_type === "income")
      .reduce((s, l) => s + l.total, 0);

    const expense_total = lines
      .filter((l) => l.category_type === "expense")
      .reduce((s, l) => s + l.total, 0);

    const response: PnlResponse = {
      year,
      months: Array.from(monthSet).sort(),
      income_total,
      expense_total,
      net: income_total - expense_total,
      lines,
    };

    return NextResponse.json(response);
  } catch (err) {
    logError("finance/pnl: unhandled", err);
    return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
  }
}
