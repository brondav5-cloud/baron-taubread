import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

export async function POST(request: NextRequest) {
  const supabaseAuth = createServerSupabaseClient();
  const { data: { user }, error } = await supabaseAuth.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

  const { companyId } = await resolveSelectedCompanyId(supabaseAuth, user.id);
  if (!companyId) return NextResponse.json({ error: "לא נבחרה חברה" }, { status: 400 });

  let body: { source_supplier_id?: string; target_supplier_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }

  const sourceId = body.source_supplier_id ?? "";
  const targetId = body.target_supplier_id ?? "";
  if (!sourceId || !targetId) return NextResponse.json({ error: "supplier ids חסרים" }, { status: 400 });
  if (sourceId === targetId) return NextResponse.json({ error: "לא ניתן למזג ספק לעצמו" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const [{ data: source }, { data: target }] = await Promise.all([
    supabase.from("finance_suppliers").select("id, master_name").eq("company_id", companyId).eq("id", sourceId).maybeSingle(),
    supabase.from("finance_suppliers").select("id, master_name").eq("company_id", companyId).eq("id", targetId).maybeSingle(),
  ]);
  if (!source || !target) return NextResponse.json({ error: "ספק לא נמצא" }, { status: 404 });

  const { data: sourceAliases } = await supabase
    .from("finance_supplier_aliases")
    .select("alias_name, normalized_alias")
    .eq("company_id", companyId)
    .eq("supplier_id", sourceId);

  const { data: txUpdated } = await supabase
    .from("bank_transactions")
    .update({ supplier_id: targetId, supplier_name: target.master_name })
    .eq("company_id", companyId)
    .eq("supplier_id", sourceId)
    .select("id");

  const { data: splitUpdated } = await supabase
    .from("bank_transaction_splits")
    .update({ supplier_id: targetId, supplier_name: target.master_name })
    .eq("company_id", companyId)
    .eq("supplier_id", sourceId)
    .select("id");

  for (const alias of (sourceAliases ?? []) as Array<{ alias_name: string; normalized_alias: string }>) {
    await supabase
      .from("finance_supplier_aliases")
      .upsert(
        {
          company_id: companyId,
          supplier_id: targetId,
          alias_name: alias.alias_name,
          normalized_alias: alias.normalized_alias,
        },
        { onConflict: "company_id,normalized_alias" }
      );
  }

  await supabase
    .from("finance_supplier_aliases")
    .delete()
    .eq("company_id", companyId)
    .eq("supplier_id", sourceId);

  const { error: deleteSourceErr } = await supabase
    .from("finance_suppliers")
    .delete()
    .eq("company_id", companyId)
    .eq("id", sourceId);
  if (deleteSourceErr) return NextResponse.json({ error: deleteSourceErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    merged: {
      source: source.master_name,
      target: target.master_name,
      transactions: txUpdated?.length ?? 0,
      splits: splitUpdated?.length ?? 0,
    },
  });
}
