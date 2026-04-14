/**
 * POST /api/finance/transactions/backfill-suppliers
 * For every bank_transaction where supplier_name IS NULL, attempts to extract
 * a supplier name from the details field using known patterns:
 *   "העברה אל: NAME ACCOUNT..."  →  supplier_name = "NAME"
 *   "העברה מ: NAME ACCOUNT..."   →  supplier_name = "NAME"
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { logError } from "@/lib/api/logger";

function extractSupplierFromDetails(details: string): string | null {
  if (!details) return null;
  const m = details.match(/^העברה\s+(?:אל|מ)[:\s]+(.+)/);
  if (!m) return null;
  const words = m[1]!.trim().split(/\s+/);
  const nameWords: string[] = [];
  for (const word of words) {
    if (/^\d/.test(word)) break;
    nameWords.push(word);
  }
  return nameWords.length > 0 ? nameWords.join(" ") : null;
}

export async function POST(_request: NextRequest) {
  try {
    const supabaseAuth = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

    const { companyId } = await resolveSelectedCompanyId(supabaseAuth, user.id);
    if (!companyId) return NextResponse.json({ error: "לא נבחרה חברה" }, { status: 400 });

    const supabase = getSupabaseAdmin();

    // Fetch all transactions without a supplier_name that have a details field
    const BATCH = 1000;
    let offset = 0;
    let updated = 0;

    while (true) {
      const { data: rows, error: fetchErr } = await supabase
        .from("bank_transactions")
        .select("id, details")
        .eq("company_id", companyId)
        .is("supplier_name", null)
        .neq("details", "")
        .not("details", "is", null)
        .range(offset, offset + BATCH - 1);

      if (fetchErr) {
        logError("backfill-suppliers: fetch", fetchErr);
        return NextResponse.json({ error: fetchErr.message }, { status: 500 });
      }
      if (!rows || rows.length === 0) break;

      // Group updates by extracted supplier name to reduce number of queries
      const bySupplier = new Map<string, string[]>();
      for (const row of rows as { id: string; details: string }[]) {
        const name = extractSupplierFromDetails(row.details);
        if (!name) continue;
        const ids = bySupplier.get(name) ?? [];
        ids.push(row.id);
        bySupplier.set(name, ids);
      }

      for (const [name, ids] of Array.from(bySupplier.entries())) {
        const { error: upErr } = await supabase
          .from("bank_transactions")
          .update({ supplier_name: name })
          .in("id", ids)
          .eq("company_id", companyId);
        if (!upErr) updated += ids.length;
      }

      if (rows.length < BATCH) break;
      offset += BATCH;
    }

    return NextResponse.json({ ok: true, updated });
  } catch (err) {
    logError("backfill-suppliers: unhandled", err);
    return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
  }
}
