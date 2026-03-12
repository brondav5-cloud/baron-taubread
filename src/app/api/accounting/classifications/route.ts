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

// GET /api/accounting/classifications
export async function GET() {
  const { user, companyId } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!companyId) return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("account_classification_overrides")
    .select("*")
    .eq("company_id", companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ classifications: data });
}

// POST /api/accounting/classifications
// Body: { account_id, custom_group_id, note? }
export async function POST(request: Request) {
  const { user, companyId } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!companyId) return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });

  const body = await request.json();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("account_classification_overrides")
    .upsert(
      { ...body, company_id: companyId, user_id: user.id },
      { onConflict: "company_id,account_id" },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ classification: data });
}

// PATCH /api/accounting/classifications — batch upsert + delete in one round trip
// Body: { changes: Array<{ account_id: string; custom_group_id: string | null; note?: string }> }
export async function PATCH(request: Request) {
  const { user, companyId } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!companyId) return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });

  const body: { changes: Array<{ account_id: string; custom_group_id: string | null; note?: string }> } =
    await request.json();
  if (!Array.isArray(body.changes) || body.changes.length === 0) {
    return NextResponse.json({ success: true });
  }

  const supabase = getSupabaseAdmin();

  const toUpsert = body.changes.filter((c) => c.custom_group_id !== null);
  const toDelete = body.changes.filter((c) => c.custom_group_id === null).map((c) => c.account_id);

  const errors: string[] = [];

  if (toUpsert.length > 0) {
    const { error } = await supabase
      .from("account_classification_overrides")
      .upsert(
        toUpsert.map((c) => ({
          company_id: companyId,
          user_id: user.id,
          account_id: c.account_id,
          custom_group_id: c.custom_group_id!,
          note: c.note ?? null,
        })),
        { onConflict: "company_id,account_id" },
      );
    if (error) errors.push(error.message);
  }

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("account_classification_overrides")
      .delete()
      .eq("company_id", companyId)
      .in("account_id", toDelete);
    if (error) errors.push(error.message);
  }

  if (errors.length > 0) return NextResponse.json({ error: errors.join("; ") }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE /api/accounting/classifications?account_id=xxx
export async function DELETE(request: Request) {
  const { user, companyId } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!companyId) return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("account_id");
  if (!accountId) return NextResponse.json({ error: "Missing account_id" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("account_classification_overrides")
    .delete()
    .eq("account_id", accountId)
    .eq("company_id", companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
