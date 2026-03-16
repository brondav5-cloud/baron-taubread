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
      error: NextResponse.json({ error: "רק מנהל יכול לצפות בדוחות ניטור" }, { status: 403 }),
    };
  }

  return { user };
}

export async function GET(request: NextRequest) {
  const guard = await ensureAdmin();
  if ("error" in guard) return guard.error;

  const daysRaw = Number(request.nextUrl.searchParams.get("days") ?? "7");
  const days = Number.isFinite(daysRaw) ? Math.max(1, Math.min(30, Math.floor(daysRaw))) : 7;
  const fromDate = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const admin = getSupabaseAdmin();
  const { data: summaryRows, error: summaryError } = await admin
    .from("user_activity_daily_summary")
    .select(
      "activity_date, user_id, login_count, page_views, heartbeat_count, active_minutes, last_route, last_seen_at",
    )
    .gte("activity_date", fromDate)
    .order("activity_date", { ascending: false });

  if (summaryError) {
    return NextResponse.json({ error: summaryError.message }, { status: 500 });
  }

  const userIds = Array.from(new Set((summaryRows ?? []).map((r) => r.user_id)));
  const { data: usersRows } = userIds.length
    ? await admin.from("users").select("id, name, email").in("id", userIds)
    : { data: [] as Array<{ id: string; name: string | null; email: string }> };

  const usersMap = new Map((usersRows ?? []).map((u) => [u.id, u]));
  const rows = (summaryRows ?? []).map((r) => ({
    date: r.activity_date,
    userId: r.user_id,
    name: usersMap.get(r.user_id)?.name ?? "משתמש",
    email: usersMap.get(r.user_id)?.email ?? "",
    loginCount: r.login_count ?? 0,
    pageViews: r.page_views ?? 0,
    heartbeatCount: r.heartbeat_count ?? 0,
    activeMinutes: r.active_minutes ?? 0,
    lastRoute: r.last_route ?? null,
    lastSeenAt: r.last_seen_at ?? null,
  }));

  return NextResponse.json({ ok: true, days, rows });
}
