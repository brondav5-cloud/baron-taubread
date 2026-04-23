import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { logError } from "@/lib/api/logger";
import type { ClassificationSource } from "@/modules/finance/categories/types";
import {
  matchesRuleNormalized,
  normalizeForMatch,
  type MatchField,
  type MatchType,
} from "@/modules/finance/classification/match";

interface CategoryRule {
  id: string;
  category_id: string;
  match_field: MatchField;
  match_type: MatchType;
  match_value: string;
  priority: number;
}

interface TxRow {
  id: string;
  date: string;
  description: string;
  supplier_name: string | null;
  debit: number;
  credit: number;
  details: string;
  reference: string;
  operation_code: string | null;
  category_id: string | null;
  category_override: string | null;
}

interface SplitRow {
  id: string;
  transaction_id: string;
  description: string;
  supplier_name: string | null;
  amount: number;
  category_id: string | null;
}

type MatchableRow = Partial<Record<MatchField, string | null | undefined>>;

function matchesRule(row: MatchableRow, rule: CategoryRule): boolean {
  const normalizedValue = normalizeForMatch(rule.match_value);
  if (!normalizedValue) return false;
  return matchesRuleNormalized(row, rule);
}

function sourceFromField(field: MatchField): ClassificationSource {
  if (field === "supplier_name") return "supplier_rule";
  if (field === "details") return "details_rule";
  if (field === "reference") return "reference_rule";
  if (field === "operation_code") return "operation_code_rule";
  return "description_rule";
}

