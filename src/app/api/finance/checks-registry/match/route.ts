import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { logError } from "@/lib/api/logger";

export async function POST(_request: NextRequest) {
  try {
    const supabaseAuth = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
    }

    const { companyId: company_id } = await resolveSelectedCompanyId(supabaseAuth, user.id);
    if (!company_id) {
      return NextResponse.json({ error: "לא נבחרה חברה" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: matched, error: matchErr } = await supabase
      .rpc("match_checks_registry", { p_company_id: company_id });

    if (matchErr) {
      logError("checks-registry/match: rpc", matchErr);
      return NextResponse.json({ error: matchErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, matched: matched ?? 0 });
  } catch (err) {
    logError("checks-registry/match: unhandled", err);
    return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
  }
}

// Allow GET to retrieve registry stats
export async function GET(_request: NextRequest) {
  try {
    const supabaseAuth = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
    }

    const { companyId: company_id } = await resolveSelectedCompanyId(supabaseAuth, user.id);
    if (!company_id) {
      return NextResponse.json({ error: "לא נבחרה חברה" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { count, error } = await supabase
      .from("checks_registry")
      .select("*", { count: "exact", head: true })
      .eq("company_id", company_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch (err) {
    logError("checks-registry/match GET: unhandled", err);
    return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
  }
}
