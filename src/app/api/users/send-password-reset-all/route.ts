/**
 * POST /api/users/send-password-reset-all
 *
 * Sends password reset email to all users (admin: company users, super_admin: all users).
 * Each user receives an email with a link to set a new password.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST() {
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

    const allowedRoles = ["admin", "super_admin"];
    if (!role || !allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "רק מנהל יכול לשלוח איפוס סיסמה לכולם" },
        { status: 403 },
      );
    }

    const admin = getSupabaseAdmin();

    let emails: string[];

    if (role === "super_admin") {
      const { data: users } = await admin.from("users").select("email").eq("is_active", true);
      emails = Array.from(new Set((users ?? []).map((u) => u.email).filter(Boolean))) as string[];
    } else if (companyId) {
      const { data: members } = await admin
        .from("user_companies")
        .select("user_id")
        .eq("company_id", companyId);
      if (!members?.length) {
        return NextResponse.json({ sent: 0, message: "אין משתמשים בחברה זו" });
      }
      const userIds = members.map((m) => m.user_id);
      const { data: users } = await admin
        .from("users")
        .select("email")
        .in("id", userIds)
        .eq("is_active", true);
      emails = Array.from(new Set((users ?? []).map((u) => u.email).filter(Boolean))) as string[];
    } else {
      return NextResponse.json(
        { error: "יש לבחור חברה" },
        { status: 400 },
      );
    }

    const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    let sent = 0;
    const errors: string[] = [];

    for (const email of emails) {
      const { error } = await supabaseAnon.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://bakery-analytics.vercel.app"}/login`,
      });
      if (error) {
        errors.push(`${email}: ${error.message}`);
      } else {
        sent++;
      }
    }

    return NextResponse.json({
      sent,
      total: emails.length,
      message: `נשלחו ${sent} אימיילים לאיפוס סיסמה`,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("[send-password-reset-all]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "שגיאה לא צפויה" },
      { status: 500 },
    );
  }
}
