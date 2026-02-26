import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    }

    const { companyId, role } = await resolveSelectedCompanyId(
      supabase,
      user.id,
    );
    if (!companyId || (role !== "super_admin" && role !== "admin")) {
      return NextResponse.json(
        { error: "רק מנהל ראשי יכול לגשת למודול הוצאות" },
        { status: 403 },
      );
    }

    const url = new URL(request.url);
    const year = url.searchParams.get("year");
    const month = url.searchParams.get("month");

    // Fetch categories
    const { data: categories } = await supabase
      .from("expense_categories")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("sort_order");

    // Fetch suppliers with their categories
    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("*, category:expense_categories(*)")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .is("merged_into_id", null)
      .order("name");

    // Fetch expense entries with filters
    let entriesQuery = supabase
      .from("expense_entries")
      .select("*, supplier:suppliers(id, name, account_key, category_id)")
      .eq("company_id", companyId);

    if (year) entriesQuery = entriesQuery.eq("year", parseInt(year));
    if (month) entriesQuery = entriesQuery.eq("month", parseInt(month));

    const { data: entries } = await entriesQuery.order("reference_date", {
      ascending: false,
    });

    // Fetch revenue entries
    let revenueQuery = supabase
      .from("revenue_entries")
      .select("*")
      .eq("company_id", companyId);

    if (year) revenueQuery = revenueQuery.eq("year", parseInt(year));
    if (month) revenueQuery = revenueQuery.eq("month", parseInt(month));

    const { data: revenue } = await revenueQuery.order("year").order("month");

    // Fetch uploads history
    const { data: uploads } = await supabase
      .from("expense_uploads")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      categories: categories ?? [],
      suppliers: suppliers ?? [],
      entries: entries ?? [],
      revenue: revenue ?? [],
      uploads: uploads ?? [],
    });
  } catch (err) {
    console.error("[expenses/data]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "שגיאה בשרת" },
      { status: 500 },
    );
  }
}
