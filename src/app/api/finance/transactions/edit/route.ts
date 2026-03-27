/**
 * PATCH /api/finance/transactions/edit
 * Updates user-editable fields on a bank transaction:
 * supplier_name (display name override), description, debit, credit
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

export async function PATCH(request: NextRequest) {
  const supabaseAuth = createServerSupabaseClient();
  const { data: { user }, error } = await supabaseAuth.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

  const { companyId } = await resolveSelectedCompanyId(supabaseAuth, user.id);
  if (!companyId) return NextResponse.json({ error: "לא נבחרה חברה" }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }

  const { tx_id, supplier_name, description, debit, credit } =
    body as { tx_id?: string; supplier_name?: string; description?: string; debit?: number; credit?: number };

  if (!tx_id) return NextResponse.json({ error: "tx_id חסר" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (supplier_name !== undefined) updates.supplier_name = supplier_name || null;
  if (description !== undefined) updates.description = description;
  if (debit !== undefined && debit >= 0) updates.debit = debit;
  if (credit !== undefined && credit >= 0) updates.credit = credit;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error: updateErr } = await supabase
    .from("bank_transactions")
    .update(updates)
    .eq("id", tx_id)
    .eq("company_id", companyId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
