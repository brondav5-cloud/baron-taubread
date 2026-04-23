import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

interface SupplierRow {
  id: string;
  master_name: string;
  normalized_name: string;
}

interface RejectedPairRow {
  supplier_a_id: string;
  supplier_b_id: string;
}

function sortPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function normalizedTokens(value: string): string[] {
  return value
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .filter((t) => !/^\d+$/.test(t));
}

function sameLeadingTokens(a: string, b: string): number {
  const at = normalizedTokens(a);
  const bt = normalizedTokens(b);
  const max = Math.min(at.length, bt.length, 3);
  let same = 0;
  for (let i = 0; i < max; i++) {
    if (at[i] !== bt[i]) break;
    same += 1;
  }
  return same;
}

function tokenSimilarity(a: string, b: string): number {
  const aTokens = new Set(normalizedTokens(a));
  const bTokens = new Set(normalizedTokens(b));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  let common = 0;
  aTokens.forEach((t) => {
    if (bTokens.has(t)) common += 1;
  });
  const union = new Set([...Array.from(aTokens), ...Array.from(bTokens)]).size;
  return union === 0 ? 0 : common / union;
}

function charOverlap(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.95;
  if (a.slice(0, 10) === b.slice(0, 10)) return 0.93;
  let same = 0;
  const min = Math.min(a.length, b.length);
  for (let i = 0; i < min; i++) if (a[i] === b[i]) same += 1;
  return same / Math.max(a.length, b.length);
}

function pairScore(a: SupplierRow, b: SupplierRow): number {
  const leading = sameLeadingTokens(a.normalized_name, b.normalized_name);
  if (leading >= 2) return 0.96;
  const token = tokenSimilarity(a.normalized_name, b.normalized_name);
  const chars = charOverlap(a.normalized_name, b.normalized_name);
  const boosted = leading === 1 ? Math.max(token, chars) + 0.08 : Math.max(token, chars);
  return Math.min(1, boosted);
}

export async function GET() {
  const supabaseAuth = createServerSupabaseClient();
  const { data: { user }, error } = await supabaseAuth.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  const { companyId } = await resolveSelectedCompanyId(supabaseAuth, user.id);
  if (!companyId) return NextResponse.json({ error: "לא נבחרה חברה" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error: loadErr } = await supabase
    .from("finance_suppliers")
    .select("id, master_name, normalized_name")
    .eq("company_id", companyId)
    .order("master_name");
  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 });

  const { data: rejectedPairs, error: rejectedErr } = await supabase
    .from("finance_supplier_merge_rejections")
    .select("supplier_a_id, supplier_b_id")
    .eq("company_id", companyId);
  if (rejectedErr) return NextResponse.json({ error: rejectedErr.message }, { status: 500 });

  const suppliers = (data ?? []) as SupplierRow[];
  const rejectedSet = new Set(
    ((rejectedPairs ?? []) as RejectedPairRow[]).map((p) => `${p.supplier_a_id}::${p.supplier_b_id}`)
  );
  const candidates: Array<{
    a: { id: string; name: string };
    b: { id: string; name: string };
    score: number;
  }> = [];

  for (let i = 0; i < suppliers.length; i++) {
    for (let j = i + 1; j < suppliers.length; j++) {
      const a = suppliers[i]!;
      const b = suppliers[j]!;
      const [left, right] = sortPair(a.id, b.id);
      if (rejectedSet.has(`${left}::${right}`)) continue;
      const score = pairScore(a, b);
      if (score < 0.58) continue;
      candidates.push({
        a: { id: a.id, name: a.master_name },
        b: { id: b.id, name: b.master_name },
        score,
      });
    }
  }

  candidates.sort((x, y) => y.score - x.score);
  return NextResponse.json({ candidates: candidates.slice(0, 40) });
}

export async function POST(request: NextRequest) {
  const supabaseAuth = createServerSupabaseClient();
  const { data: { user }, error } = await supabaseAuth.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  const { companyId } = await resolveSelectedCompanyId(supabaseAuth, user.id);
  if (!companyId) return NextResponse.json({ error: "לא נבחרה חברה" }, { status: 400 });

  let body: { action?: string; supplier_a_id?: string; supplier_b_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }

  const action = body.action ?? "";
  if (action !== "reject") {
    return NextResponse.json({ error: "action לא נתמך" }, { status: 400 });
  }

  const supplierAId = body.supplier_a_id ?? "";
  const supplierBId = body.supplier_b_id ?? "";
  if (!supplierAId || !supplierBId) {
    return NextResponse.json({ error: "supplier ids חסרים" }, { status: 400 });
  }
  if (supplierAId === supplierBId) {
    return NextResponse.json({ error: "לא ניתן לסרב מיזוג עבור אותו ספק" }, { status: 400 });
  }

  const [a, b] = sortPair(supplierAId, supplierBId);
  const supabase = getSupabaseAdmin();
  const { error: upsertErr } = await supabase
    .from("finance_supplier_merge_rejections")
    .upsert(
      { company_id: companyId, supplier_a_id: a, supplier_b_id: b },
      { onConflict: "company_id,supplier_a_id,supplier_b_id" }
    );
  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
