/**
 * GET    /api/finance/accounts         — list accounts
 * PUT    /api/finance/accounts         — update display_name / is_active
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

async function getAuth(_req: NextRequest) {
  const supabaseAuth = createServerSupabaseClient();
  const { data: { user }, error } = await supabaseAuth.auth.getUser();
  if (error || !user) return null;
  const { companyId } = await resolveSelectedCompanyId(supabaseAuth, user.id);
  return companyId ? { companyId } : null;
}

export async function GET(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("bank_accounts")
    .select("id, bank, account_number, display_name, is_active, created_at")
    .eq("company_id", auth.companyId)
    .order("display_name");

  return NextResponse.json({ accounts: data ?? [] });
}

export async function PUT(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 }); }
  const { id, display_name, is_active } = body as { id?: string; display_name?: string; is_active?: boolean };
  if (!id) return NextResponse.json({ error: "id חסר" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const updates: Record<string, unknown> = {};
  if (display_name !== undefined) updates.display_name = display_name;
  if (is_active !== undefined) updates.is_active = is_active;

  const { error: updateErr } = await supabase
    .from("bank_accounts")
    .update(updates)
    .eq("id", id)
    .eq("company_id", auth.companyId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
