import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

const PAGE = 5000;

/** Fetch all rows bypassing the default 1000-row limit with pagination. */
async function fetchAllTransactions(
  supabase: SupabaseClient,
  companyId: string,
  startDate: string,
  endDate: string,
  columns = "*",
) {
  const all: unknown[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("transactions")
      .select(columns)
      .eq("company_id", companyId)
      .gte("transaction_date", startDate)
      .lte("transaction_date", endDate)
      .order("transaction_date", { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return all;
}

// GET /api/accounting/data?year=2024
// Returns all data needed for the P&L dashboard for the given year.
// Also fetches previous year transactions for YoY comparison.
export async function GET(request: Request) {
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
    const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);
    const prevYear = year - 1;

    const supabase = getSupabaseAdmin();

    // Fetch metadata in parallel (no custom_groups / classifications — only at upload)
    const [
      accountsRes,
      overridesRes,
      tagsRes,
      accountTagsRes,
      counterNamesRes,
      alertRulesRes,
      filesRes,
    ] = await Promise.all([
      supabase.from("accounts").select("*").eq("company_id", companyId),
      supabase.from("transaction_overrides").select("*").eq("company_id", companyId),
      supabase.from("custom_tags").select("*").eq("company_id", companyId),
      supabase.from("account_tags").select("*"),
      supabase.from("counter_account_names").select("*").eq("company_id", companyId),
      supabase.from("alert_rules").select("*").eq("company_id", companyId),
      supabase
        .from("uploaded_files")
        .select("*")
        .eq("company_id", companyId)
        .order("year", { ascending: false }),
    ]);

    let suppliers: { id: string; counter_account: string; display_name: string; auto_account_code: string | null; auto_account_name: string | null }[] = [];
    let revenueGroups: { group_code: string }[] = [];
    let revenueAccountCodes: { account_code: string; display_name: string | null }[] = [];
    const [sRes, rRes, racRes] = await Promise.all([
      supabase.from("suppliers").select("id, counter_account, display_name, auto_account_code, auto_account_name").eq("company_id", companyId),
      supabase.from("revenue_groups").select("group_code").eq("company_id", companyId),
      supabase.from("revenue_account_codes").select("account_code, display_name").eq("company_id", companyId),
    ]);
    if (!sRes.error) suppliers = (sRes.data ?? []) as typeof suppliers;
    if (!rRes.error) revenueGroups = (rRes.data ?? []) as typeof revenueGroups;
    if (!racRes.error) revenueAccountCodes = (racRes.data ?? []) as typeof revenueAccountCodes;

    const metaErrors = [
      accountsRes, overridesRes, tagsRes, accountTagsRes, counterNamesRes, alertRulesRes, filesRes,
    ]
      .filter((r) => r.error)
      .map((r) => r.error!.message);

    if (metaErrors.length > 0) {
      return NextResponse.json({ error: metaErrors.join("; ") }, { status: 500 });
    }

    // Fetch transactions with pagination (can be 10k–50k rows)
    const [txCurrent, txPrev] = await Promise.all([
      fetchAllTransactions(supabase, companyId, `${year}-01-01`, `${year}-12-31`),
      fetchAllTransactions(
        supabase, companyId, `${prevYear}-01-01`, `${prevYear}-12-31`,
        "id, account_id, group_code, transaction_date, debit, credit",
      ),
    ]);

    return NextResponse.json({
      year,
      prevYear,
      accounts:             accountsRes.data ?? [],
      transactions:         txCurrent,
      prevTransactions:     txPrev,
      customGroups:         [],
      classificationOverrides: [],
      transactionOverrides: overridesRes.data ?? [],
      tags:                 tagsRes.data ?? [],
      accountTags:          accountTagsRes.data ?? [],
      counterNames:         counterNamesRes.data ?? [],
      alertRules:           alertRulesRes.data ?? [],
      files:                filesRes.data ?? [],
      suppliers,
      revenueGroups,
      revenueAccountCodes,
    });
  } catch (err) {
    console.error("Data API error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
