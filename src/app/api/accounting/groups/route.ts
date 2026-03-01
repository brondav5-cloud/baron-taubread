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

// GET /api/accounting/groups
export async function GET() {
  const { user, companyId } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!companyId) return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("custom_groups")
    .select("*")
    .eq("company_id", companyId)
    .order("display_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ groups: data });
}

// POST /api/accounting/groups
export async function POST(request: Request) {
  const { user, companyId } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!companyId) return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });

  const body = await request.json();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("custom_groups")
    .insert({ ...body, company_id: companyId, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ group: data });
}

// PATCH /api/accounting/groups
export async function PATCH(request: Request) {
  const { user, companyId } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!companyId) return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });

  const body = await request.json();
  const { id, ...update } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("custom_groups")
    .update(update)
    .eq("id", id)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ group: data });
}

// DELETE /api/accounting/groups?id=xxx
export async function DELETE(request: Request) {
  const { user, companyId } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!companyId) return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("custom_groups")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
