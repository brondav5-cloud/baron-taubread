/**
 * GET  /api/finance/splits/rules?d=name1&d=name2&d=...
 *   → For each description, finds the best matching rule.
 *   → Falls back to scanning recent bank_transaction_splits if no explicit rule exists.
 *   Returns: { matches: { [description]: { category_id, category_name } } }
 *
 * POST /api/finance/splits/rules
 *   body: { rules: [{ match_value: string, category_id: string }] }
 *   → Upserts classification rules (one per match_value per company).
 *   → Called after the user saves a split and confirms "save for future".
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { logError } from "@/lib/api/logger";

type RuleMatch = {
  category_id: string;
  category_name: string;
  confidence: number;
  source: "rule_exact" | "rule_partial" | "history_exact" | "history_partial";
};

// ── Auth helper ───────────────────────────────────────────────────────────────

async function auth(request: NextRequest): Promise<{ companyId: string } | null> {
  void request;
  const supabaseAuth = createServerSupabaseClient();
  const { data: { user }, error } = await supabaseAuth.auth.getUser();
  if (error || !user) return null;
  const { companyId } = await resolveSelectedCompanyId(supabaseAuth, user.id);
  return companyId ? { companyId } : null;
}

function normalizeText(v: string): string {
  return v
    .toLowerCase()
    .replace(/["'`׳״]/g, "")
    .replace(/[^a-z0-9א-ת\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getRuleConfidence(descNorm: string, ruleNorm: string): number {
  if (!descNorm || !ruleNorm) return 0;
  if (descNorm === ruleNorm) return 1;

  const longer = Math.max(descNorm.length, ruleNorm.length);
  const shorter = Math.min(descNorm.length, ruleNorm.length);
  const ratio = shorter / longer;

  if ((descNorm.startsWith(ruleNorm) || ruleNorm.startsWith(descNorm)) && ratio >= 0.85) {
    return 0.92;
  }
  if ((descNorm.includes(ruleNorm) || ruleNorm.includes(descNorm)) && ratio >= 0.75) {
    return 0.8;
  }
  return 0;
}

// ── GET — find category matches for a list of descriptions ────────────────────
// If no ?d= params → returns ALL rules for the company: { rules: [...] }

export async function GET(request: NextRequest) {
  try {
    const a = await auth(request);
    if (!a) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

    // Collect ?d=name1&d=name2 params
    const descriptions = request.nextUrl.searchParams.getAll("d").filter(Boolean);

    // No descriptions → return full list of split rules for this company
    if (descriptions.length === 0) {
      const supabase = getSupabaseAdmin();
      const { data: allRules } = await supabase
        .from("split_classification_rules")
        .select("id, match_value, category_id, updated_at")
        .eq("company_id", a.companyId)
        .order("match_value");
      return NextResponse.json({ rules: allRules ?? [] });
    }

    const supabase = getSupabaseAdmin();

    // 1. Fetch all rules for this company once
    const { data: rules } = await supabase
      .from("split_classification_rules")
      .select("match_value, category_id")
      .eq("company_id", a.companyId);

    // 2. Fetch all categories to resolve names
    const { data: cats } = await supabase
      .from("bank_categories")
      .select("id, name")
      .eq("company_id", a.companyId);

    const catMap = new Map<string, string>(
      (cats ?? []).map((c: { id: string; name: string }) => [c.id, c.name])
    );

    // 3. For each description: find best matching rule
    //    Rule matches if description contains rule's match_value (case-insensitive).
    //    When multiple rules match, prefer the longest match_value (most specific).
    const ruleList = (rules ?? []) as { match_value: string; category_id: string }[];

    const matches: Record<string, RuleMatch> = {};

    for (const desc of descriptions) {
      const normDesc = normalizeText(desc);
      let best:
        | { match_value: string; category_id: string; confidence: number; source: RuleMatch["source"] }
        | null = null;

      for (const rule of ruleList) {
        if (!rule.category_id) continue;
        const normRule = normalizeText(rule.match_value);
        const confidence = getRuleConfidence(normDesc, normRule);
        if (confidence > 0 && (!best || confidence > best.confidence)) {
          best = {
            match_value: rule.match_value,
            category_id: rule.category_id,
            confidence,
            source: confidence >= 1 ? "rule_exact" : "rule_partial",
          };
        }
      }

      if (best) {
        matches[desc] = {
          category_id: best.category_id,
          category_name: catMap.get(best.category_id) ?? "",
          confidence: best.confidence,
          source: best.source,
        };
      }
    }

    // 4. For unmatched descriptions: scan recent splits (last 6 months) as fallback
    const unmatched = descriptions.filter((d) => !matches[d]);
    if (unmatched.length > 0) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: recentSplits } = await supabase
        .from("bank_transaction_splits")
        .select("description, category_id")
        .eq("company_id", a.companyId)
        .not("category_id", "is", null)
        .gte("created_at", sixMonthsAgo.toISOString());

      if (recentSplits && recentSplits.length > 0) {
        // Build a frequency map: (description, category_id) → count
        const freq = new Map<string, Map<string, number>>();
        for (const s of recentSplits as { description: string; category_id: string }[]) {
          if (!s.category_id || !s.description) continue;
          const descLower = normalizeText(s.description);
          if (!freq.has(descLower)) freq.set(descLower, new Map());
          const cm = freq.get(descLower)!;
          cm.set(s.category_id, (cm.get(s.category_id) ?? 0) + 1);
        }

        for (const desc of unmatched) {
          const lower = normalizeText(desc);
          // Try exact match first, then partial
          let catId: string | null = null;
          let topCount = 0;
          let source: RuleMatch["source"] = "history_partial";
          let confidence = 0.72;

          // Exact
          const exact = freq.get(lower);
          if (exact) {
            exact.forEach((cnt, cid) => {
              if (cnt > topCount) {
                topCount = cnt;
                catId = cid;
                source = "history_exact";
                confidence = 0.9;
              }
            });
          }

          // Partial: find any past description that shares significant overlap
          if (!catId) {
            freq.forEach((catCounts, pastDesc) => {
              if (lower.includes(pastDesc) || pastDesc.includes(lower)) {
                catCounts.forEach((cnt, cid) => {
                  if (cnt > topCount) {
                    topCount = cnt;
                    catId = cid;
                    source = "history_partial";
                    confidence = 0.72;
                  }
                });
              }
            });
          }

          if (catId) {
            matches[desc] = {
              category_id: catId,
              category_name: catMap.get(catId) ?? "",
              confidence,
              source,
            };
          }
        }
      }
    }

    return NextResponse.json({ matches });
  } catch (err) {
    logError("splits/rules GET", err);
    return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
  }
}

// ── POST — upsert classification rules ────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const a = await auth(request);
    if (!a) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

    let body: Record<string, unknown>;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 }); }

    const { rules } = body as {
      rules?: { match_value: string; category_id: string }[];
    };

    if (!Array.isArray(rules) || rules.length === 0) {
      return NextResponse.json({ error: "rules חסר" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    const rows = rules
      .filter((r) => r.match_value?.trim() && r.category_id)
      .map((r) => ({
        company_id: a.companyId,
        match_value: r.match_value.trim(),
        category_id: r.category_id,
        updated_at: now,
      }));

    if (rows.length === 0) return NextResponse.json({ ok: true, count: 0 });

    const { error: upsertErr } = await supabase
      .from("split_classification_rules")
      .upsert(rows, { onConflict: "company_id,match_value" });

    if (upsertErr) {
      logError("splits/rules POST upsert", upsertErr);
      return NextResponse.json({ error: "שגיאה בשמירת כללים" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, count: rows.length });
  } catch (err) {
    logError("splits/rules POST", err);
    return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
  }
}

// ── DELETE — remove a split rule by id ───────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const a = await auth(request);
    if (!a) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id חסר" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { error: delErr } = await supabase
      .from("split_classification_rules")
      .delete()
      .eq("id", id)
      .eq("company_id", a.companyId);

    if (delErr) {
      logError("splits/rules DELETE", delErr);
      return NextResponse.json({ error: "שגיאה במחיקה" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("splits/rules DELETE unhandled", err);
    return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
  }
}
