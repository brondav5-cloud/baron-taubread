import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { sendPushToUsers } from "@/lib/notifications/sendPush";

export async function POST() {
  try {
    const supabaseAuth = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { companyId } = await resolveSelectedCompanyId(
      supabaseAuth,
      user.id,
    );
    if (!companyId) {
      return NextResponse.json({ error: "לא נבחרה חברה" }, { status: 403 });
    }

    const result = await sendPushToUsers({
      companyId,
      recipientUserIds: [user.id],
      senderUserId: user.id,
      type: "general",
      title: "בדיקת התראות",
      body: "אם אתה רואה את זה — ההתראות עובדות!",
      url: "/dashboard",
      tag: "test",
    });

    return NextResponse.json({
      ok: true,
      ...result,
      userId: user.id,
      hasVapidKeys: !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    });
  } catch (err) {
    console.error("[push/test] error:", err);
    return NextResponse.json({
      error: "שגיאה",
      details: String(err),
    }, { status: 500 });
  }
}
