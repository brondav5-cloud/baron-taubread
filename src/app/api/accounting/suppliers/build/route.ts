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

    const [transactions, accountMap] = await Promise.all([
      fetchAllTransactionsForCompany(supabase, companyId),
      fetchAccountsForCompany(supabase, companyId),
    ]);

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

    // Build per H: names (M) with counts, account_codes from expense txs
    const hToNameCounts = new Map<string, Map<string, number>>();
    const hToAccountCodes = new Map<string, string[]>();

    for (const tx of transactions) {
      const h = (tx.counter_account || "").trim();
      const m = normalizeName(tx.description || "");
      if (!h) continue;

      if (!hToNameCounts.has(h)) {
        hToNameCounts.set(h, new Map());
      }
      const nc = hToNameCounts.get(h)!;
      if (m) nc.set(m, (nc.get(m) ?? 0) + 1);

      const acc = accountMap.get(tx.account_id);
      if (acc && acc.account_type === "expense") {
        if (!hToAccountCodes.has(h)) hToAccountCodes.set(h, []);
        hToAccountCodes.get(h)!.push(acc.code);
      }
    }

    const supplierRows: {
      counter_account: string;
      display_name: string;
      auto_account_code: string | null;
      auto_account_name: string | null;
      namesMap: Map<string, number>;
    }[] = [];

    for (const [h, nameCounts] of Array.from(hToNameCounts.entries())) {
      if (!h) continue;

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

    let suppliersCreated = 0;
    let suppliersUpdated = 0;

    for (const row of supplierRows) {
      const { data: existing } = await supabase
        .from("suppliers")
        .select("id, display_name, auto_account_code, auto_account_name")
        .eq("company_id", companyId)
        .eq("counter_account", row.counter_account)
        .maybeSingle();

      let supplierId: string;

      if (existing) {
        supplierId = existing.id;
        suppliersUpdated++;
        await supabase
          .from("suppliers")
          .update({
            display_name: row.display_name,
            auto_account_code: row.auto_account_code,
            auto_account_name: row.auto_account_name,
            updated_at: new Date().toISOString(),
          })
          .eq("id", supplierId);
      } else {
        const { data: inserted, error } = await supabase
          .from("suppliers")
          .insert({
            company_id: companyId,
            counter_account: row.counter_account,
            display_name: row.display_name,
            auto_account_code: row.auto_account_code,
            auto_account_name: row.auto_account_name,
          })
          .select("id")
          .single();
        if (error) continue;
        supplierId = inserted!.id;
        suppliersCreated++;
      }

      for (const [name, count] of Array.from(row.namesMap.entries())) {
        const { data: existingName } = await supabase
          .from("supplier_names")
          .select("id, occurrence_count")
          .eq("supplier_id", supplierId)
          .eq("name", name)
          .maybeSingle();

        if (existingName) {
          await supabase
            .from("supplier_names")
            .update({ occurrence_count: count })
            .eq("id", existingName.id);
        } else {
          await supabase.from("supplier_names").insert({
            supplier_id: supplierId,
            name,
            occurrence_count: count,
          });
        }
      }
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
