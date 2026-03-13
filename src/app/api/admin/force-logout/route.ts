/**
 * POST /api/admin/force-logout
 *
 * Upserts a logout_request row for the admin's company.
 * All users in that company will see a banner prompting them to log out.
 * Body: { message?: string, auto_logout_minutes?: number }
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    }

    const { companyId, role } = await resolveSelectedCompanyId(
      supabaseAuth,
      user.id,
    );

    if (!companyId) {
      return NextResponse.json({ error: "יש לבחור חברה" }, { status: 400 });
    }

    const allowedRoles = ["admin", "super_admin"];
    if (!role || !allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "רק מנהל יכול לנתק משתמשים" },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const message =
      typeof body.message === "string" && body.message.trim()
        ? body.message.trim()
        : "יש לצאת מהמערכת לצורך עדכון. אנא שמור עבודתך והתנתק.";
    const autoLogoutMinutes =
      typeof body.auto_logout_minutes === "number" &&
      body.auto_logout_minutes >= 1 &&
      body.auto_logout_minutes <= 60
        ? body.auto_logout_minutes
        : 5;

    // Get the admin's display name
    const admin = getSupabaseAdmin();
    const { data: adminUser } = await admin
      .from("users")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();

    const { error: upsertError } = await admin
      .from("logout_requests")
      .upsert(
        {
          company_id: companyId,
          message,
          auto_logout_minutes: autoLogoutMinutes,
          requested_at: new Date().toISOString(),
          requested_by_name: adminUser?.name ?? null,
        },
        { onConflict: "company_id" },
      );

    if (upsertError) {
      console.error("[force-logout]", upsertError);
      return NextResponse.json(
        { error: upsertError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[force-logout]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "שגיאה לא צפויה" },
      { status: 500 },
    );
  }
}
