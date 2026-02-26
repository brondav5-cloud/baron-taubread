import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@/lib/supabase/env";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

const getAdmin = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    }

    const { companyId, role } = await resolveSelectedCompanyId(
      supabase,
      user.id,
    );
    if (!companyId || role !== "super_admin") {
      return NextResponse.json(
        { error: "רק מנהל ראשי יכול לנהל ספקים" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { supplierId, categoryId, mergedIntoId, name } = body;

    if (!supplierId) {
      return NextResponse.json({ error: "חסר מזהה ספק" }, { status: 400 });
    }

    const admin = getAdmin();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (categoryId !== undefined) updates.category_id = categoryId;
    if (mergedIntoId !== undefined) updates.merged_into_id = mergedIntoId;
    if (name !== undefined) updates.name = name;

    const { data, error } = await admin
      .from("suppliers")
      .update(updates)
      .eq("id", supplierId)
      .eq("company_id", companyId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: `שגיאה בעדכון ספק: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, supplier: data });
  } catch (err) {
    console.error("[expenses/suppliers]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "שגיאה בשרת" },
      { status: 500 },
    );
  }
}
