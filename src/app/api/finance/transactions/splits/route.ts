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

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeText(value: string): string {
  return cleanText(value).toLowerCase();
}

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
      description: cleanText(s.description ?? ""),
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

    // Atomic follow-up: create/update split rules and retroactively classify similar
    // uncategorized split rows. This keeps behavior deterministic and reliable.
    const classifiedRows = rows.filter((r) => r.category_id && r.description);

    const ruleByNormalizedDescription = new Map<string, { match_value: string; category_id: string }>();
    const conflictingKeys = new Set<string>();
    const conflictingDescriptions = new Set<string>();

    for (const row of classifiedRows) {
      const normalized = normalizeText(row.description);
      if (!normalized || !row.category_id) continue;
      if (conflictingKeys.has(normalized)) continue;

      const existing = ruleByNormalizedDescription.get(normalized);
      if (!existing) {
        ruleByNormalizedDescription.set(normalized, {
          match_value: cleanText(row.description),
          category_id: row.category_id,
        });
        continue;
      }

      if (existing.category_id !== row.category_id) {
        conflictingKeys.add(normalized);
        conflictingDescriptions.add(cleanText(row.description));
        ruleByNormalizedDescription.delete(normalized);
      }
    }

    const rulesToUpsert = Array.from(ruleByNormalizedDescription.values()).map((r) => ({
      company_id: companyId,
      match_value: r.match_value,
      category_id: r.category_id,
      updated_at: new Date().toISOString(),
    }));

    let savedRules = 0;
    if (rulesToUpsert.length > 0) {
      const { error: rulesErr } = await supabase
        .from("split_classification_rules")
        .upsert(rulesToUpsert, { onConflict: "company_id,match_value" });
      if (rulesErr) {
        logError("splits POST upsert rules", rulesErr);
      } else {
        savedRules = rulesToUpsert.length;
      }
    }

    let retroUpdated = 0;
    if (ruleByNormalizedDescription.size > 0) {
      const { data: uncategorized, error: uncategorizedErr } = await supabase
        .from("bank_transaction_splits")
        .select("id, description")
        .eq("company_id", companyId)
        .is("category_id", null);

      if (uncategorizedErr) {
        logError("splits POST retro load uncategorized", uncategorizedErr);
      } else if (uncategorized && uncategorized.length > 0) {
        const idsByCategory = new Map<string, string[]>();
        for (const row of uncategorized as { id: string; description: string }[]) {
          const normalized = normalizeText(row.description ?? "");
          const matchedRule = ruleByNormalizedDescription.get(normalized);
          if (!matchedRule) continue;
          const bucket = idsByCategory.get(matchedRule.category_id) ?? [];
          bucket.push(row.id);
          idsByCategory.set(matchedRule.category_id, bucket);
        }

        for (const [categoryId, ids] of Array.from(idsByCategory.entries())) {
          const chunkSize = 200;
          for (let i = 0; i < ids.length; i += chunkSize) {
            const chunk = ids.slice(i, i + chunkSize);
            const { data, error: retroErr } = await supabase
              .from("bank_transaction_splits")
              .update({ category_id: categoryId })
              .in("id", chunk)
              .select("id");
            if (retroErr) {
              logError("splits POST retro update", retroErr);
              continue;
            }
            retroUpdated += data?.length ?? 0;
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      count: rows.length,
      saved_rules: savedRules,
      retro_updated: retroUpdated,
      conflicts: Array.from(conflictingDescriptions),
    });
  } catch (err) {
    logError("splits POST unhandled", err);
    return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabaseAuth = createServerSupabaseClient();
    const { data: { user }, error } = await supabaseAuth.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

    const { companyId } = await resolveSelectedCompanyId(supabaseAuth, user.id);
    if (!companyId) return NextResponse.json({ error: "לא נבחרה חברה" }, { status: 400 });

    let body: Record<string, unknown>;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 }); }

    const { split_id, category_id } = body as { split_id?: string; category_id?: string | null };
    if (!split_id) return NextResponse.json({ error: "split_id חסר" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { error: updErr } = await supabase
      .from("bank_transaction_splits")
      .update({ category_id: category_id || null })
      .eq("id", split_id)
      .eq("company_id", companyId);

    if (updErr) {
      logError("splits PATCH", updErr);
      return NextResponse.json({ error: "שגיאה בעדכון סיווג פיצול" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("splits PATCH unhandled", err);
    return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
  }
}
