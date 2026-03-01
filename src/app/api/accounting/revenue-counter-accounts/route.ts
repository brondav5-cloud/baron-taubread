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
      .from("revenue_counter_accounts")
      .select("*")
      .eq("company_id", companyId)
      .order("counter_account");

    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("[GET revenue-counter-accounts]", err);
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
    const { counter_account, display_name } = body as {
      counter_account?: string;
      display_name?: string;
    };

    if (!counter_account?.trim()) {
      return NextResponse.json(
        { error: "counter_account is required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("revenue_counter_accounts")
      .upsert(
        {
          company_id: companyId,
          counter_account: counter_account.trim(),
          display_name: display_name?.trim() || null,
        },
        { onConflict: "company_id,counter_account" },
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[POST revenue-counter-accounts]", err);
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
    const counterAccount = searchParams.get("counter_account");

    if (!counterAccount) {
      return NextResponse.json(
        { error: "counter_account query param required" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("revenue_counter_accounts")
      .delete()
      .eq("company_id", companyId)
      .eq("counter_account", counterAccount);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE revenue-counter-accounts]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}
