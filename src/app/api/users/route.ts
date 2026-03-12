/**
 * API route for adding users - bypasses RLS using service role.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIdentifier } from "@/lib/api/rateLimit";
import { logError } from "@/lib/api/logger";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { UserPermissions } from "@/types/supabase";

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

    const isSuperAdmin = myRole === "super_admin";
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
      extraCompanyIds = [],
    } = body;

    // Validate extra company IDs — admin must be a member of each
    const { data: adminMemberships } = await admin
      .from("user_companies")
      .select("company_id")
      .eq("user_id", user.id);
    const adminCompanyIds = new Set((adminMemberships ?? []).map((m: { company_id: string }) => m.company_id));
    // super_admin can add to any company they can see; for regular admins, filter to their companies
    const validatedExtraIds: string[] = isSuperAdmin
      ? (extraCompanyIds as string[])
      : (extraCompanyIds as string[]).filter((id: string) => adminCompanyIds.has(id));
    if (!name?.trim()) {
      return NextResponse.json({ error: "חובה למלא שם" }, { status: 400 });
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: "חובה למלא אימייל" }, { status: 400 });
    }

    const emailTrimmed = String(email).trim().toLowerCase();
    const newUserRole = body.role || "editor";

    // Check if user already exists (e.g. added in another company)
    // Query public.users by email — faster than listUsers and avoids the 1000-user pagination limit
    const { data: existingPublicUser } = await admin
      .from("users")
      .select("id, email, is_active")
      .eq("email", emailTrimmed)
      .maybeSingle();

    let existingAuthUser: { id: string; email?: string; user_metadata?: { name?: string } } | null =
      null;
    if (existingPublicUser) {
      const { data: authData } = await admin.auth.admin.getUserById(existingPublicUser.id);
      existingAuthUser = authData?.user ?? null;
    }

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

      // Add to extra companies (ignore errors — best effort)
      for (const extraId of validatedExtraIds.filter((id) => id !== selectedCompanyId)) {
        await admin.from("user_companies").upsert(
          { user_id: existingUserId, company_id: extraId, role: newUserRole },
          { onConflict: "user_id,company_id" },
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
      // Edge case: user exists in Auth but their public.users row was missing (data inconsistency).
      // In this case createUser returns "already registered" — surface a clear error.
      const alreadyExists =
        authErr?.message?.toLowerCase().includes("already") ||
        authErr?.status === 422;
      if (alreadyExists) {
        return NextResponse.json(
          {
            error:
              "כתובת האימייל כבר רשומה במערכת האימות אך לא נמצאה ברשימת המשתמשים. פנה לתמיכה.",
          },
          { status: 409 },
        );
      }
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
    const { error: ucInsertErr } = await admin.from("user_companies").insert({
      user_id: newUserId,
      company_id: selectedCompanyId,
      role: newUserRole,
    });

    if (ucInsertErr) {
      // Rollback: delete auth user and public.users row to avoid orphaned state
      await admin.auth.admin.deleteUser(newUserId);
      await admin.from("users").delete().eq("id", newUserId);
      return NextResponse.json(
        { error: ucInsertErr.message || "שגיאה בהוספת משתמש לחברה" },
        { status: 500 },
      );
    }

    // Add to extra companies (best effort)
    for (const extraId of validatedExtraIds.filter((id) => id !== selectedCompanyId)) {
      await admin.from("user_companies").upsert(
        { user_id: newUserId, company_id: extraId, role: newUserRole },
        { onConflict: "user_id,company_id" },
      );
    }

    return NextResponse.json(inserted);
  } catch (err) {
    logError("users", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "שגיאה לא צפויה" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/users — update an existing user (bypasses RLS using service role).
 * Body: { userId, updates: { name?, phone?, role?, position?, department?, avatar?, permissions? } }
 */
export async function PATCH(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });
    }

    const allowedRoles = ["admin", "super_admin"];
    if (!myRole || !allowedRoles.includes(myRole)) {
      return NextResponse.json(
        { error: "רק מנהל יכול לעדכן משתמשים" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { userId, updates } = body as {
      userId: string;
      updates: Record<string, unknown>;
    };

    if (!userId) {
      return NextResponse.json({ error: "חסר userId" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Verify the target user belongs to the same company
    const { data: membership } = await admin
      .from("user_companies")
      .select("user_id")
      .eq("user_id", userId)
      .eq("company_id", selectedCompanyId)
      .maybeSingle();

    if (!membership && myRole !== "super_admin") {
      return NextResponse.json(
        { error: "המשתמש לא שייך לחברה זו" },
        { status: 403 },
      );
    }

    // Handle role update in user_companies separately
    if (updates.role !== undefined) {
      await admin
        .from("user_companies")
        .update({ role: updates.role })
        .eq("user_id", userId)
        .eq("company_id", selectedCompanyId);
    }

    // Build safe update object for public.users
    const allowedFields = [
      "name", "phone", "role", "position", "department", "avatar", "permissions",
    ];
    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        dbUpdates[field] = updates[field];
      }
    }

    const { error: updateErr } = await admin
      .from("users")
      .update(dbUpdates)
      .eq("id", userId);

    if (updateErr) {
      return NextResponse.json(
        { error: updateErr.message || "שגיאה בעדכון משתמש" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("users-patch", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "שגיאה לא צפויה" },
      { status: 500 },
    );
  }
}
