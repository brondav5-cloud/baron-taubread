import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function ensureAdmin() {
  const supabaseAuth = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 }) };
  }

  const { role } = await resolveSelectedCompanyId(supabaseAuth, user.id);
  if (!role || !["admin", "super_admin"].includes(role)) {
    return {
      error: NextResponse.json({ error: "רק מנהל יכול לנהל ניטור משתמשים" }, { status: 403 }),
    };
  }

  return { user };
}

export async function GET() {
  const guard = await ensureAdmin();
  if ("error" in guard) return guard.error;

  const admin = getSupabaseAdmin();
  const { data: trackedRows, error: trackedError } = await admin
    .from("user_activity_tracked_users")
    .select("user_id, created_at")
    .eq("is_active", true);

  if (trackedError) {
    return NextResponse.json({ error: trackedError.message }, { status: 500 });
  }

  const userIds = (trackedRows ?? []).map((r) => r.user_id);
  if (userIds.length === 0) {
    return NextResponse.json({ ok: true, users: [] });
  }

  const [{ data: usersRows }, { data: eventsRows }] = await Promise.all([
    admin.from("users").select("id, name, email").in("id", userIds),
    admin
      .from("user_activity_events")
      .select("user_id, route, created_at")
      .in("user_id", userIds)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false }),
  ]);

  const usersMap = new Map((usersRows ?? []).map((u) => [u.id, u]));
  const summary = new Map<
    string,
    { events24h: number; lastSeenAt: string | null; lastRoute: string | null }
  >();

  for (const e of eventsRows ?? []) {
    const prev = summary.get(e.user_id) ?? {
      events24h: 0,
      lastSeenAt: null,
      lastRoute: null,
    };
    prev.events24h += 1;
    if (!prev.lastSeenAt) {
      prev.lastSeenAt = e.created_at;
      prev.lastRoute = e.route ?? null;
    }
    summary.set(e.user_id, prev);
  }

  const users = userIds.map((userId) => {
    const user = usersMap.get(userId);
    const s = summary.get(userId);
    return {
      userId,
      name: user?.name ?? "משתמש",
      email: user?.email ?? "",
      events24h: s?.events24h ?? 0,
      lastSeenAt: s?.lastSeenAt ?? null,
      lastRoute: s?.lastRoute ?? null,
    };
  });

  return NextResponse.json({ ok: true, users });
}

export async function POST(request: NextRequest) {
  const guard = await ensureAdmin();
  if ("error" in guard) return guard.error;

  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "יש להזין אימייל" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: userRow } = await admin
    .from("users")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();

  if (!userRow?.id) {
    return NextResponse.json({ error: "לא נמצא משתמש עם האימייל הזה" }, { status: 404 });
  }

  const { error: upsertError } = await admin
    .from("user_activity_tracked_users")
    .upsert(
      {
        user_id: userRow.id,
        is_active: true,
        added_by: guard.user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const guard = await ensureAdmin();
  if ("error" in guard) return guard.error;

  const body = await request.json().catch(() => ({}));
  const userId = String(body.userId ?? "").trim();
  if (!userId) {
    return NextResponse.json({ error: "חסר userId" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error: updateError } = await admin
    .from("user_activity_tracked_users")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
