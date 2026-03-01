/**
 * PUT /api/accounting/supplier-names/[id]/reassign
 * Reassign a supplier_name to a different counter_account (H).
 * Body: { counter_account_override: string | null }
 */
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authClient = createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId } = await resolveSelectedCompanyId(authClient, user.id);
    if (!companyId) {
      return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const counter_account_override = body.counter_account_override;
    const value = counter_account_override === null || counter_account_override === undefined
      ? null
      : typeof counter_account_override === "string" ? counter_account_override.trim() || null : null;

    const supabase = getSupabaseAdmin();

    const { data: nameRow, error: fetchErr } = await supabase
      .from("supplier_names")
      .select("id, supplier_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !nameRow) {
      return NextResponse.json({ error: "רשומת שם לא נמצאה" }, { status: 404 });
    }

    const { data: supplier } = await supabase
      .from("suppliers")
      .select("company_id")
      .eq("id", nameRow.supplier_id)
      .maybeSingle();

    if (!supplier || supplier.company_id !== companyId) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { error: updateErr } = await supabase
      .from("supplier_names")
      .update({ counter_account_override: value })
      .eq("id", id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Reassign error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
