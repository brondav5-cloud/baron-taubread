/**
 * POST /api/accounting/suppliers/build
 * Phase 3: Build/update suppliers from transactions (schema v2).
 * - H (counter_account) only — no transit_accounts
 * - display_name = mode(M), auto_account_code/name from expense ledger
 *
 * normalize(M) = trim().replace(/\s+/g, ' ')
 */
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

const PAGE = 5000;

function normalizeName(m: string): string {
  return (m || "").trim().replace(/\s+/g, " ");
}

type TxRow = {
  counter_account: string | null;
  description: string | null;
  account_id: string;
};

type AccountRow = { id: string; code: string; name: string; account_type: string };

async function fetchAllTransactionsForCompany(
  supabase: SupabaseClient,
  companyId: string,
): Promise<TxRow[]> {
  const all: TxRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("transactions")
      .select("counter_account, description, account_id")
      .eq("company_id", companyId)
      .range(from, from + PAGE - 1);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all.push(...(data as TxRow[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return all;
}

async function fetchAccountsForCompany(
  supabase: SupabaseClient,
  companyId: string,
): Promise<Map<string, AccountRow>> {
  const map = new Map<string, AccountRow>();
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("accounts")
      .select("id, code, name, account_type")
      .eq("company_id", companyId)
      .range(from, from + PAGE - 1);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    for (const row of data as AccountRow[]) {
      map.set(row.id, row);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return map;
}

/** Mode of array elements (most frequent). */
function mode<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  const counts = new Map<T, number>();
  for (const x of arr) {
    counts.set(x, (counts.get(x) ?? 0) + 1);
  }
  let best: T | null = null;
  let bestCount = 0;
  for (const [k, c] of Array.from(counts.entries())) {
    if (c > bestCount) {
      bestCount = c;
      best = k;
    }
  }
  return best;
}

export async function POST(request: Request) {
  try {
    const authClient = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId } = await resolveSelectedCompanyId(authClient, user.id);
    if (!companyId) {
      return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });
    }

    await request.json().catch(() => ({}));

    const supabase = getSupabaseAdmin();

    const [transactions, accountMap, revenueCAResult] = await Promise.all([
      fetchAllTransactionsForCompany(supabase, companyId),
      fetchAccountsForCompany(supabase, companyId),
      supabase.from("revenue_counter_accounts").select("counter_account").eq("company_id", companyId),
    ]);

    const customerHSet = new Set<string>(
      (revenueCAResult.data ?? []).map((r) => (r as { counter_account: string }).counter_account),
    );

    const codeToAccount = new Map<string, AccountRow>();
    for (const a of Array.from(accountMap.values())) {
      codeToAccount.set(a.code, a);
    }

    if (transactions.length === 0) {
      return NextResponse.json({
        success: true,
        suppliersCreated: 0,
        suppliersUpdated: 0,
        message: "אין תנועות לעיבוד",
      });
    }

    // Build per H: names (M) with counts, account_codes from expense txs only
    // Only create suppliers for H that appear in expense transactions (exclude revenue-only = customers)
    const hToNameCounts = new Map<string, Map<string, number>>();
    const hToAccountCodes = new Map<string, string[]>();
    const hHasExpense = new Set<string>();

    for (const tx of transactions) {
      const h = (tx.counter_account || "").trim();
      const m = normalizeName(tx.description || "");
      if (!h) continue;

      const acc = accountMap.get(tx.account_id);
      if (acc && acc.account_type === "expense") {
        hHasExpense.add(h);
        if (!hToAccountCodes.has(h)) hToAccountCodes.set(h, []);
        hToAccountCodes.get(h)!.push(acc.code);
      }

      if (!hToNameCounts.has(h)) {
        hToNameCounts.set(h, new Map());
      }
      const nc = hToNameCounts.get(h)!;
      if (m) nc.set(m, (nc.get(m) ?? 0) + 1);
    }

    const supplierRows: {
      counter_account: string;
      display_name: string;
      auto_account_code: string | null;
      auto_account_name: string | null;
      namesMap: Map<string, number>;
    }[] = [];

    for (const [h, nameCounts] of Array.from(hToNameCounts.entries())) {
      if (!h || !hHasExpense.has(h) || customerHSet.has(h)) continue;

      let bestName = "";
      let bestCount = 0;
      for (const [name, count] of Array.from(nameCounts.entries())) {
        if (count > bestCount) {
          bestCount = count;
          bestName = name;
        }
      }
      const displayName = bestName || h;

      const codes = hToAccountCodes.get(h) ?? [];
      const autoCode = mode(codes);
      const accName = autoCode ? codeToAccount.get(autoCode)?.name ?? null : null;

      supplierRows.push({
        counter_account: h,
        display_name: displayName,
        auto_account_code: autoCode,
        auto_account_name: accName,
        namesMap: nameCounts,
      });
    }

    // Fetch existing suppliers in one query
    const { data: existingSuppliers } = await supabase
      .from("suppliers")
      .select("id, counter_account")
      .eq("company_id", companyId);
    const existingByH = new Map<string, { id: string }>();
    const toRemove: string[] = [];
    for (const s of existingSuppliers ?? []) {
      const isCustomer = customerHSet.has(s.counter_account);
      const hasExpense = hHasExpense.has(s.counter_account);
      if (!hasExpense || isCustomer) {
        toRemove.push(s.id);
      } else {
        existingByH.set(s.counter_account, { id: s.id });
      }
    }
    if (toRemove.length > 0) {
      await supabase.from("suppliers").delete().in("id", toRemove);
    }

    const now = new Date().toISOString();
    const toUpsert = supplierRows.map((row) => ({
      company_id: companyId,
      counter_account: row.counter_account,
      display_name: row.display_name,
      auto_account_code: row.auto_account_code,
      auto_account_name: row.auto_account_name,
      updated_at: now,
    }));

    // Batch upsert suppliers (chunks of 100)
    const BATCH = 100;
    const supplierIdByH = new Map<string, string>();
    let suppliersCreated = 0;
    let suppliersUpdated = 0;

    for (let i = 0; i < toUpsert.length; i += BATCH) {
      const chunk = toUpsert.slice(i, i + BATCH);
      const { data: upserted, error } = await supabase
        .from("suppliers")
        .upsert(chunk, {
          onConflict: "company_id,counter_account",
          ignoreDuplicates: false,
        })
        .select("id, counter_account");

      if (!error && upserted) {
        for (const s of upserted) {
          supplierIdByH.set(s.counter_account, s.id);
        }
      }
    }
    suppliersCreated = supplierRows.filter((r) => !existingByH.has(r.counter_account)).length;
    suppliersUpdated = supplierRows.filter((r) => existingByH.has(r.counter_account)).length;

    // Batch upsert supplier_names (collect all rows, then upsert in chunks)
    type NameRow = { supplier_id: string; name: string; occurrence_count: number };
    const allNames: NameRow[] = [];
    for (const row of supplierRows) {
      const sid = supplierIdByH.get(row.counter_account);
      if (!sid) continue;
      for (const [name, count] of Array.from(row.namesMap.entries())) {
        allNames.push({ supplier_id: sid, name, occurrence_count: count });
      }
    }

    const NAME_BATCH = 200;
    for (let i = 0; i < allNames.length; i += NAME_BATCH) {
      const chunk = allNames.slice(i, i + NAME_BATCH);
      await supabase
        .from("supplier_names")
        .upsert(chunk, {
          onConflict: "supplier_id,name",
          ignoreDuplicates: false,
        });
    }

    return NextResponse.json({
      success: true,
      suppliersCreated,
      suppliersUpdated,
      transactionsProcessed: transactions.length,
    });
  } catch (err) {
    console.error("Suppliers build error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