function normalizeLoose(value: string): string {
  return normalizeForMatch(value);
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAuth = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

    const { companyId } = await resolveSelectedCompanyId(supabaseAuth, user.id);
    if (!companyId) return NextResponse.json({ error: "לא נבחרה חברה" }, { status: 400 });

    const categoryId = request.nextUrl.searchParams.get("category_id");
    const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
    const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? 25);
    const limit = Number.isFinite(limitRaw) ? Math.max(5, Math.min(100, limitRaw)) : 25;

    const supabase = getSupabaseAdmin();
    const [{ data: categories }, { data: rules }, { data: splitRules }] = await Promise.all([
      supabase.from("bank_categories").select("id,name").eq("company_id", companyId),
      supabase
        .from("category_rules")
        .select("id,category_id,match_field,match_type,match_value,priority")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("priority", { ascending: false }),
      supabase.from("split_classification_rules").select("match_value,category_id").eq("company_id", companyId),
    ]);

    const categoryMap = new Map((categories ?? []).map((c) => [c.id, c.name]));
    const allRules = (rules ?? []) as CategoryRule[];
    const splitRuleMap = new Map(
      (splitRules ?? []).map((r: { match_value: string; category_id: string }) => [
        `${normalizeLoose(r.match_value)}::${r.category_id}`,
        r.match_value,
      ])
    );

    const getRuleMatch = (
      row: MatchableRow,
      catId: string
    ): { source: ClassificationSource; value: string | null } => {
      const catRules = allRules.filter((r) => r.category_id === catId);
      for (const rule of catRules) {
        if (matchesRule(row, rule)) {
          return { source: sourceFromField(rule.match_field), value: rule.match_value };
        }
      }
      return { source: "manual_or_unknown", value: null };
    };
    const getBestRuleMatch = (
      row: MatchableRow
    ): { source: ClassificationSource; value: string | null; category_id: string | null } => {
      for (const rule of allRules) {
        if (matchesRule(row, rule)) {
          return {
            source: sourceFromField(rule.match_field),
            value: rule.match_value,
            category_id: rule.category_id,
          };
        }
      }
      return { source: "manual_or_unknown", value: null, category_id: null };
    };

    if (categoryId) {
      const [{ data: txRows }, { data: splitRows }] = await Promise.all([
        supabase
          .from("bank_transactions")
          .select("id,date,description,supplier_name,debit,credit,details,reference,operation_code,category_id,category_override")
          .eq("company_id", companyId)
          .is("deleted_at", null)
          .eq("category_id", categoryId)
          .order("date", { ascending: false })
          .limit(limit),
        supabase
          .from("bank_transaction_splits")
          .select("id,transaction_id,description,supplier_name,amount,category_id")
          .eq("company_id", companyId)
          .eq("category_id", categoryId)
          .order("created_at", { ascending: false })
          .limit(limit),
      ]);

      const splitTxIds = Array.from(
        new Set(((splitRows ?? []) as SplitRow[]).map((s) => s.transaction_id))
      );
      const { data: splitParents } = splitTxIds.length
        ? await supabase
            .from("bank_transactions")
            .select("id,date")
            .eq("company_id", companyId)
              .is("deleted_at", null)
            .in("id", splitTxIds)
        : { data: [] as { id: string; date: string }[] };
      const parentDateMap = new Map((splitParents ?? []).map((p) => [p.id, p.date]));

      const txView = ((txRows ?? []) as TxRow[]).map((row) => {
        const amount = Number(row.debit) > 0 ? Number(row.debit) : Number(row.credit);
        const rowCategoryId = row.category_id ?? categoryId;
        const matched = row.category_override === "manual"
          ? { source: "manual_or_unknown" as ClassificationSource, value: null }
          : getRuleMatch(row, rowCategoryId);
        return {
          id: row.id,
          kind: "transaction",
          date: row.date,
          description: row.description ?? "",
          supplier_name: row.supplier_name ?? null,
          amount,
          category_id: rowCategoryId,
          category_name: categoryMap.get(rowCategoryId) ?? "",
          matched_by: matched.source,
          matched_rule_value: matched.value,
        };
      });

      const splitView = ((splitRows ?? []) as SplitRow[]).map((row) => {
        const rowCategoryId = row.category_id ?? categoryId;
        const splitRuleKey = `${normalizeLoose(row.description ?? "")}::${rowCategoryId}`;
        const splitRuleValue = splitRuleMap.get(splitRuleKey) ?? null;
        const fallback = getRuleMatch(
          { description: row.description, supplier_name: row.supplier_name },
          rowCategoryId
        );
        return {
          id: row.id,
          kind: "split",
          date: parentDateMap.get(row.transaction_id) ?? "",
          description: row.description ?? "",
          supplier_name: row.supplier_name ?? null,
          amount: Number(row.amount) || 0,
          category_id: rowCategoryId,
          category_name: categoryMap.get(rowCategoryId) ?? "",
          matched_by: splitRuleValue ? ("split_rule" as ClassificationSource) : fallback.source,
          matched_rule_value: splitRuleValue ?? fallback.value,
        };
      });

      const rows = [...txView, ...splitView]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, limit);
      return NextResponse.json({ rows });
    }

    if (!q) {
      return NextResponse.json({ rows: [] });
    }

    const like = `%${q}%`;
    const [{ data: txRows }, { data: splitRows }] = await Promise.all([
      supabase
        .from("bank_transactions")
        .select("id,date,description,supplier_name,debit,credit,details,reference,operation_code,category_id,category_override")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .or(`description.ilike.${like},supplier_name.ilike.${like}`)
        .order("date", { ascending: false })
        .limit(limit),
      supabase
        .from("bank_transaction_splits")
        .select("id,transaction_id,description,supplier_name,amount,category_id")
        .eq("company_id", companyId)
        .or(`description.ilike.${like},supplier_name.ilike.${like}`)
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

    const splitTxIds = Array.from(new Set(((splitRows ?? []) as SplitRow[]).map((s) => s.transaction_id)));
    const { data: splitParents } = splitTxIds.length
      ? await supabase
          .from("bank_transactions")
          .select("id,date")
          .eq("company_id", companyId)
          .is("deleted_at", null)
          .in("id", splitTxIds)
      : { data: [] as { id: string; date: string }[] };
    const parentDateMap = new Map((splitParents ?? []).map((p) => [p.id, p.date]));

    const txView = ((txRows ?? []) as TxRow[]).map((row) => {
      const resolved = row.category_id
        ? (row.category_override === "manual"
          ? { source: "manual_or_unknown" as ClassificationSource, value: null, category_id: row.category_id }
          : { ...getRuleMatch(row, row.category_id), category_id: row.category_id })
        : getBestRuleMatch(row);
      const resolvedCategoryId = resolved.category_id ?? row.category_id ?? null;
      return {
        id: row.id,
        kind: "transaction",
        date: row.date,
        description: row.description ?? "",
        supplier_name: row.supplier_name ?? null,
        amount: Number(row.debit) > 0 ? Number(row.debit) : Number(row.credit),
        category_id: resolvedCategoryId,
        category_name: resolvedCategoryId ? (categoryMap.get(resolvedCategoryId) ?? "") : "ללא סיווג",
        matched_by: resolved.source,
        matched_rule_value: resolved.value,
        match_reason: resolvedCategoryId ? undefined : "לא נמצא כלל תואם לפי השדות שהוגדרו",
      };
    });

    const splitView = ((splitRows ?? []) as SplitRow[]).map((row) => {
      const splitRuleKey = `${normalizeLoose(row.description ?? "")}::${row.category_id}`;
      const splitRuleValue = splitRuleMap.get(splitRuleKey) ?? null;
      const baseRow = { description: row.description, supplier_name: row.supplier_name };
      const fallback = row.category_id
        ? { ...getRuleMatch(baseRow, row.category_id), category_id: row.category_id }
        : getBestRuleMatch(baseRow);
      const resolvedCategoryId = row.category_id || fallback.category_id || null;
      return {
        id: row.id,
        kind: "split",
        date: parentDateMap.get(row.transaction_id) ?? "",
        description: row.description ?? "",
        supplier_name: row.supplier_name ?? null,
        amount: Number(row.amount) || 0,
        category_id: resolvedCategoryId,
        category_name: resolvedCategoryId ? (categoryMap.get(resolvedCategoryId) ?? "") : "ללא סיווג",
        matched_by: splitRuleValue ? ("split_rule" as ClassificationSource) : fallback.source,
        matched_rule_value: splitRuleValue ?? fallback.value,
        match_reason: resolvedCategoryId ? undefined : "לא נמצא כלל תואם לפי השדות שהוגדרו",
      };
    });

    const rows = [...txView, ...splitView]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit);

    return NextResponse.json({ rows });
  } catch (err) {
    logError("finance/categories/insights GET", err);
    return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
  }
}
