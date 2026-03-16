import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

export const dynamic = "force-dynamic";

const ALLOWED_EVENTS = new Set(["login", "page_view", "heartbeat", "logout"]);

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    let payload: { eventType?: string; route?: string; isActive?: boolean } = {};
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ ok: true, tracked: false });
    }

    const eventType = payload.eventType ?? "";
    if (!ALLOWED_EVENTS.has(eventType)) {
      return NextResponse.json({ ok: true, tracked: false });
    }

    const admin = getSupabaseAdmin();
    const { data: trackedRow } = await admin
      .from("user_activity_tracked_users")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!trackedRow) {
      return NextResponse.json({ ok: true, tracked: false });
    }

    const { companyId } = await resolveSelectedCompanyId(supabase, user.id);

    const { error: insertError } = await admin.from("user_activity_events").insert({
      company_id: companyId,
      user_id: user.id,
      event_type: eventType,
      route: typeof payload.route === "string" ? payload.route : null,
    });

    if (insertError) {
      console.warn("[activity/track] insert failed:", insertError.message);
      return NextResponse.json({ ok: true, tracked: true });
    }

    await admin.rpc("upsert_user_activity_daily_summary", {
      p_company_id: companyId,
      p_user_id: user.id,
      p_event_type: eventType,
      p_route: typeof payload.route === "string" ? payload.route : null,
      p_is_active: payload.isActive === true,
    });

    return NextResponse.json({ ok: true, tracked: true });
  } catch (err) {
    console.warn("[activity/track]", err);
    return NextResponse.json({ ok: true, tracked: false });
  }
}
