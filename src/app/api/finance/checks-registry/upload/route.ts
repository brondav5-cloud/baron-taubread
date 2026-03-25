import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { logError } from "@/lib/api/logger";

interface CheckRow {
  check_number: string;
  amount: number;
  supplier_name: string;
  check_date: string | null;
  is_cancelled: boolean;
}

interface UploadBody {
  checks: CheckRow[];
  source_file?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
    }

    const { companyId: company_id } = await resolveSelectedCompanyId(supabaseAuth, user.id);
    if (!company_id) {
      return NextResponse.json({ error: "לא נבחרה חברה" }, { status: 400 });
    }

    let body: UploadBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "גוף הבקשה אינו JSON תקין" }, { status: 400 });
    }

    const { checks, source_file } = body;

    if (!Array.isArray(checks) || checks.length === 0) {
      return NextResponse.json({ error: "לא נמצאו שיקים בקובץ" }, { status: 400 });
    }

    if (checks.length > 2000) {
      return NextResponse.json({ error: "יותר מדי שיקים: מקסימום 2000 בקובץ" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // ── Insert checks with dedup (ignore on unique conflict) ──────────────────
    const rows = checks.map((c) => ({
      company_id,
      check_number: String(c.check_number).trim(),
      amount: c.amount,
      supplier_name: c.supplier_name.trim(),
      check_date: c.check_date || null,
      is_cancelled: c.is_cancelled ?? false,
      source_file: source_file || null,
    }));

    const BATCH = 500;
    let inserted = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);

      const { error: batchErr, count } = await supabase
        .from("checks_registry")
        .insert(batch, { count: "exact" })
        .select();

      if (!batchErr) {
        inserted += count ?? batch.length;
        continue;
      }

      // Unique constraint violation — fall back row-by-row
      if (batchErr.code === "23505") {
        for (const row of batch) {
          const { error: rowErr } = await supabase
            .from("checks_registry")
            .insert(row);

          if (!rowErr) {
            inserted++;
          } else if (rowErr.code === "23505") {
            skipped++;
          } else {
            logError("checks-registry/upload: insert row", rowErr);
          }
        }
      } else {
        logError("checks-registry/upload: batch insert", batchErr);
        return NextResponse.json(
          { error: `שגיאה בהכנסת שיקים: ${batchErr.message}` },
          { status: 500 }
        );
      }
    }

    // ── Auto-match against existing bank transactions ─────────────────────────
    let matched = 0;
    const { data: matchData, error: matchErr } = await supabase
      .rpc("match_checks_registry", { p_company_id: company_id });

    if (!matchErr && typeof matchData === "number") {
      matched = matchData;
    } else if (matchErr) {
      logError("checks-registry/upload: match rpc", matchErr);
    }

    return NextResponse.json({ ok: true, inserted, skipped, matched });
  } catch (err) {
    logError("checks-registry/upload: unhandled", err);
    return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
  }
}
