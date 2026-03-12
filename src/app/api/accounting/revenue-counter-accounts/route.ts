export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId } = await resolveSelectedCompanyId(supabase, user.id);
    if (!companyId) {
      return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("revenue_account_codes")
      .select("*")
      .eq("company_id", companyId)
      .order("account_code");

    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("[GET revenue-account-codes]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId } = await resolveSelectedCompanyId(supabase, user.id);
    if (!companyId) {
      return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });
    }

    const body = await req.json();
    const { account_code, display_name } = body as {
      account_code?: string;
      display_name?: string;
    };

    if (!account_code?.trim()) {
      return NextResponse.json(
        { error: "account_code is required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("revenue_account_codes")
      .upsert(
        {
          company_id: companyId,
          account_code: account_code.trim(),
          display_name: display_name?.trim() || null,
        },
        { onConflict: "company_id,account_code" },
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[POST revenue-account-codes]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId } = await resolveSelectedCompanyId(supabase, user.id);
    if (!companyId) {
      return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const accountCode = searchParams.get("account_code");

    if (!accountCode) {
      return NextResponse.json(
        { error: "account_code query param required" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("revenue_account_codes")
      .delete()
      .eq("company_id", companyId)
      .eq("account_code", accountCode);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE revenue-account-codes]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}
