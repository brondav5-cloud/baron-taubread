import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { matchesRuleNormalized, normalizeForMatch, type MatchField, type MatchType } from "./match";

interface BankTx {
  id: string;
  description: string;
  details: string;
  reference: string;
  operation_code: string | null;
  supplier_name: string | null;
}

interface SplitRow {
  id: string;
  description: string;
  supplier_name: string | null;
}

interface ApplyRuleInput {
  companyId: string;
  categoryId: string;
  matchField: MatchField;
  matchType: MatchType;
  matchValue: string;
  includeClassified: boolean;
}

export async function applySingleRuleNow(input: ApplyRuleInput): Promise<{
  classified: number;
  classifiedSplits: number;
}> {
  const supabase = getSupabaseAdmin();
  const rule = {
    match_field: input.matchField,
    match_type: input.matchType,
    match_value: input.matchValue,
  };

  const normalizedValue = normalizeForMatch(input.matchValue);
  if (!normalizedValue) return { classified: 0, classifiedSplits: 0 };

  let allTransactions: BankTx[] = [];
  let offset = 0;
  const FETCH_BATCH = 1000;
  while (true) {
    let q = supabase
      .from("bank_transactions")
      .select("id, description, details, reference, operation_code, supplier_name")
      .eq("company_id", input.companyId)
      .order("date", { ascending: false })
      .range(offset, offset + FETCH_BATCH - 1);
    if (!input.includeClassified) q = q.is("category_id", null);
    const { data: batch } = await q;
    if (!batch || batch.length === 0) break;
    allTransactions = allTransactions.concat(batch as BankTx[]);
    if (batch.length < FETCH_BATCH) break;
    offset += FETCH_BATCH;
  }

  const txIds: string[] = [];
  for (const tx of allTransactions) {
    if (matchesRuleNormalized(tx, rule)) txIds.push(tx.id);
  }

  let classified = 0;
  for (let i = 0; i < txIds.length; i += 1000) {
    const chunk = txIds.slice(i, i + 1000);
    const { error: upErr } = await supabase
      .from("bank_transactions")
      .update({ category_id: input.categoryId })
      .in("id", chunk)
      .eq("company_id", input.companyId);
    if (!upErr) classified += chunk.length;
  }

  let allSplits: SplitRow[] = [];
  let splitOffset = 0;
  while (true) {
    let q = supabase
      .from("bank_transaction_splits")
      .select("id, description, supplier_name")
      .eq("company_id", input.companyId)
      .range(splitOffset, splitOffset + FETCH_BATCH - 1);
    if (!input.includeClassified) q = q.is("category_id", null);
    const { data: splitBatch } = await q;
    if (!splitBatch || splitBatch.length === 0) break;
    allSplits = allSplits.concat(splitBatch as SplitRow[]);
    if (splitBatch.length < FETCH_BATCH) break;
    splitOffset += FETCH_BATCH;
  }

  const splitIds: string[] = [];
  for (const split of allSplits) {
    const asTx: BankTx = {
      id: split.id,
      description: split.description ?? "",
      details: "",
      reference: "",
      operation_code: null,
      supplier_name: split.supplier_name ?? null,
    };
    if (matchesRuleNormalized(asTx, rule)) splitIds.push(split.id);
  }

  let classifiedSplits = 0;
  for (let i = 0; i < splitIds.length; i += 1000) {
    const chunk = splitIds.slice(i, i + 1000);
    const { error: upErr } = await supabase
      .from("bank_transaction_splits")
      .update({ category_id: input.categoryId })
      .in("id", chunk)
      .eq("company_id", input.companyId);
    if (!upErr) classifiedSplits += chunk.length;
  }

  return { classified, classifiedSplits };
}
