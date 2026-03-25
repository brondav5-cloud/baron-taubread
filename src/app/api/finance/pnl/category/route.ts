/**
 * GET /api/finance/pnl/category?categoryId=xxx&year=2025
 *
 * Returns individual transactions for a specific category (or uncategorized)
 * within a given year. Used by the category drill-down modal in the P&L page.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { logError } from "@/lib/api/logger";

export interface CategoryTransaction {
  id: string;
  date: string;
  description: string;
  details: string;
  amount: number;
  reference: string;
  source_bank: string;
  notes: string | null;
  supplier_name: string | null;
}

export interface CategoryTransactionsResponse {
  category_name: string;
  category_type: string;
  year: number;
  transactions: CategoryTransaction[];
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
    const categoryId = searchParams.get("categoryId"); // null/"" = uncategorized

    const dateFrom = `${year}-01-01`;
    const dateTo = `${year}-12-31`;

    const supabase = getSupabaseAdmin();

    // Fetch transactions for this category
    let query = supabase
      .from("bank_transactions")
      .select("id, date, description, details, debit, credit, reference, source_bank, notes, supplier_name, category_id")
      .eq("company_id", companyId)
      .gte("date", dateFrom)
      .lte("date", dateTo)
      .order("date", { ascending: false });

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    } else {
      query = query.is("category_id", null);
    }

    const { data: transactions, error: txError } = await query;
    if (txError) throw txError;

    // Get category info
    let categoryName = "לא מסווג";
    let categoryType = "uncategorized";
    if (categoryId) {
      const { data: cat } = await supabase
        .from("bank_categories")
        .select("name, type")
        .eq("id", categoryId)
        .single();
      if (cat) {
        categoryName = cat.name;
        categoryType = cat.type;
      }
    }

    const isExpenseOrTransfer = categoryType === "expense" || categoryType === "transfer";
    const rows: CategoryTransaction[] = (transactions ?? []).map((tx) => ({
      id: tx.id,
      date: tx.date,
      description: tx.supplier_name ?? tx.description ?? "",
      details: tx.details ?? "",
      amount: isExpenseOrTransfer ? tx.debit - tx.credit : tx.credit - tx.debit,
      reference: tx.reference ?? "",
      source_bank: tx.source_bank ?? "",
      notes: tx.notes ?? null,
      supplier_name: tx.supplier_name ?? null,
    }));

    return NextResponse.json({
      category_name: categoryName,
      category_type: categoryType,
      year,
      transactions: rows,
    } satisfies CategoryTransactionsResponse);
  } catch (err) {
    logError("finance/pnl/category: unhandled", err);
    return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
  }
}
