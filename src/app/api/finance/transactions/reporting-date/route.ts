/**
 * PATCH /api/finance/transactions/reporting-date
 * Bulk update reporting date overrides for selected transactions.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

type Mode = "shift_prev_day" | "clear_override";

export async function PATCH(request: NextRequest) {
  const supabaseAuth = createServerSupabaseClient();
  const { data: { user }, error } = await supabaseAuth.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

  const { companyId } = await resolveSelectedCompanyId(supabaseAuth, user.id);
  if (!companyId) return NextResponse.json({ error: "לא נבחרה חברה" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }

  const { tx_ids, mode } = body as { tx_ids?: string[]; mode?: Mode };
  if (!Array.isArray(tx_ids) || tx_ids.length === 0) {
    return NextResponse.json({ error: "tx_ids חסר" }, { status: 400 });
  }
  if (!mode || !["shift_prev_day", "clear_override"].includes(mode)) {
    return NextResponse.json({ error: "mode לא תקין" }, { status: 400 });
  }

  const uniqueIds = Array.from(new Set(tx_ids.filter((id) => typeof id === "string" && id && !id.includes("::split::"))));
  if (uniqueIds.length === 0) {
    return NextResponse.json({ error: "לא נמצאו תנועות תקינות לעדכון" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: rows, error: loadErr } = await supabase
    .from("bank_transactions")
    .select("id, date, reporting_date")
    .eq("company_id", companyId)
    .in("id", uniqueIds);

  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 });

  const txRows = (rows ?? []) as { id: string; date: string; reporting_date: string | null }[];
  if (txRows.length === 0) {
    return NextResponse.json({ error: "לא נמצאו תנועות לעדכון" }, { status: 404 });
  }

  const updates = txRows.map((row) => {
    if (mode === "clear_override") {
      return { id: row.id, company_id: companyId, reporting_date: null as string | null };
    }
    const baseDate = row.reporting_date ?? row.date;
    const prev = new Date(`${baseDate}T12:00:00Z`);
    prev.setUTCDate(prev.getUTCDate() - 1);
    const nextDate = prev.toISOString().slice(0, 10);
    return { id: row.id, company_id: companyId, reporting_date: nextDate };
  });

  for (const row of updates) {
    const { error: updateErr } = await supabase
      .from("bank_transactions")
      .update({ reporting_date: row.reporting_date })
      .eq("id", row.id)
      .eq("company_id", companyId);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: updates.length });
}
