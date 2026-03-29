/**
 * PATCH /api/finance/splits/bulk-classify
 * body: { rules: [{ description: string, category_id: string }] }
 *
 * For each rule, updates every bank_transaction_split that has the same
 * description AND no category yet (category_id IS NULL).
 * Returns { updated: number } — total rows changed across all rules.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { logError } from "@/lib/api/logger";

export async function PATCH(request: NextRequest) {
  try {
    const supabaseAuth = createServerSupabaseClient();
    const { data: { user }, error } = await supabaseAuth.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

    const { companyId } = await resolveSelectedCompanyId(supabaseAuth, user.id);
    if (!companyId) return NextResponse.json({ error: "לא נבחרה חברה" }, { status: 400 });

    let body: Record<string, unknown>;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 }); }

    const { rules } = body as {
      rules?: { description: string; category_id: string }[];
    };
    if (!Array.isArray(rules) || rules.length === 0) {
      return NextResponse.json({ error: "rules חסר" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    let totalUpdated = 0;

    for (const rule of rules) {
      if (!rule.description?.trim() || !rule.category_id) continue;

      const { data, error: updErr } = await supabase
        .from("bank_transaction_splits")
        .update({ category_id: rule.category_id })
        .eq("company_id", companyId)
        .eq("description", rule.description.trim())
        .is("category_id", null)
        .select("id");

      if (updErr) {
        logError("bulk-classify PATCH rule", updErr);
        continue;
      }
      totalUpdated += data?.length ?? 0;
    }

    return NextResponse.json({ updated: totalUpdated });
  } catch (err) {
    logError("bulk-classify PATCH unhandled", err);
    return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
  }
}
