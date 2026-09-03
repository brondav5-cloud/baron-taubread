import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { logError } from "@/lib/api/logger";
import { resolveMetricsWindow } from "@/lib/metricsWindow";

export async function POST() {
  const supabaseAuth = createServerSupabaseClient();
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    }

    const { companyId } = await resolveSelectedCompanyId(supabaseAuth, user.id);
    if (!companyId) {
      return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });
    }

    const window = resolveMetricsWindow();
    if (!window.pendingReturnsMonth) {
      return NextResponse.json({
        ok: true,
        settledMonth: window.settledMonth,
        alreadyReady: true,
      });
    }

    const { error } = await supabaseAdmin
      .from("data_metadata")
      .update({
        metrics_manual_ready_month: window.pendingReturnsMonth,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId);

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      settledMonth: window.pendingReturnsMonth,
    });
  } catch (err) {
    logError("metrics-ready", err);
    return NextResponse.json({ error: "שגיאה בעדכון המדדים" }, { status: 500 });
  }
}
