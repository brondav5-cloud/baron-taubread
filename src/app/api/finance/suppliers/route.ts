import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { resolveOrCreateSupplierMaster } from "@/modules/finance/suppliers/master";

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

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 20) || 20, 300);
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("finance_suppliers")
    .select("id, master_name")
    .eq("company_id", companyId)
    .order("master_name")
    .limit(limit);

  if (q.length >= 2) query = query.ilike("master_name", `%${q}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ suppliers: data ?? [] });
}

export async function POST(request: NextRequest) {
  const companyId = await getCompanyId();
  if (!companyId) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name חסר" }, { status: 400 });

  const resolved = await resolveOrCreateSupplierMaster({
    supabase: getSupabaseAdmin(),
    companyId,
    inputName: name,
  });
  if (!resolved) return NextResponse.json({ error: "שגיאה ביצירת ספק" }, { status: 500 });

  return NextResponse.json({
    ok: true,
    supplier: { id: resolved.supplierId, master_name: resolved.masterName },
  });
}
