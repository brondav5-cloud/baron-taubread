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

const VALID_FIELDS = new Set(["description", "details", "reference", "operation_code", "supplier_name"]);
const VALID_TYPES = new Set(["contains", "starts_with", "exact", "regex"]);

function normalizeRuleValue(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function validateRuleValue(matchType: string, matchValue: string): string | null {
  if (!matchValue) return "ערך כלל לא יכול להיות ריק";
  if ((matchType === "contains" || matchType === "starts_with") && matchValue.length < 2) {
    return "כלל קצר מדי (לפחות 2 תווים)";
  }
  return null;
}

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

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 }); }
  const { category_id, match_field, match_type, match_value, priority } = body as Record<string, string | number | undefined>;
  const field = String(match_field ?? "description").trim();
  const type = String(match_type ?? "contains").trim();
  const value = normalizeRuleValue(String(match_value ?? ""));

  if (!category_id || !field || !value) {
    return NextResponse.json({ error: "שדות חובה חסרים" }, { status: 400 });
  }
  if (!VALID_FIELDS.has(field)) {
    return NextResponse.json({ error: "match_field לא תקין" }, { status: 400 });
  }
  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "match_type לא תקין" }, { status: 400 });
  }
  const valueError = validateRuleValue(type, value);
  if (valueError) {
    return NextResponse.json({ error: valueError }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("category_rules")
    .insert({
      company_id: auth.companyId,
      category_id,
      match_field: field,
      match_type: type,
      match_value: value,
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

  let putBody: Record<string, unknown>;
  try { putBody = await request.json(); } catch { return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 }); }
  const { id, match_field, match_type, match_value, priority } = putBody as Record<string, string | number | undefined>;
  if (!id) return NextResponse.json({ error: "id חסר" }, { status: 400 });

  const updateFields: Record<string, string | number> = {};
  if (typeof match_field === "string") {
    const field = match_field.trim();
    if (!VALID_FIELDS.has(field)) {
      return NextResponse.json({ error: "match_field לא תקין" }, { status: 400 });
    }
    updateFields.match_field = field;
  }
  if (typeof match_type === "string") {
    const type = match_type.trim();
    if (!VALID_TYPES.has(type)) {
      return NextResponse.json({ error: "match_type לא תקין" }, { status: 400 });
    }
    updateFields.match_type = type;
  }
  if (typeof match_value === "string") {
    const value = normalizeRuleValue(match_value);
    const targetType = String(updateFields.match_type ?? match_type ?? "contains");
    const valueError = validateRuleValue(targetType, value);
    if (valueError) {
      return NextResponse.json({ error: valueError }, { status: 400 });
    }
    updateFields.match_value = value;
  }
  if (typeof priority === "number") {
    updateFields.priority = priority;
  }
  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("category_rules")
    .update(updateFields)
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
