import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

export async function POST(request: NextRequest) {
  const supabaseAuth = createServerSupabaseClient();
  const { data: { user }, error } = await supabaseAuth.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

  const { companyId } = await resolveSelectedCompanyId(supabaseAuth, user.id);
  if (!companyId) return NextResponse.json({ error: "לא נבחרה חברה" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }

  const { tx_id } = body as { tx_id?: string };
  if (!tx_id) return NextResponse.json({ error: "tx_id חסר" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: restoredRows, error: restoreErr } = await supabase
    .from("bank_transactions")
    .update({ deleted_at: null })
    .eq("id", tx_id)
    .eq("company_id", companyId)
    .not("deleted_at", "is", null)
    .select("id");

  if (restoreErr) return NextResponse.json({ error: restoreErr.message }, { status: 500 });
  if (!restoredRows || restoredRows.length === 0) {
    return NextResponse.json({ error: "התנועה לא נמצאה לשחזור" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
