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

export async function PATCH(request: NextRequest) {
  const companyId = await getCompanyId();
  if (!companyId) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

  let body: {
    action?: "preview_promote_alias" | "promote_alias";
    supplier_id?: string;
    alias_id?: string;
    confirm?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }

  const action = body.action;
  const supplierId = body.supplier_id ?? "";
  const aliasId = body.alias_id ?? "";
  if (!action || !supplierId || !aliasId) {
    return NextResponse.json({ error: "action/supplier_id/alias_id חסרים" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: supplier } = await supabase
    .from("finance_suppliers")
    .select("id, master_name, normalized_name")
    .eq("company_id", companyId)
    .eq("id", supplierId)
    .maybeSingle();
  if (!supplier) return NextResponse.json({ error: "ספק לא נמצא" }, { status: 404 });

  const { data: alias } = await supabase
    .from("finance_supplier_aliases")
    .select("id, alias_name, normalized_alias")
    .eq("company_id", companyId)
    .eq("supplier_id", supplierId)
    .eq("id", aliasId)
    .maybeSingle();
  if (!alias) return NextResponse.json({ error: "alias לא נמצא" }, { status: 404 });

  const { count: txCount } = await supabase
    .from("bank_transactions")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("supplier_id", supplierId);
  const { count: splitCount } = await supabase
    .from("bank_transaction_splits")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("supplier_id", supplierId);

  if (action === "preview_promote_alias") {
    return NextResponse.json({
      ok: true,
      preview: {
        current_master: supplier.master_name,
        new_master: alias.alias_name,
        transactions: txCount ?? 0,
        splits: splitCount ?? 0,
      },
    });
  }

  if (action !== "promote_alias") {
    return NextResponse.json({ error: "action לא נתמך" }, { status: 400 });
  }
  if (!body.confirm) {
    return NextResponse.json({ error: "נדרש אישור ידני (confirm=true)" }, { status: 400 });
  }

  // Safety: prevent collision with another supplier's normalized name.
  const { data: conflict } = await supabase
    .from("finance_suppliers")
    .select("id, master_name")
    .eq("company_id", companyId)
    .eq("normalized_name", alias.normalized_alias)
    .neq("id", supplierId)
    .maybeSingle();
  if (conflict) {
    return NextResponse.json(
      { error: `לא ניתן לקדם alias לשם מאסטר כי הוא שייך בפועל לספק אחר: ${conflict.master_name}` },
      { status: 409 }
    );
  }

  // Keep current master name as an alias before renaming.
  if (supplier.master_name !== alias.alias_name) {
    await supabase
      .from("finance_supplier_aliases")
      .upsert(
        {
          company_id: companyId,
          supplier_id: supplierId,
          alias_name: cleanSupplierDisplayName(supplier.master_name),
          normalized_alias: normalizeSupplierName(supplier.master_name),
        },
        { onConflict: "company_id,normalized_alias" }
      );
  }

  const { error: updateMasterErr } = await supabase
    .from("finance_suppliers")
    .update({
      master_name: cleanSupplierDisplayName(alias.alias_name),
      normalized_name: alias.normalized_alias,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("id", supplierId);
  if (updateMasterErr) return NextResponse.json({ error: updateMasterErr.message }, { status: 500 });

  const newMaster = cleanSupplierDisplayName(alias.alias_name);
  const { data: txUpdated, error: txErr } = await supabase
    .from("bank_transactions")
    .update({ supplier_name: newMaster })
    .eq("company_id", companyId)
    .eq("supplier_id", supplierId)
    .select("id");
  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });

  const { data: splitUpdated, error: splitErr } = await supabase
    .from("bank_transaction_splits")
    .update({ supplier_name: newMaster })
    .eq("company_id", companyId)
    .eq("supplier_id", supplierId)
    .select("id");
  if (splitErr) return NextResponse.json({ error: splitErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    promoted: {
      supplier_id: supplierId,
      master_name: newMaster,
      transactions: txUpdated?.length ?? 0,
      splits: splitUpdated?.length ?? 0,
    },
  });
}
