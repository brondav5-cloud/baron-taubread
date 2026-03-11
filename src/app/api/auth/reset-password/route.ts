/**
 * POST /api/auth/reset-password
 * Body: { email: string }
 *
 * Sends password reset email to the user. They receive a link to set a new password.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/env";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export async function POST(request: NextRequest) {
  try {
    const { email } = (await request.json()) as { email?: string };
    if (!email?.trim()) {
      return NextResponse.json(
        { ok: false, error: "נא להזין אימייל" },
        { status: 400 },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${baseUrl}/login` },
    );

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "נשלח אימייל. בדוק את תיבת הדואר (כולל בספאם).",
    });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json(
      { ok: false, error: "אירעה שגיאה, נסה שוב" },
      { status: 500 },
    );
  }
}
