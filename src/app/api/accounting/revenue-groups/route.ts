export const dynamic = 'force-dynamic';

/**
 * GET /api/accounting/revenue-groups — list
 * POST /api/accounting/revenue-groups — body: { group_code } add
 * DELETE /api/accounting/revenue-groups?group_code=X — remove
 */
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

export async function GET() {
  try {
    const authClient = createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId } = await resolveSelectedCompanyId(authClient, user.id);
    if (!companyId) {
      return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from("revenue_groups")
      .select("group_code")
      .eq("company_id", companyId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ group_codes: (data ?? []).map((r) => r.group_code) });
  } catch (err) {
    console.error("Revenue groups GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const authClient = createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId } = await resolveSelectedCompanyId(authClient, user.id);
    if (!companyId) {
      return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const group_code = (body.group_code ?? "").toString().trim();
    if (!group_code) {
      return NextResponse.json({ error: "group_code נדרש" }, { status: 400 });
    }

    const { error } = await getSupabaseAdmin()
      .from("revenue_groups")
      .upsert(
        { company_id: companyId, group_code },
        { onConflict: "company_id,group_code" },
      );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Revenue groups POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const authClient = createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId } = await resolveSelectedCompanyId(authClient, user.id);
    if (!companyId) {
      return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const group_code = searchParams.get("group_code")?.trim();
    if (!group_code) {
      return NextResponse.json({ error: "group_code נדרש" }, { status: 400 });
    }

    const { error } = await getSupabaseAdmin()
      .from("revenue_groups")
      .delete()
      .eq("company_id", companyId)
      .eq("group_code", group_code);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Revenue groups DELETE error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
