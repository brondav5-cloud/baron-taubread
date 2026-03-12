export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

async function getAuthContext() {
  const authClient = createServerSupabaseClient();
  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) return { user: null, companyId: null };
  
  const { companyId } = await resolveSelectedCompanyId(authClient, user.id);
  return { user, companyId };
}

// GET /api/accounting/counter-names
export async function GET() {
  const { user, companyId } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!companyId) return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("counter_account_names")
    .select("*")
    .eq("company_id", companyId)
    .order("counter_account_code");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ counterNames: data });
}

// POST /api/accounting/counter-names
// Body: { counter_account_code, display_name }
export async function POST(request: Request) {
  const { user, companyId } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!companyId) return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });

  const body = await request.json();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("counter_account_names")
    .upsert(
      { ...body, company_id: companyId, user_id: user.id },
      { onConflict: "company_id,counter_account_code" },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ counterName: data });
}

// PATCH /api/accounting/counter-names
// Body: { id, display_name }
export async function PATCH(request: Request) {
  const { user, companyId } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!companyId) return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });

  const body = await request.json();
  const { id, ...update } = body;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("counter_account_names")
    .update(update)
    .eq("id", id)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ counterName: data });
}
