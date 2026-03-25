/**
 * POST   /api/finance/categories/rules  — add rule to existing category
 * PUT    /api/finance/categories/rules  — update rule fields
 * DELETE /api/finance/categories/rules?id=X — delete a rule
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { logError } from "@/lib/api/logger";

async function getAuth(_request: NextRequest) {
  const supabaseAuth = createServerSupabaseClient();
  const { data: { user }, error } = await supabaseAuth.auth.getUser();
  if (error || !user) return null;
  const { companyId } = await resolveSelectedCompanyId(supabaseAuth, user.id);
  return companyId ? { user, companyId } : null;
}

export async function POST(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

  const body = await request.json();
  const { category_id, match_field, match_type, match_value, priority } = body;

  if (!category_id || !match_field || !match_value) {
    return NextResponse.json({ error: "שדות חובה חסרים" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("category_rules")
    .insert({
      company_id: auth.companyId,
      category_id,
      match_field: match_field ?? "description",
      match_type: match_type ?? "contains",
      match_value,
      priority: priority ?? 0,
    })
    .select("id")
    .single();

  if (error) {
    logError("finance/categories/rules POST", error);
    return NextResponse.json({ error: "שגיאה ביצירת כלל" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}

export async function PUT(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

  const { id, match_field, match_type, match_value, priority } = await request.json();
  if (!id) return NextResponse.json({ error: "id חסר" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("category_rules")
    .update({ match_field, match_type, match_value, priority })
    .eq("id", id)
    .eq("company_id", auth.companyId);

  if (error) {
    logError("finance/categories/rules PUT", error);
    return NextResponse.json({ error: "שגיאה בעדכון כלל" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id חסר" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  await supabase
    .from("category_rules")
    .delete()
    .eq("id", id)
    .eq("company_id", auth.companyId);

  return NextResponse.json({ ok: true });
}
