import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { cleanSupplierDisplayName, normalizeSupplierName } from "@/modules/finance/suppliers/master";

async function getCompanyId() {
  const supabaseAuth = createServerSupabaseClient();
  const { data: { user }, error } = await supabaseAuth.auth.getUser();
  if (error || !user) return null;
  const { companyId } = await resolveSelectedCompanyId(supabaseAuth, user.id);
  return companyId ?? null;
}

export async function GET(request: NextRequest) {
  const companyId = await getCompanyId();
  if (!companyId) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  const supplierId = request.nextUrl.searchParams.get("supplier_id");
  if (!supplierId) return NextResponse.json({ error: "supplier_id חסר" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("finance_supplier_aliases")
    .select("id, alias_name, normalized_alias, created_at")
    .eq("company_id", companyId)
    .eq("supplier_id", supplierId)
    .order("alias_name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ aliases: data ?? [] });
}

export async function POST(request: NextRequest) {
  const companyId = await getCompanyId();
  if (!companyId) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

  let body: { supplier_id?: string; alias_name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }
  const supplierId = body.supplier_id ?? "";
  const aliasName = cleanSupplierDisplayName(body.alias_name ?? "");
  const normalized = normalizeSupplierName(aliasName);
  if (!supplierId || !aliasName || !normalized) {
    return NextResponse.json({ error: "supplier_id או alias_name חסרים" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: supplier } = await supabase
    .from("finance_suppliers")
    .select("id")
    .eq("company_id", companyId)
    .eq("id", supplierId)
    .maybeSingle();
  if (!supplier) return NextResponse.json({ error: "ספק לא נמצא" }, { status: 404 });

  const { data: existing } = await supabase
    .from("finance_supplier_aliases")
    .select("id, supplier_id")
    .eq("company_id", companyId)
    .eq("normalized_alias", normalized)
    .maybeSingle();
  if (existing && existing.supplier_id !== supplierId) {
    return NextResponse.json({ error: "alias כבר משויך לספק אחר" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("finance_supplier_aliases")
    .upsert(
      {
        company_id: companyId,
        supplier_id: supplierId,
        alias_name: aliasName,
        normalized_alias: normalized,
      },
      { onConflict: "company_id,normalized_alias" }
    )
    .select("id, alias_name, normalized_alias")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, alias: data });
}

export async function DELETE(request: NextRequest) {
  const companyId = await getCompanyId();
  if (!companyId) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  const aliasId = request.nextUrl.searchParams.get("id");
  if (!aliasId) return NextResponse.json({ error: "id חסר" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("finance_supplier_aliases")
    .delete()
    .eq("company_id", companyId)
    .eq("id", aliasId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
