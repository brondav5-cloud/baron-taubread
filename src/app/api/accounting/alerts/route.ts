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

// GET /api/accounting/alerts
export async function GET() {
  const { user, companyId } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!companyId) return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("alert_rules")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rules: data });
}

// POST /api/accounting/alerts
export async function POST(request: Request) {
  const { user, companyId } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!companyId) return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });

  const body = await request.json();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("alert_rules")
    .insert({ ...body, company_id: companyId, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rule: data });
}

// PATCH /api/accounting/alerts
export async function PATCH(request: Request) {
  const { user, companyId } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!companyId) return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });

  const body = await request.json();
  const { id, ...update } = body;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("alert_rules")
    .update(update)
    .eq("id", id)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rule: data });
}

// DELETE /api/accounting/alerts?id=xxx
export async function DELETE(request: Request) {
  const { user, companyId } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!companyId) return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("alert_rules")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
