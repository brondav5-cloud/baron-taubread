/**
 * GET /api/finance/pnl/category?categoryId=xxx&year=2025
 *
 * Returns grouped rows for a category (or uncategorized) within the year.
 * Excludes merged-into children; collapses identical bank lines (same date, supplier, description, reference).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { logError } from "@/lib/api/logger";

/** One aggregated row: same date + description + supplier + reference (bank line identity) */
export interface CategoryTransactionGroup {
  /** Open transaction detail / analysis for this group */
  representative_id: string;
  /** Real bank transaction id for opening the transaction drawer */
  open_tx_id: string;
  count: number;
  amount: number;
  date: string;
  description: string;
  details: string;
  reference: string;
  source_bank: string;
  notes: string | null;
  supplier_name: string | null;
}

export interface CategoryTransactionsResponse {
  category_name: string;
  category_type: string;
  year: number;
  groups: CategoryTransactionGroup[];
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

    // Fetch transactions in the period first (we'll apply category filter after split replacement)
    const query = supabase
      .from("bank_transactions")
      .select("id, date, effective_date, description, details, debit, credit, reference, source_bank, notes, supplier_name, category_id")
      .eq("company_id", companyId)
      .gte("effective_date", dateFrom)
      .lte("effective_date", dateTo)
      .is("merged_into_id", null)
      .order("effective_date", { ascending: false });

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

    type TxWithMeta = {
      id: string;
      date: string;
      effective_date: string;
      description: string;
      details: string;
      debit: number;
      credit: number;
      reference: string;
      source_bank: string;
      notes: string | null;
      supplier_name: string | null;
      category_id: string | null;
    };

    const txRows = (transactions ?? []) as TxWithMeta[];
    const txMap = new Map<string, TxWithMeta>(txRows.map((t) => [t.id, t]));

    // Load splits for all transactions in the period
    const txIds = txRows.map((t) => t.id);
    type SplitRow = {
      transaction_id: string;
      category_id: string | null;
      amount: number;
      description: string;
      supplier_name: string | null;
      notes: string | null;
    };
    let splitRows: SplitRow[] = [];
    if (txIds.length > 0) {
      const { data: splitsData } = await supabase
        .from("bank_transaction_splits")
        .select("transaction_id, category_id, amount, description, supplier_name, notes")
        .in("transaction_id", txIds)
        .eq("company_id", companyId);
      splitRows = (splitsData ?? []) as SplitRow[];
    }
    const splitTxIds = new Set(splitRows.map((s) => s.transaction_id));

    type TxRow = {
      id: string;
      open_tx_id: string;
      date: string;
      description: string;
      details: string;
      amount: number;
      reference: string;
      source_bank: string;
      notes: string | null;
      supplier_name: string | null;
    };

    const rows: TxRow[] = [];

    // 1) Unsplit transactions only
    for (const tx of txRows) {
      if (splitTxIds.has(tx.id)) continue;
      const matchesCategory = categoryId ? tx.category_id === categoryId : tx.category_id == null;
      if (!matchesCategory) continue;

      rows.push({
        id: tx.id,
        open_tx_id: tx.id,
        date: tx.effective_date ?? tx.date,
        description: tx.supplier_name ?? tx.description ?? "",
        details: tx.details ?? "",
        amount: isExpenseOrTransfer ? Number(tx.debit) - Number(tx.credit) : Number(tx.credit) - Number(tx.debit),
        reference: tx.reference ?? "",
        source_bank: tx.source_bank ?? "",
        notes: tx.notes ?? null,
        supplier_name: tx.supplier_name ?? null,
      });
    }

    // 2) Split rows replace their parent transactions
    for (const s of splitRows) {
      const parent = txMap.get(s.transaction_id);
      if (!parent) continue;
      const matchesCategory = categoryId ? s.category_id === categoryId : s.category_id == null;
      if (!matchesCategory) continue;

      const label = s.supplier_name?.trim() || s.description?.trim() || parent.supplier_name || parent.description || "";
      const splitKey = `${parent.id}::${label}::${parent.reference ?? ""}`;
      rows.push({
        id: splitKey,
        open_tx_id: parent.id,
        date: parent.effective_date ?? parent.date,
        description: label,
        details: parent.details ?? "",
        amount: Number(s.amount) || 0,
        reference: parent.reference ?? "",
        source_bank: parent.source_bank ?? "",
        notes: s.notes ?? parent.notes ?? null,
        supplier_name: s.supplier_name ?? parent.supplier_name ?? null,
      });
    }

    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
    const groupMap = new Map<string, TxRow[]>();
    for (const row of rows) {
      const key = [
        row.date,
        norm(row.supplier_name ?? ""),
        norm(row.description),
        row.reference.trim(),
      ].join("\x1e");
      const arr = groupMap.get(key) ?? [];
      arr.push(row);
      groupMap.set(key, arr);
    }

    const groups: CategoryTransactionGroup[] = Array.from(groupMap.values())
      .map((txs) => {
        const amount = txs.reduce((s, t) => s + t.amount, 0);
        const rep = txs.reduce((a, b) => (Math.abs(b.amount) > Math.abs(a.amount) ? b : a));
        const date = txs.reduce((a, b) => (a >= b.date ? a : b.date), txs[0]!.date);
        return {
          representative_id: rep.id,
          open_tx_id: rep.open_tx_id,
          count: txs.length,
          amount,
          date,
          description: rep.description,
          details: rep.details,
          reference: rep.reference,
          source_bank: rep.source_bank,
          notes: rep.notes,
          supplier_name: rep.supplier_name,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date) || Math.abs(b.amount) - Math.abs(a.amount));

    return NextResponse.json({
      category_name: categoryName,
      category_type: categoryType,
      year,
      groups,
    } satisfies CategoryTransactionsResponse);
  } catch (err) {
    logError("finance/pnl/category: unhandled", err);
    return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
  }
}
