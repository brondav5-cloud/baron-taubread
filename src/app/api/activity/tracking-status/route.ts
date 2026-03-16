import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ ok: true, tracked: false });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("user_activity_tracked_users")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.warn("[activity/tracking-status]", error.message);
      return NextResponse.json({ ok: true, tracked: false });
    }

    return NextResponse.json({ ok: true, tracked: !!data });
  } catch (err) {
    console.warn("[activity/tracking-status]", err);
    return NextResponse.json({ ok: true, tracked: false });
  }
}
