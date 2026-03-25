/**
 * PATCH /api/finance/transactions/notes
 * Updates the notes field on a single bank transaction.
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
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 }); }
  const { tx_id, notes } = body as { tx_id?: string; notes?: string };
  if (!tx_id) return NextResponse.json({ error: "tx_id חסר" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  await supabase
    .from("bank_transactions")
    .update({ notes: notes ?? null })
    .eq("id", tx_id)
    .eq("company_id", companyId);

  return NextResponse.json({ ok: true });
}
