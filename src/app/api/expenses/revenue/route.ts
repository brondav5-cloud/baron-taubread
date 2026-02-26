import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@/lib/supabase/env";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

const getAdmin = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const body = await request.json();
    const { month, year, category, amount, description } = body;

    if (!month || !year || amount == null) {
      return NextResponse.json(
        { error: "חודש, שנה וסכום הם שדות חובה" },
        { status: 400 },
      );
    }

    const admin = getAdmin();

    const { data, error } = await admin
      .from("revenue_entries")
      .upsert(
        {
          company_id: companyId,
          month,
          year,
          category: category || "sales",
          amount,
          description: description || null,
          created_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id,year,month,category" },
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: `שגיאה בשמירת הכנסה: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, revenue: data });
  } catch (err) {
    console.error("[expenses/revenue]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "שגיאה בשרת" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
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
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
    }

    const admin = getAdmin();
    const { error } = await admin
      .from("revenue_entries")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) {
      return NextResponse.json(
        { error: `שגיאה במחיקה: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[expenses/revenue]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "שגיאה בשרת" },
      { status: 500 },
    );
  }
}
