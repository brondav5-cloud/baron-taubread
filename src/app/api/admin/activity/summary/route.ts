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

  if (rows.length > 0) {
    return NextResponse.json({ ok: true, days, rows, source: "daily_summary" });
  }

  // Fallback: aggregate from raw events if daily summary is empty.
  // This keeps UX useful even before the summary migration starts accumulating data.
  const { data: rawEvents, error: rawError } = await admin
    .from("user_activity_events")
    .select("created_at, user_id, event_type, route")
    .gte("created_at", `${fromDate}T00:00:00.000Z`)
    .order("created_at", { ascending: false })
    .limit(3000);

  if (rawError) {
    return NextResponse.json({ ok: true, days, rows: [], source: "empty" });
  }

  const rawUserIds = Array.from(new Set((rawEvents ?? []).map((e) => e.user_id)));
  const { data: rawUsersRows } = rawUserIds.length
    ? await admin.from("users").select("id, name, email").in("id", rawUserIds)
    : { data: [] as Array<{ id: string; name: string | null; email: string }> };
  const rawUsersMap = new Map((rawUsersRows ?? []).map((u) => [u.id, u]));

  type Agg = {
    date: string;
    userId: string;
    loginCount: number;
    pageViews: number;
    heartbeatCount: number;
    activeMinutes: number;
    lastRoute: string | null;
    lastSeenAt: string | null;
  };

  const agg = new Map<string, Agg>();
  for (const e of rawEvents ?? []) {
    const date = e.created_at.slice(0, 10);
    const key = `${date}:${e.user_id}`;
    const prev = agg.get(key) ?? {
      date,
      userId: e.user_id,
      loginCount: 0,
      pageViews: 0,
      heartbeatCount: 0,
      activeMinutes: 0,
      lastRoute: null,
      lastSeenAt: null,
    };
    if (e.event_type === "login") prev.loginCount += 1;
    if (e.event_type === "page_view") {
      prev.pageViews += 1;
      prev.activeMinutes += 1;
    }
    if (e.event_type === "heartbeat") {
      prev.heartbeatCount += 1;
      prev.activeMinutes += 1;
    }
    if (!prev.lastSeenAt) {
      prev.lastSeenAt = e.created_at;
      prev.lastRoute = e.route ?? null;
    }
    agg.set(key, prev);
  }

  const fallbackRows = Array.from(agg.values())
    .sort((a, b) => {
      if (a.date === b.date) return (b.lastSeenAt ?? "").localeCompare(a.lastSeenAt ?? "");
      return b.date.localeCompare(a.date);
    })
    .map((r) => ({
      ...r,
      name: rawUsersMap.get(r.userId)?.name ?? "משתמש",
      email: rawUsersMap.get(r.userId)?.email ?? "",
    }));

  return NextResponse.json({ ok: true, days, rows: fallbackRows, source: "raw_fallback" });
}
