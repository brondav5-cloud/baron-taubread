/**
 * GET /api/finance/pnl/category?categoryId=xxx&year=2025&month=3
 *
 * Returns rows for a category (or uncategorized) within the selected period.
 * Uses merged children as the source of truth (children + standalone rows,
 * excluding synthetic merge masters).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { logError } from "@/lib/api/logger";

const FETCH_BATCH_SIZE = 1000;

/** One movement row returned to the UI */
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
    const monthParam = searchParams.get("month");
    const monthNum = monthParam ? Number.parseInt(monthParam, 10) : null;
    const useMonthRange = Number.isFinite(monthNum) && monthNum! >= 1 && monthNum! <= 12;

    const dateFrom = useMonthRange
      ? `${year}-${String(monthNum!).padStart(2, "0")}-01`
      : `${year}-01-01`;
    const dateTo = useMonthRange
      ? new Date(year, monthNum!, 0).toISOString().slice(0, 10)
      : `${year}-12-31`;

    const supabase = getSupabaseAdmin();

    const filterMovementsUsingMergedChildren = <T extends { id: string; merged_into_id: string | null }>(rows: T[]): T[] => {
      const mergedParentIds = new Set(
        rows
          .map((r) => r.merged_into_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      );
      return rows.filter((row) => row.merged_into_id !== null || !mergedParentIds.has(row.id));
    };

    const chunkArray = <T>(items: T[], size: number): T[][] => {
      const out: T[][] = [];
      for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
      return out;
    };

    // Fetch transactions in the period first (we'll apply category filter after split replacement)
    const allTransactions: Array<{
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
      merged_into_id: string | null;
    }> = [];
    let txOffset = 0;
    while (true) {
      const { data: txBatch, error: txError } = await supabase
        .from("bank_transactions")
        .select("id, date, effective_date, description, details, debit, credit, reference, source_bank, notes, supplier_name, category_id, merged_into_id")
        .eq("company_id", companyId)
        .gte("effective_date", dateFrom)
        .lte("effective_date", dateTo)
        .order("effective_date", { ascending: false })
        .range(txOffset, txOffset + FETCH_BATCH_SIZE - 1);
      if (txError) throw txError;
      const rows = (txBatch ?? []) as typeof allTransactions;
      if (rows.length === 0) break;
      allTransactions.push(...rows);
      if (rows.length < FETCH_BATCH_SIZE) break;
      txOffset += FETCH_BATCH_SIZE;
    }

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
      merged_into_id: string | null;
    };

    const txRows = filterMovementsUsingMergedChildren(allTransactions as TxWithMeta[]);
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
      const idChunks = chunkArray(txIds, FETCH_BATCH_SIZE);
      for (const chunk of idChunks) {
        const { data: splitsData, error: splitsErr } = await supabase
          .from("bank_transaction_splits")
          .select("transaction_id, category_id, amount, description, supplier_name, notes")
          .in("transaction_id", chunk)
          .eq("company_id", companyId);
        if (splitsErr) throw splitsErr;
        splitRows.push(...((splitsData ?? []) as SplitRow[]));
      }
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

    const groups: CategoryTransactionGroup[] = rows
      .map((row) => ({
        representative_id: row.id,
        open_tx_id: row.open_tx_id,
        count: 1,
        amount: row.amount,
        date: row.date,
        description: row.description,
        details: row.details,
        reference: row.reference,
        source_bank: row.source_bank,
        notes: row.notes,
        supplier_name: row.supplier_name,
      }))
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
