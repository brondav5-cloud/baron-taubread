/**
 * GET  /api/finance/transactions/splits?tx_id=xxx
 *   → returns all splits for the transaction
 *
 * POST /api/finance/transactions/splits
 *   body: { tx_id, splits: [{ description, supplier_name?, category_id?, amount, notes?, sort_order? }] }
 *   → replaces ALL existing splits for this transaction (empty array = delete all / unsplit)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { logError } from "@/lib/api/logger";

export async function GET(request: NextRequest) {
  try {
    const supabaseAuth = createServerSupabaseClient();
    const { data: { user }, error } = await supabaseAuth.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

    const { companyId } = await resolveSelectedCompanyId(supabaseAuth, user.id);
    if (!companyId) return NextResponse.json({ error: "לא נבחרה חברה" }, { status: 400 });

    const tx_id = request.nextUrl.searchParams.get("tx_id");
    if (!tx_id) return NextResponse.json({ error: "tx_id חסר" }, { status: 400 });

    const supabase = getSupabaseAdmin();

    const { data: splits, error: fetchErr } = await supabase
      .from("bank_transaction_splits")
      .select("id, description, supplier_name, category_id, amount, notes, sort_order")
      .eq("transaction_id", tx_id)
      .eq("company_id", companyId)
      .order("sort_order")
      .order("created_at");

    if (fetchErr) {
      logError("splits GET", fetchErr);
      return NextResponse.json({ error: "שגיאה בטעינת פיצולים" }, { status: 500 });
    }

    return NextResponse.json({ splits: splits ?? [] });
  } catch (err) {
    logError("splits GET unhandled", err);
    return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = createServerSupabaseClient();
    const { data: { user }, error } = await supabaseAuth.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

    const { companyId } = await resolveSelectedCompanyId(supabaseAuth, user.id);
    if (!companyId) return NextResponse.json({ error: "לא נבחרה חברה" }, { status: 400 });

    let body: Record<string, unknown>;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 }); }

    const { tx_id, splits } = body as {
      tx_id?: string;
      splits?: {
        description: string;
        supplier_name?: string;
        category_id?: string | null;
        amount: number;
        notes?: string;
        sort_order?: number;
      }[];
    };

    if (!tx_id) return NextResponse.json({ error: "tx_id חסר" }, { status: 400 });
    if (!Array.isArray(splits)) return NextResponse.json({ error: "splits חסר" }, { status: 400 });

    const supabase = getSupabaseAdmin();

    // Delete all existing splits for this transaction (replace-all approach)
    const { error: delErr } = await supabase
      .from("bank_transaction_splits")
      .delete()
      .eq("transaction_id", tx_id)
      .eq("company_id", companyId);

    if (delErr) {
      logError("splits POST delete", delErr);
      return NextResponse.json({ error: "שגיאה במחיקת פיצולים ישנים" }, { status: 500 });
    }

    // Empty array → transaction is "unsplit"
    if (splits.length === 0) {
      return NextResponse.json({ ok: true, count: 0 });
    }

    const rows = splits.map((s, i) => ({
      transaction_id: tx_id,
      company_id: companyId,
      description: s.description ?? "",
      supplier_name: s.supplier_name || null,
      category_id: s.category_id || null,
      amount: Number(s.amount) || 0,
      notes: s.notes || null,
      sort_order: s.sort_order ?? i,
    }));

    const { error: insErr } = await supabase
      .from("bank_transaction_splits")
      .insert(rows);

    if (insErr) {
      logError("splits POST insert", insErr);
      return NextResponse.json({ error: "שגיאה בשמירת פיצולים" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, count: rows.length });
  } catch (err) {
    logError("splits POST unhandled", err);
    return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
  }
}
