import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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

    const body = await request.json();
    const { subscription } = body as {
      subscription: {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
    };

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: "נתוני subscription חסרים" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          company_id: companyId,
          endpoint: subscription.endpoint,
          keys_p256dh: subscription.keys.p256dh,
          keys_auth: subscription.keys.auth,
          user_agent: request.headers.get("user-agent") ?? "",
        },
        { onConflict: "user_id,endpoint" },
      );

    if (error) {
      console.error("[push/subscribe] DB error:", error);
      return NextResponse.json({ error: "שגיאה בשמירת ההרשמה" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/subscribe] error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabaseAuth = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint } = body as { endpoint: string };

    if (!endpoint) {
      return NextResponse.json({ error: "endpoint חסר" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    await admin
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", endpoint);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/unsubscribe] error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
