/**
 * GET  /api/finance/categories  — list categories + rules for company
 * POST /api/finance/categories  — create category
 * PUT  /api/finance/categories  — update category
 * DELETE /api/finance/categories?id=X — delete category
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

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const [{ data: categories }, { data: rules }] = await Promise.all([
    supabase
      .from("bank_categories")
      .select("*")
      .eq("company_id", auth.companyId)
      .order("sort_order")
      .order("name"),
    supabase
      .from("category_rules")
      .select("*")
      .eq("company_id", auth.companyId)
      .eq("is_active", true)
      .order("priority", { ascending: false }),
  ]);

  return NextResponse.json({ categories: categories ?? [], rules: rules ?? [] });
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

  const body = await request.json();
  const { name, type, color, icon, sort_order, rule } = body;

  if (!name || !type) {
    return NextResponse.json({ error: "name ו-type הם שדות חובה" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: cat, error } = await supabase
    .from("bank_categories")
    .insert({ company_id: auth.companyId, name, type, color, icon, sort_order: sort_order ?? 0 })
    .select("id")
    .single();

  if (error || !cat) {
    logError("finance/categories POST", error);
    return NextResponse.json({ error: "שגיאה ביצירת קטגוריה" }, { status: 500 });
  }

  // Optionally create a rule at the same time
  if (rule?.match_value) {
    await supabase.from("category_rules").insert({
      company_id: auth.companyId,
      category_id: cat.id,
      match_field: rule.match_field ?? "description",
      match_type: rule.match_type ?? "contains",
      match_value: rule.match_value,
      priority: rule.priority ?? 0,
    });
  }

  return NextResponse.json({ ok: true, id: cat.id });
}

// ── PUT ───────────────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

  const { id, ...fields } = await request.json();
  if (!id) return NextResponse.json({ error: "id חסר" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  await supabase
    .from("bank_categories")
    .update(fields)
    .eq("id", id)
    .eq("company_id", auth.companyId);

  return NextResponse.json({ ok: true });
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id חסר" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  await supabase
    .from("bank_categories")
    .delete()
    .eq("id", id)
    .eq("company_id", auth.companyId);

  return NextResponse.json({ ok: true });
}
