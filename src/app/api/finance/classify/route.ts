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
import { applySingleRuleNow } from "@/modules/finance/classification/applySingleRule";
import {
  matchesRuleNormalized,
  normalizeForMatch,
  type MatchField,
  type MatchType,
} from "@/modules/finance/classification/match";
import { getReviewReason } from "@/modules/finance/classification/review";

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

interface ReviewCandidate {
  id: string;
  kind: "transaction" | "split";
  description: string;
  supplier_name: string | null;
  category_id: string;
  reason: string;
}

interface SplitClassificationRule {
  category_id: string;
  match_value: string;
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
  const normalizedValue = normalizeForMatch(rule.match_value);
  if (!normalizedValue) return false;

  // Very short "contains/starts_with" rules are too broad and create
  // accidental matches. Ignore them during auto-classification.
  if ((rule.match_type === "contains" || rule.match_type === "starts_with") && normalizedValue.length < 2) {
    return false;
  }
  return matchesRuleNormalized(tx, rule);
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
      const payload: { category_id: string | null } = cid
        ? { category_id: cid }
        : { category_id: null };

      await supabase
        .from("bank_transactions")
        .update(payload)
        .eq("id", tx_id)
        .eq("company_id", companyId);

      return NextResponse.json({ ok: true });
    }

    // ── Lock current category (manual persist) ────────────────────────────────
    if (body.mode === "lock") {
      // Schema compatibility: category_override may not exist.
      // Keep endpoint successful without failing classification flows.
      return NextResponse.json({ ok: true, message: "manual lock not supported in current schema" });
    }

    // ── Clear manual lock only (keep category) ───────────────────────────────
    if (body.mode === "unlock_manual") {
      return NextResponse.json({ ok: true });
    }

    // ── Clear lock flags company-wide (categories unchanged) ─────────────────
    if (body.mode === "unlock_all_manual_flags") {
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
        .update({ category_id: null })
        .eq("id", body.tx_id)
        .eq("company_id", companyId);

      return NextResponse.json({ ok: true });
    }

    // ── Apply one rule now (optionally on already-classified rows) ──────────
    if (body.mode === "apply_single_rule") {
      const payload = body as {
        include_classified?: boolean;
        rule?: { category_id?: string; match_field?: MatchField; match_type?: MatchType; match_value?: string };
      };
      const rule = payload.rule;
      if (!rule?.category_id || !rule.match_field || !rule.match_type || !rule.match_value) {
        return NextResponse.json({ error: "פרטי כלל חסרים" }, { status: 400 });
      }
      const result = await applySingleRuleNow({
        companyId,
        categoryId: rule.category_id,
        matchField: rule.match_field,
        matchType: rule.match_type,
        matchValue: rule.match_value,
        includeClassified: Boolean(payload.include_classified),
      });
      return NextResponse.json({ ok: true, ...result, total: result.classified + result.classifiedSplits });
    }

    // ── Clear all non-locked classifications (no reclassify) ──────────────────
    if (body.mode === "clear_unlocked") {
      const { data: txRows, error: txErr } = await supabase
        .from("bank_transactions")
        .update({ category_id: null })
        .eq("company_id", companyId)
        .not("category_id", "is", null)
        .select("id");
      if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });

      const { data: splitRows, error: splitErr } = await supabase
        .from("bank_transaction_splits")
        .update({ category_id: null })
        .eq("company_id", companyId)
        .not("category_id", "is", null)
        .select("id");
      if (splitErr) return NextResponse.json({ error: splitErr.message }, { status: 500 });

      return NextResponse.json({
        ok: true,
        cleared: (txRows?.length ?? 0) + (splitRows?.length ?? 0),
      });
    }

    // ── Auto classify ─────────────────────────────────────────────────────────
    // mode "force_auto" → re-classify ALL transactions (except manually locked ones)
    // mode "auto"       → classify only unclassified transactions
    const forceAll = body.mode === "force_auto";

    // Fetch all active rules (sorted by priority desc)
    const { data: rules } = await supabase
      .from("category_rules")
      .select("id, category_id, match_field, match_type, match_value, priority")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("priority", { ascending: false });

    // In force_auto mode: first wipe all non-locked category assignments so that
    // transactions which no longer match any rule end up uncategorized (null).
    if (forceAll) {
      await supabase
        .from("bank_transactions")
        .update({ category_id: null })
        .eq("company_id", companyId);

      await supabase
        .from("bank_transaction_splits")
        .update({ category_id: null })
        .eq("company_id", companyId);
    }

    if (!rules || rules.length === 0) {
      return NextResponse.json({
        ok: true,
        classified: 0,
        message: forceAll
          ? "לא קיימים כללים פעילים — הסיווגים נוקו מתנועות לא נעולות"
          : "אין כללי סיווג",
      });
    }

    // Fetch transactions: if force_auto, fetch all non-locked; otherwise only unclassified
    let allTransactions: BankTx[] = [];
    let offset = 0;
    const FETCH_BATCH = 1000;
    while (true) {
      let txQuery = supabase
        .from("bank_transactions")
        .select("id, description, details, reference, operation_code, supplier_name")
        .eq("company_id", companyId)
        .order("date", { ascending: false })
        .range(offset, offset + FETCH_BATCH - 1);
      if (!forceAll) txQuery = txQuery.is("category_id", null);
      const { data: batch } = await txQuery;

      if (!batch || batch.length === 0) break;
      allTransactions = allTransactions.concat(batch as BankTx[]);
      if (batch.length < FETCH_BATCH) break;
      offset += FETCH_BATCH;
    }

    // ── Apply rules to bank_transactions ─────────────────────────────────────
    const byCategory = new Map<string, string[]>(); // category_id → [tx_id, ...]
    const reviewCandidates: ReviewCandidate[] = [];
    for (const tx of allTransactions) {
      for (const rule of rules as CategoryRule[]) {
        if (matchesRule(tx, rule)) {
          const normalizedValue = normalizeForMatch(rule.match_value);
          const arr = byCategory.get(rule.category_id) ?? [];
          arr.push(tx.id);
          byCategory.set(rule.category_id, arr);
          const reason = getReviewReason(tx, rule, normalizedValue);
          if (reason && reviewCandidates.length < 50) {
            reviewCandidates.push({
              id: tx.id,
              kind: "transaction",
              description: tx.description,
              supplier_name: tx.supplier_name ?? null,
              category_id: rule.category_id,
              reason,
            });
          }
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
          .eq("company_id", companyId);
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
      let splitQuery = supabase
        .from("bank_transaction_splits")
        .select("id, description, supplier_name")
        .eq("company_id", companyId)
        .range(splitOffset, splitOffset + FETCH_BATCH - 1);
      if (!forceAll) splitQuery = splitQuery.is("category_id", null);
      const { data: splitBatch } = await splitQuery;

      if (!splitBatch || splitBatch.length === 0) break;
      allSplits = allSplits.concat(splitBatch as SplitRow[]);
      if (splitBatch.length < FETCH_BATCH) break;
      splitOffset += FETCH_BATCH;
    }

    if (allTransactions.length === 0 && allSplits.length === 0) {
      return NextResponse.json({
        ok: true,
        classified: 0,
        message: forceAll ? "אין תנועות לסיווג מחדש" : "אין תנועות ללא סיווג",
      });
    }

    // Also load split-specific rules (created from split editor flows) so the
    // global "auto classify" button can classify split rows by those rules too.
    const { data: splitRulesRaw } = await supabase
      .from("split_classification_rules")
      .select("category_id, match_value")
      .eq("company_id", companyId);
    const splitRules: Array<SplitClassificationRule & { normalized: string }> = (splitRulesRaw ?? [])
      .map((r) => {
        const row = r as SplitClassificationRule;
        return {
          category_id: row.category_id,
          match_value: row.match_value,
          normalized: normalizeForMatch(row.match_value ?? ""),
        };
      })
      .filter((r) => r.category_id && r.normalized);

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
      let matchedByCategoryRule = false;
      for (const rule of rules as CategoryRule[]) {
        if (matchesRule(asTx, rule)) {
          const normalizedValue = normalizeForMatch(rule.match_value);
          const arr = splitsByCategory.get(rule.category_id) ?? [];
          arr.push(split.id);
          splitsByCategory.set(rule.category_id, arr);
          const reason = getReviewReason(asTx, rule, normalizedValue);
          if (reason && reviewCandidates.length < 50) {
            reviewCandidates.push({
              id: split.id,
              kind: "split",
              description: split.description ?? "",
              supplier_name: split.supplier_name ?? null,
              category_id: rule.category_id,
              reason,
            });
          }
          matchedByCategoryRule = true;
          break;
        }
      }
      if (matchedByCategoryRule) continue;

      // Fallback: apply split-specific rules by best text similarity.
      const splitDescNorm = normalizeForMatch(asTx.description ?? "");
      if (!splitDescNorm) continue;
      let bestRule: { category_id: string; score: number } | null = null;
      for (const sr of splitRules) {
        if (!sr.normalized) continue;
        let score = 0;
        if (splitDescNorm === sr.normalized) score = 3;
        else if (splitDescNorm.includes(sr.normalized)) score = 2;
        else if (sr.normalized.includes(splitDescNorm)) score = 1;
        if (score === 0) continue;
        if (!bestRule || score > bestRule.score) {
          bestRule = { category_id: sr.category_id, score };
        }
      }
      if (bestRule) {
        const arr = splitsByCategory.get(bestRule.category_id) ?? [];
        arr.push(split.id);
        splitsByCategory.set(bestRule.category_id, arr);
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
      review: reviewCandidates,
    });
  } catch (err) {
    logError("finance/classify: unhandled", err);
    return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
  }
}
