import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/accounting/data?year=2024&prevYear=2023
// Returns all data needed for the P&L dashboard for the given year.
// Also fetches previous year transactions (aggregated) for YoY comparison.
export async function GET(request: Request) {
  try {
    const authClient = createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);
    const prevYear = year - 1;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const uid = user.id;

    // Fetch everything in parallel
    const [
      accountsRes,
      txCurrentRes,
      txPrevRes,
      groupsRes,
      classificationsRes,
      overridesRes,
      tagsRes,
      accountTagsRes,
      counterNamesRes,
      alertRulesRes,
      filesRes,
    ] = await Promise.all([
      supabase.from("accounts").select("*").eq("user_id", uid),
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", uid)
        .gte("transaction_date", `${year}-01-01`)
        .lte("transaction_date", `${year}-12-31`),
      supabase
        .from("transactions")
        .select("id, account_id, group_code, transaction_date, debit, credit")
        .eq("user_id", uid)
        .gte("transaction_date", `${prevYear}-01-01`)
        .lte("transaction_date", `${prevYear}-12-31`),
      supabase.from("custom_groups").select("*").eq("user_id", uid).order("display_order"),
      supabase.from("account_classification_overrides").select("*").eq("user_id", uid),
      supabase.from("transaction_overrides").select("*").eq("user_id", uid),
      supabase.from("custom_tags").select("*").eq("user_id", uid),
      supabase.from("account_tags").select("*"),
      supabase.from("counter_account_names").select("*").eq("user_id", uid),
      supabase.from("alert_rules").select("*").eq("user_id", uid),
      supabase.from("uploaded_files").select("*").eq("user_id", uid).order("year", { ascending: false }),
    ]);

    // Collect errors
    const errors = [
      accountsRes, txCurrentRes, txPrevRes, groupsRes, classificationsRes,
      overridesRes, tagsRes, accountTagsRes, counterNamesRes, alertRulesRes, filesRes,
    ]
      .filter((r) => r.error)
      .map((r) => r.error!.message);

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("; ") }, { status: 500 });
    }

    return NextResponse.json({
      year,
      prevYear,
      accounts: accountsRes.data ?? [],
      transactions: txCurrentRes.data ?? [],
      prevTransactions: txPrevRes.data ?? [],
      customGroups: groupsRes.data ?? [],
      classificationOverrides: classificationsRes.data ?? [],
      transactionOverrides: overridesRes.data ?? [],
      tags: tagsRes.data ?? [],
      accountTags: accountTagsRes.data ?? [],
      counterNames: counterNamesRes.data ?? [],
      alertRules: alertRulesRes.data ?? [],
      files: filesRes.data ?? [],
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
