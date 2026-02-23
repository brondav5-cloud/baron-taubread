import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { sendPushToUsers, type NotificationPayload } from "@/lib/notifications/sendPush";

export async function POST(request: NextRequest) {
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

    const body = (await request.json()) as Omit<NotificationPayload, "companyId" | "senderUserId">;

    if (!body.recipientUserIds?.length || !body.title || !body.body || !body.type) {
      return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
    }

    const result = await sendPushToUsers({
      ...body,
      companyId,
      senderUserId: user.id,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[notifications/send] error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
