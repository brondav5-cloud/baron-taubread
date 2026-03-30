/**
 * POST /api/finance/transactions/merge
 * Merges multiple bank transactions into one logical group.
 *
 * The first transaction in tx_ids becomes the "master":
 *   - Gets the new name (supplier_name) and summed amounts
 *   - balance is cleared (no longer meaningful after merge)
 * All other transactions get merged_into_id = master.id and are hidden in the UI.
 *
 * DELETE /api/finance/transactions/merge
 * Unmerges: clears merged_into_id on all children and resets the master.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

async function getAuthContext() {
  const supabaseAuth = createServerSupabaseClient();
  const { data: { user }, error } = await supabaseAuth.auth.getUser();
  if (error || !user) return null;
  const { companyId } = await resolveSelectedCompanyId(supabaseAuth, user.id);
  return companyId ? { user, companyId } : null;
}

export async function POST(request: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }

  const { tx_ids, new_name } =
    body as { tx_ids?: string[]; new_name?: string };

  if (!Array.isArray(tx_ids) || tx_ids.length < 2) {
    return NextResponse.json({ error: "נדרשות לפחות 2 תנועות למיזוג" }, { status: 400 });
  }
  if (!new_name?.trim()) {
    return NextResponse.json({ error: "שם חדש נדרש" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Fetch all selected transactions and verify ownership
  const { data: txs, error: fetchErr } = await supabase
    .from("bank_transactions")
    .select("id, debit, credit, merged_into_id")
    .in("id", tx_ids)
    .eq("company_id", ctx.companyId);

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!txs || txs.length !== tx_ids.length) {
    return NextResponse.json({ error: "חלק מהתנועות לא נמצאו" }, { status: 404 });
  }

  const rows = txs as { id: string; debit: number; credit: number; merged_into_id: string | null }[];
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const masterId = tx_ids[0]!;
  const childIds = tx_ids.slice(1);

  // Update master: set new name, summed amounts, clear balance
  const { error: masterErr } = await supabase
    .from("bank_transactions")
    .update({
      supplier_name: new_name.trim(),
      debit: totalDebit,
      credit: totalCredit,
      balance: null,
      merged_into_id: null,
      notes: `[מיוזג מ-${tx_ids.length} תנועות]`,
    })
    .eq("id", masterId)
    .eq("company_id", ctx.companyId);

  if (masterErr) return NextResponse.json({ error: masterErr.message }, { status: 500 });

  // Mark children as merged
  const { error: childErr } = await supabase
    .from("bank_transactions")
    .update({ merged_into_id: masterId })
    .in("id", childIds)
    .eq("company_id", ctx.companyId);

  if (childErr) return NextResponse.json({ error: childErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, master_id: masterId, merged_count: tx_ids.length });
}

export async function DELETE(request: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }

  const { master_id } = body as { master_id?: string };
  if (!master_id) return NextResponse.json({ error: "master_id חסר" }, { status: 400 });

  const supabase = getSupabaseAdmin();

  // --- Step 1: fetch children amounts and master amounts to restore original ---
  const [childrenResult, masterResult] = await Promise.all([
    supabase
      .from("bank_transactions")
      .select("debit, credit")
      .eq("merged_into_id", master_id),
    supabase
      .from("bank_transactions")
      .select("debit, credit")
      .eq("id", master_id)
      .limit(1),
  ]);

  if (childrenResult.error) {
    return NextResponse.json({ error: `שליפת ילדים: ${childrenResult.error.message}` }, { status: 500 });
  }
  if (masterResult.error) {
    return NextResponse.json({ error: `שליפת מאסטר: ${masterResult.error.message}` }, { status: 500 });
  }

  const children = childrenResult.data ?? [];
  const masterRow = masterResult.data?.[0];
  const childDebit = children.reduce((s, c) => s + (Number(c.debit) || 0), 0);
  const childCredit = children.reduce((s, c) => s + (Number(c.credit) || 0), 0);
  const restoredDebit = Math.max(0, (Number(masterRow?.debit) || 0) - childDebit);
  const restoredCredit = Math.max(0, (Number(masterRow?.credit) || 0) - childCredit);

  // --- Step 2: release all children (clear merged_into_id) ---
  const { error: childErr } = await supabase
    .from("bank_transactions")
    .update({ merged_into_id: null })
    .eq("merged_into_id", master_id);
  if (childErr) {
    return NextResponse.json({ error: `שחרור ילדים: ${childErr.message}` }, { status: 500 });
  }

  // --- Step 3: restore master to stand-alone transaction ---
  const { error: masterErr } = await supabase
    .from("bank_transactions")
    .update({
      notes: null,
      supplier_name: null,
      debit: restoredDebit,
      credit: restoredCredit,
    })
    .eq("id", master_id);
  if (masterErr) {
    return NextResponse.json({ error: `עדכון מאסטר: ${masterErr.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
