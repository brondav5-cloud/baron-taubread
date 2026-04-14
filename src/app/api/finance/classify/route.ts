/**
 * POST /api/finance/classify
 *
 * Applies category rules to unclassified transactions.
 * Can also set a category manually on a single transaction.
 *
 * Body options:
 *   { mode: "auto" }                     → run all rules on all unclassified tx (skips manual lock)
 *   { mode: "manual", tx_id, category_id } → set category only (does not set category_override; use mode "lock" to lock)
 *   { mode: "clear", tx_id }             → remove category from one tx
 *   { mode: "lock", tx_id }              → keep category_id, set category_override=manual (persist lock)
 *   { mode: "unlock_manual", tx_id }     → clear category_override only (category_id unchanged)
 *   { mode: "unlock_all_manual_flags", confirm: true } → clear category_override for all company txs (one-time cleanup)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { logError } from "@/lib/api/logger";

type MatchField = "description" | "details" | "reference" | "operation_code" | "supplier_name";
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
  supplier_name: string | null;
}

async function transactionHasSplits(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  companyId: string,
  txId: string
): Promise<boolean> {
  const { count } = await supabase
    .from("bank_transaction_splits")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("transaction_id", txId);
  return (count ?? 0) > 0;
}

function matchesRule(tx: BankTx, rule: CategoryRule): boolean {
  // When the rule targets supplier_name but the transaction has none,
  // fall back to checking description and details so similar unedited
  // transactions can still be classified.
  const fieldsToCheck: MatchField[] =
    rule.match_field === "supplier_name" && !tx.supplier_name
      ? ["description", "details"]
      : [rule.match_field];

  const needle = rule.match_value.toLowerCase();

  for (const field of fieldsToCheck) {
    const haystack = (tx[field] ?? "").toLowerCase();
    if (!haystack) continue;
    let matched = false;
    switch (rule.match_type) {
      case "contains":    matched = haystack.includes(needle); break;
      case "starts_with": matched = haystack.startsWith(needle); break;
      case "exact":       matched = haystack === needle; break;
      case "regex": {
        try { matched = new RegExp(rule.match_value, "i").test(tx[field] ?? ""); }
        catch { matched = false; }
        break;
      }
    }
    if (matched) return true;
  }
  return false;
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

    // ── Manual set (category only — lock icon uses category_override via mode "lock") ──
    if (body.mode === "manual") {
      const { tx_id, category_id } = body;
      if (!tx_id) return NextResponse.json({ error: "tx_id חסר" }, { status: 400 });
      if (await transactionHasSplits(supabase, companyId, tx_id)) {
        return NextResponse.json(
          { error: "לתנועה זו יש פיצול פעיל. יש לסווג בתוך מסך הפיצול בלבד." },
          { status: 409 }
        );
      }

      const cid = category_id || null;
      const payload: { category_id: string | null; category_override?: null } = cid
        ? { category_id: cid }
        : { category_id: null, category_override: null };

      await supabase
        .from("bank_transactions")
        .update(payload)
        .eq("id", tx_id)
        .eq("company_id", companyId);

      return NextResponse.json({ ok: true });
    }

    // ── Lock current category (manual persist) ────────────────────────────────
    if (body.mode === "lock") {
      const { tx_id } = body;
      if (!tx_id) return NextResponse.json({ error: "tx_id חסר" }, { status: 400 });
      if (await transactionHasSplits(supabase, companyId, tx_id)) {
        return NextResponse.json(
          { error: "לא ניתן לנעול סיווג ראשי כשיש פיצול פעיל." },
          { status: 409 }
        );
      }

      const { error: lockErr } = await supabase
        .from("bank_transactions")
        .update({ category_override: "manual" })
        .eq("id", tx_id)
        .eq("company_id", companyId)
        .not("category_id", "is", null);

      if (lockErr) return NextResponse.json({ error: lockErr.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    // ── Clear manual lock only (keep category) ───────────────────────────────
    if (body.mode === "unlock_manual") {
      if (!body.tx_id) return NextResponse.json({ error: "tx_id חסר" }, { status: 400 });

      const { error: unErr } = await supabase
        .from("bank_transactions")
        .update({ category_override: null })
        .eq("id", body.tx_id)
        .eq("company_id", companyId);

      if (unErr) return NextResponse.json({ error: unErr.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    // ── Clear lock flags company-wide (categories unchanged) ─────────────────
    if (body.mode === "unlock_all_manual_flags") {
      if (body.confirm !== true) {
        return NextResponse.json({ error: "נדרש confirm: true" }, { status: 400 });
      }
      const { error: bulkErr } = await supabase
        .from("bank_transactions")
        .update({ category_override: null })
        .eq("company_id", companyId)
        .eq("category_override", "manual");

      if (bulkErr) return NextResponse.json({ error: bulkErr.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    // ── Clear ─────────────────────────────────────────────────────────────────
    if (body.mode === "clear") {
      if (!body.tx_id) return NextResponse.json({ error: "tx_id חסר" }, { status: 400 });
      if (await transactionHasSplits(supabase, companyId, body.tx_id)) {
        return NextResponse.json(
          { error: "לא ניתן לנקות סיווג ראשי כשיש פיצול פעיל." },
          { status: 409 }
        );
      }

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

    // Fetch ALL unclassified transactions (paginate in batches of 1000)
    let allTransactions: BankTx[] = [];
    let offset = 0;
    const FETCH_BATCH = 1000;
    while (true) {
      const { data: batch } = await supabase
        .from("bank_transactions")
        .select("id, description, details, reference, operation_code, supplier_name")
        .eq("company_id", companyId)
        .is("category_id", null)
        .is("category_override", null)
        .order("date", { ascending: false })
        .range(offset, offset + FETCH_BATCH - 1);

      if (!batch || batch.length === 0) break;
      allTransactions = allTransactions.concat(batch as BankTx[]);
      if (batch.length < FETCH_BATCH) break;
      offset += FETCH_BATCH;
    }

    if (allTransactions.length === 0) {
      return NextResponse.json({ ok: true, classified: 0, message: "אין תנועות ללא סיווג" });
    }

    // ── Apply rules to bank_transactions ─────────────────────────────────────
    // matchesRule() handles the fallback: supplier_name rules will also check
    // description and details when the transaction has no supplier_name.
    const byCategory = new Map<string, string[]>(); // category_id → [tx_id, ...]
    for (const tx of allTransactions) {
      for (const rule of rules as CategoryRule[]) {
        if (matchesRule(tx, rule)) {
          const arr = byCategory.get(rule.category_id) ?? [];
          arr.push(tx.id);
          byCategory.set(rule.category_id, arr);
          break;
        }
      }
    }

    // Batch UPDATE bank_transactions grouped by category
    let classified = 0;
    for (const catId of Array.from(byCategory.keys())) {
      const ids = byCategory.get(catId) ?? [];
      for (let i = 0; i < ids.length; i += 1000) {
        const chunk = ids.slice(i, i + 1000);
        const { error: upErr } = await supabase
          .from("bank_transactions")
          .update({ category_id: catId })
          .in("id", chunk)
          .eq("company_id", companyId)
          .is("category_override", null);
        if (!upErr) classified += chunk.length;
      }
    }

    // ── Apply rules to bank_transaction_splits (same logic, same rules) ───────
    // Split rows are also suppliers — they should be classified exactly like
    // regular transactions.
    type SplitRow = { id: string; description: string; supplier_name: string | null };
    let allSplits: SplitRow[] = [];
    let splitOffset = 0;
    while (true) {
      const { data: splitBatch } = await supabase
        .from("bank_transaction_splits")
        .select("id, description, supplier_name")
        .eq("company_id", companyId)
        .is("category_id", null)
        .range(splitOffset, splitOffset + FETCH_BATCH - 1);

      if (!splitBatch || splitBatch.length === 0) break;
      allSplits = allSplits.concat(splitBatch as SplitRow[]);
      if (splitBatch.length < FETCH_BATCH) break;
      splitOffset += FETCH_BATCH;
    }

    const splitsByCategory = new Map<string, string[]>();
    for (const split of allSplits) {
      // Build a BankTx-compatible object with the fields matchesRule needs
      const asTx: BankTx = {
        id: split.id,
        description: split.description ?? "",
        details: "",
        reference: "",
        operation_code: null,
        supplier_name: split.supplier_name ?? null,
      };
      for (const rule of rules as CategoryRule[]) {
        if (matchesRule(asTx, rule)) {
          const arr = splitsByCategory.get(rule.category_id) ?? [];
          arr.push(split.id);
          splitsByCategory.set(rule.category_id, arr);
          break;
        }
      }
    }

    let classifiedSplits = 0;
    for (const catId of Array.from(splitsByCategory.keys())) {
      const ids = splitsByCategory.get(catId) ?? [];
      for (let i = 0; i < ids.length; i += 1000) {
        const chunk = ids.slice(i, i + 1000);
        const { error: upErr } = await supabase
          .from("bank_transaction_splits")
          .update({ category_id: catId })
          .in("id", chunk)
          .eq("company_id", companyId);
        if (!upErr) classifiedSplits += chunk.length;
      }
    }

    return NextResponse.json({
      ok: true,
      classified: classified + classifiedSplits,
      total: allTransactions.length + allSplits.length,
    });
  } catch (err) {
    logError("finance/classify: unhandled", err);
    return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
  }
}
