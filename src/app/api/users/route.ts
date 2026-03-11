/**
 * API route for adding users - bypasses RLS using service role.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIdentifier } from "@/lib/api/rateLimit";
import { logError } from "@/lib/api/logger";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@/lib/supabase/env";
import type { UserPermissions } from "@/types/supabase";

function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

const USERS_RATE_LIMIT = { max: 5, windowMs: 60_000 };

export async function POST(request: NextRequest) {
  try {
    const id = getClientIdentifier(request);
    const rate = checkRateLimit(
      `users:${id}`,
      USERS_RATE_LIMIT.max,
      USERS_RATE_LIMIT.windowMs,
    );
    if (!rate.ok) {
      return NextResponse.json(
        { error: "יותר מדי בקשת הוספת משתמשים. נסה שוב בעוד דקה." },
        { status: 429 },
      );
    }

    const supabaseAuth = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    }

    const { companyId: selectedCompanyId, role: myRole } =
      await resolveSelectedCompanyId(supabaseAuth, user.id);

    if (!selectedCompanyId) {
      return NextResponse.json(
        { error: "יש לבחור חברה להוספת משתמשים" },
        { status: 403 },
      );
    }

    const allowedRoles = ["admin", "super_admin"];
    if (!myRole || !allowedRoles.includes(myRole)) {
      return NextResponse.json(
        { error: "רק מנהל יכול להוסיף משתמשים" },
        { status: 403 },
      );
    }

    const admin = getSupabaseAdmin();
    const body = await request.json();
    const {
      name,
      email,
      role = "editor",
      position,
      department,
      avatar,
      permissions,
      password,
    } = body;
    if (!name?.trim()) {
      return NextResponse.json({ error: "חובה למלא שם" }, { status: 400 });
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: "חובה למלא אימייל" }, { status: 400 });
    }

    const emailTrimmed = String(email).trim().toLowerCase();
    const newUserRole = body.role || "editor";

    // Check if user already exists (e.g. added in another company)
    const { data: listData } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const existingAuthUser = listData?.users?.find(
      (u) => u.email?.toLowerCase() === emailTrimmed,
    );

    if (existingAuthUser) {
      // User exists – add to this company only (no new auth user)
      const existingUserId = existingAuthUser.id;

      // Ensure user is in public.users (may have been added in another company, or was deactivated)
      const { data: existingUserRow } = await admin
        .from("users")
        .select("id, is_active")
        .eq("id", existingUserId)
        .single();

      if (!existingUserRow) {
        // User in Auth but not in public.users – insert full row
        await admin.from("users").insert({
          id: existingUserId,
          company_id: selectedCompanyId,
          email: existingAuthUser.email ?? emailTrimmed,
          name: String(name).trim() || existingAuthUser.user_metadata?.name,
          role: newUserRole,
          position: body.position || null,
          department: body.department || null,
          avatar: body.avatar || "👤",
          permissions: (body.permissions as UserPermissions) ?? null,
          is_active: true,
        });
      } else if (!existingUserRow.is_active) {
        // User was deactivated – reactivate and update their details
        await admin
          .from("users")
          .update({
            is_active: true,
            name: String(name).trim(),
            role: newUserRole,
            position: body.position || null,
            department: body.department || null,
            avatar: body.avatar || "👤",
            permissions: (body.permissions as UserPermissions) ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingUserId);
      }

      // Add/update membership in user_companies
      const { error: ucErr } = await admin
        .from("user_companies")
        .upsert(
          {
            user_id: existingUserId,
            company_id: selectedCompanyId,
            role: newUserRole,
          },
          { onConflict: "user_id,company_id" },
        );

      if (ucErr) {
        return NextResponse.json(
          { error: ucErr.message || "שגיאה בהוספת משתמש לחברה" },
          { status: 500 },
        );
      }

      const { data: userRow } = await admin
        .from("users")
        .select("*")
        .eq("id", existingUserId)
        .single();
      return NextResponse.json(
        userRow ?? { id: existingUserId, email: emailTrimmed, name: String(name).trim() },
      );
    }

    // New user – create in Auth
    const tempPassword = password?.trim() || `Temp${Date.now()}!`;
    const { data: authUser, error: authErr } =
      await admin.auth.admin.createUser({
        email: emailTrimmed,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name: String(name).trim() },
      });

    if (authErr || !authUser.user) {
      return NextResponse.json(
        { error: authErr?.message || "שגיאה ביצירת משתמש במערכת" },
        { status: 500 },
      );
    }

    const newUserId = authUser.user.id;

    // Insert into public.users
    const { data: inserted, error } = await admin
      .from("users")
      .insert({
        id: newUserId,
        company_id: selectedCompanyId,
        email: emailTrimmed,
        name: String(name).trim(),
        role: role || "editor",
        position: position || null,
        department: department || null,
        avatar: avatar || "👤",
        permissions: (permissions as UserPermissions) ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      await admin.auth.admin.deleteUser(newUserId);
      return NextResponse.json(
        { error: error.message || "שגיאה בהוספת משתמש" },
        { status: 500 },
      );
    }

    // Add membership to user_companies
    await admin.from("user_companies").insert({
      user_id: newUserId,
      company_id: selectedCompanyId,
      role: newUserRole,
    });

    return NextResponse.json(inserted);
  } catch (err) {
    logError("users", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "שגיאה לא צפויה" },
      { status: 500 },
    );
  }
}
