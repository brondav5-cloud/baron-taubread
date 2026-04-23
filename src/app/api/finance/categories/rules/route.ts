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
import { normalizeSupplierDisplay } from "@/modules/finance/classification/match";

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
  const { category_id, match_field, match_type, match_value, priority, conflict_strategy } = body as Record<string, string | number | undefined>;
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
  if (field === "supplier_name") {
    const normalizedSupplier = normalizeSupplierDisplay(value);
    const { data: existingSupplierRules, error: existingSupplierRulesError } = await supabase
      .from("category_rules")
      .select("id, category_id, match_value")
      .eq("company_id", auth.companyId)
      .eq("match_field", "supplier_name");
    if (existingSupplierRulesError) {
      logError("finance/categories/rules POST check supplier conflicts", existingSupplierRulesError);
      return NextResponse.json({ error: "שגיאה בבדיקת קונפליקט ספק" }, { status: 500 });
    }
    const conflictingRules = (existingSupplierRules ?? []).filter((rule) => {
      if (!rule?.match_value) return false;
      if (rule.category_id === category_id) return false;
      return normalizeSupplierDisplay(rule.match_value) === normalizedSupplier;
    });
    if (conflictingRules.length > 0 && conflict_strategy !== "replace_existing") {
      const conflictingCategoryIds = Array.from(new Set(conflictingRules.map((r) => r.category_id).filter(Boolean)));
      let conflictingCategories: Array<{ id: string; name: string }> = [];
      if (conflictingCategoryIds.length > 0) {
        const { data: cats } = await supabase
          .from("bank_categories")
          .select("id, name")
          .eq("company_id", auth.companyId)
          .in("id", conflictingCategoryIds);
        conflictingCategories = (cats ?? []) as Array<{ id: string; name: string }>;
      }
      return NextResponse.json(
        {
          error: "הספק כבר משויך לקטגוריה אחרת",
          conflict_code: "supplier_rule_conflict",
          supplier_display: value,
          conflicting_categories: conflictingCategories,
        },
        { status: 409 }
      );
    }
    if (conflictingRules.length > 0 && conflict_strategy === "replace_existing") {
      const idsToDelete = conflictingRules.map((r) => r.id).filter(Boolean);
      if (idsToDelete.length > 0) {
        const { error: deleteConflictError } = await supabase
          .from("category_rules")
          .delete()
          .eq("company_id", auth.companyId)
          .in("id", idsToDelete);
        if (deleteConflictError) {
          logError("finance/categories/rules POST delete conflicting supplier rules", deleteConflictError);
          return NextResponse.json({ error: "שגיאה בעדכון כללי ספק קיימים" }, { status: 500 });
        }
      }
    }
  }
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
  const { id, match_field, match_type, match_value, priority, conflict_strategy } = putBody as Record<string, string | number | undefined>;
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
  const { data: existingRule, error: existingRuleError } = await supabase
    .from("category_rules")
    .select("id, category_id, match_field, match_value")
    .eq("id", id)
    .eq("company_id", auth.companyId)
    .maybeSingle();
  if (existingRuleError) {
    logError("finance/categories/rules PUT load existing", existingRuleError);
    return NextResponse.json({ error: "שגיאה באימות כלל" }, { status: 500 });
  }
  if (!existingRule) {
    return NextResponse.json({ error: "כלל לא נמצא" }, { status: 404 });
  }
  const nextField = String(updateFields.match_field ?? existingRule.match_field);
  const nextValue = String(updateFields.match_value ?? existingRule.match_value ?? "");
  if (nextField === "supplier_name" && nextValue.trim()) {
    const normalizedSupplier = normalizeSupplierDisplay(nextValue);
    const { data: existingSupplierRules, error: existingSupplierRulesError } = await supabase
      .from("category_rules")
      .select("id, category_id, match_value")
      .eq("company_id", auth.companyId)
      .eq("match_field", "supplier_name");
    if (existingSupplierRulesError) {
      logError("finance/categories/rules PUT check supplier conflicts", existingSupplierRulesError);
      return NextResponse.json({ error: "שגיאה בבדיקת קונפליקט ספק" }, { status: 500 });
    }
    const conflictingRules = (existingSupplierRules ?? []).filter((rule) => {
      if (!rule?.match_value) return false;
      if (rule.id === id) return false;
      if (rule.category_id === existingRule.category_id) return false;
      return normalizeSupplierDisplay(rule.match_value) === normalizedSupplier;
    });
    if (conflictingRules.length > 0 && conflict_strategy !== "replace_existing") {
      const conflictingCategoryIds = Array.from(new Set(conflictingRules.map((r) => r.category_id).filter(Boolean)));
      let conflictingCategories: Array<{ id: string; name: string }> = [];
      if (conflictingCategoryIds.length > 0) {
        const { data: cats } = await supabase
          .from("bank_categories")
          .select("id, name")
          .eq("company_id", auth.companyId)
          .in("id", conflictingCategoryIds);
        conflictingCategories = (cats ?? []) as Array<{ id: string; name: string }>;
      }
      return NextResponse.json(
        {
          error: "הספק כבר משויך לקטגוריה אחרת",
          conflict_code: "supplier_rule_conflict",
          supplier_display: nextValue,
          conflicting_categories: conflictingCategories,
        },
        { status: 409 }
      );
    }
    if (conflictingRules.length > 0 && conflict_strategy === "replace_existing") {
      const idsToDelete = conflictingRules.map((r) => r.id).filter(Boolean);
      if (idsToDelete.length > 0) {
        const { error: deleteConflictError } = await supabase
          .from("category_rules")
          .delete()
          .eq("company_id", auth.companyId)
          .in("id", idsToDelete);
        if (deleteConflictError) {
          logError("finance/categories/rules PUT delete conflicting supplier rules", deleteConflictError);
          return NextResponse.json({ error: "שגיאה בעדכון כללי ספק קיימים" }, { status: 500 });
        }
      }
    }
  }
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
