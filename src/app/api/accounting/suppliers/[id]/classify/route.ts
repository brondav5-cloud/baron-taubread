/**
 * PUT /api/accounting/suppliers/[id]/classify
 * Set manual classification for a supplier.
 * Body: { manual_account_code: string; manual_account_name?: string; match_by_name?: boolean; match_name?: string }
 */
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const manual_account_code = body.manual_account_code as string | undefined;
    if (!manual_account_code || typeof manual_account_code !== "string") {
      return NextResponse.json({ error: "manual_account_code נדרש" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: supplier, error: supErr } = await supabase
      .from("suppliers")
      .select("id, company_id")
      .eq("id", id)
      .eq("company_id", companyId)
      .maybeSingle();

    if (supErr || !supplier) {
      return NextResponse.json({ error: "ספק לא נמצא" }, { status: 404 });
    }

    const manual_account_name = body.manual_account_name as string | undefined;
    const match_by_name = Boolean(body.match_by_name);
    const match_name = body.match_name as string | undefined;

    const { error: upsertErr } = await supabase
      .from("supplier_classifications")
      .upsert(
        {
          company_id: companyId,
          supplier_id: id,
          manual_account_code: manual_account_code.trim(),
          manual_account_name: manual_account_name?.trim() ?? null,
          match_by_name: match_by_name || false,
          match_name: match_by_name && match_name ? match_name.trim() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id,supplier_id" },
      );

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Classify error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
