/**
 * POST /api/finance/classify
 *
 * Applies category rules to unclassified transactions.
 * Can also set a category manually on a single transaction.
 *
 * Body options:
 *   { mode: "auto" }                     → run all rules on all unclassified tx
 *   { mode: "manual", tx_id, category_id } → set one tx manually
 *   { mode: "clear", tx_id }             → remove category from one tx
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { logError } from "@/lib/api/logger";

type MatchField = "description" | "details" | "reference" | "operation_code";
type MatchType = "contains" | "starts_with" | "exact" | "regex";

interface CategoryRule {
  id: string;
  category_id: string;
  match_field: MatchField;
  match_type: MatchType;
  match_value: string;
  priority: number;
}

interface BankTx {
  id: string;
  description: string;
  details: string;
  reference: string;
  operation_code: string | null;
}

function matchesRule(tx: BankTx, rule: CategoryRule): boolean {
  const haystack = (tx[rule.match_field] ?? "").toLowerCase();
  const needle = rule.match_value.toLowerCase();

  switch (rule.match_type) {
    case "contains":    return haystack.includes(needle);
    case "starts_with": return haystack.startsWith(needle);
    case "exact":       return haystack === needle;
    case "regex": {
      try { return new RegExp(rule.match_value, "i").test(tx[rule.match_field] ?? ""); }
      catch { return false; }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

    const { companyId } = await resolveSelectedCompanyId(supabaseAuth, user.id);
    if (!companyId) return NextResponse.json({ error: "לא נבחרה חברה" }, { status: 400 });

    const body = await request.json();
    const supabase = getSupabaseAdmin();

    // ── Manual set ────────────────────────────────────────────────────────────
    if (body.mode === "manual") {
      const { tx_id, category_id } = body;
      if (!tx_id) return NextResponse.json({ error: "tx_id חסר" }, { status: 400 });

      await supabase
        .from("bank_transactions")
        .update({ category_id: category_id || null, category_override: category_id ? "manual" : null })
        .eq("id", tx_id)
        .eq("company_id", companyId);

      return NextResponse.json({ ok: true });
    }

    // ── Clear ─────────────────────────────────────────────────────────────────
    if (body.mode === "clear") {
      await supabase
        .from("bank_transactions")
        .update({ category_id: null, category_override: null })
        .eq("id", body.tx_id)
        .eq("company_id", companyId);

      return NextResponse.json({ ok: true });
    }

    // ── Auto classify ─────────────────────────────────────────────────────────
    // Fetch all active rules (sorted by priority desc)
    const { data: rules } = await supabase
      .from("category_rules")
      .select("id, category_id, match_field, match_type, match_value, priority")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (!rules || rules.length === 0) {
      return NextResponse.json({ ok: true, classified: 0, message: "אין כללי סיווג" });
    }

    // Fetch unclassified transactions (no manual override)
    const { data: transactions } = await supabase
      .from("bank_transactions")
      .select("id, description, details, reference, operation_code")
      .eq("company_id", companyId)
      .is("category_id", null)
      .order("date", { ascending: false })
      .limit(2000);

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ ok: true, classified: 0, message: "אין תנועות ללא סיווג" });
    }

    // Apply rules
    const updates: { id: string; category_id: string }[] = [];
    for (const tx of transactions as BankTx[]) {
      for (const rule of rules as CategoryRule[]) {
        if (matchesRule(tx, rule)) {
          updates.push({ id: tx.id, category_id: rule.category_id });
          break; // first matching rule wins
        }
      }
    }

    // Batch update in chunks of 100
    let classified = 0;
    for (let i = 0; i < updates.length; i += 100) {
      const chunk = updates.slice(i, i + 100);
      for (const u of chunk) {
        await supabase
          .from("bank_transactions")
          .update({ category_id: u.category_id })
          .eq("id", u.id)
          .eq("company_id", companyId);
        classified++;
      }
    }

    return NextResponse.json({ ok: true, classified, total: transactions.length });
  } catch (err) {
    logError("finance/classify: unhandled", err);
    return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
  }
}
