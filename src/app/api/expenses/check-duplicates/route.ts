import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

/**
 * GET /api/expenses/check-duplicates?months=2024-01,2024-02,2025-12
 *
 * Checks which of the given year-month combinations already have
 * expense entries in the DB for this company.
 *
 * Returns:
 *   { hasDuplicates: boolean, existingMonths: string[] }
 *   e.g. { hasDuplicates: true, existingMonths: ["01/2024", "12/2025"] }
 */
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

    const { companyId } = await resolveSelectedCompanyId(supabase, user.id);
    if (!companyId) {
      return NextResponse.json({ error: "חברה לא נמצאה" }, { status: 403 });
    }

    // months param: "2024-01,2024-02,2025-12"
    const monthsParam = new URL(request.url).searchParams.get("months") ?? "";
    const monthsList = monthsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (monthsList.length === 0) {
      return NextResponse.json({ hasDuplicates: false, existingMonths: [] });
    }

    // Parse into (year, month) pairs
    const pairs = monthsList
      .map((s) => {
        const [y, m] = s.split("-");
        const year = parseInt(y ?? "", 10);
        const month = parseInt(m ?? "", 10);
        return { year, month, label: `${String(month).padStart(2, "0")}/${year}` };
      })
      .filter((p) => !isNaN(p.year) && !isNaN(p.month));

    if (pairs.length === 0) {
      return NextResponse.json({ hasDuplicates: false, existingMonths: [] });
    }

    // For each (year, month) check if expense_entries exist
    const existingMonths: string[] = [];

    for (const { year, month, label } of pairs) {
      const { count } = await supabase
        .from("expense_entries")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("year", year)
        .eq("month", month);

      if ((count ?? 0) > 0) {
        existingMonths.push(label);
      }
    }

    return NextResponse.json({
      hasDuplicates: existingMonths.length > 0,
      existingMonths,
    });
  } catch (err) {
    console.error("[expenses/check-duplicates]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "שגיאה בשרת" },
      { status: 500 },
    );
  }
}
