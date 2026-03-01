/**
 * POST /api/accounting/suppliers/build
 * Phase 3: Build/update suppliers from transactions.
 * - Detects transit accounts (H with >10 unique names OR H contains letters)
 * - Creates/updates suppliers from counter_account (H) and description (M)
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

/** H contains non-digit → transit (e.g. "כ.א 2805", "מע\"מ") */
function hasNonDigit(h: string): boolean {
  return /[^0-9]/.test(String(h || "").trim());
}

async function fetchAllTransactionsForCompany(
  supabase: SupabaseClient,
  companyId: string,
) {
  const all: { counter_account: string | null; description: string | null; account_id: string }[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("transactions")
      .select("counter_account, description, account_id")
      .eq("company_id", companyId)
      .range(from, from + PAGE - 1);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all.push(...(data as typeof all));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return all;
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

    await request.json().catch(() => ({})); // Body: { company_id?, file_id? } — company from cookie

    const supabase = getSupabaseAdmin();

    // Fetch all company transactions
    const transactions = await fetchAllTransactionsForCompany(supabase, companyId);

    if (transactions.length === 0) {
      return NextResponse.json({
        success: true,
        transitCreated: 0,
        suppliersCreated: 0,
        suppliersUpdated: 0,
        message: "אין תנועות לעיבוד",
      });
    }

    // ── 3.1 Transit detection ─────────────────────────────────
    const hToNames = new Map<string, Set<string>>();
    for (const tx of transactions) {
      const h = (tx.counter_account || "").trim();
      if (!h) continue;
      const m = normalizeName(tx.description || "");
      if (!m) continue;
      let set = hToNames.get(h);
      if (!set) {
        set = new Set();
        hToNames.set(h, set);
      }
      set.add(m);
    }

    const { data: existingTransit } = await supabase
      .from("transit_accounts")
      .select("counter_account")
      .eq("company_id", companyId);

    const existingTransitSet = new Set(
      (existingTransit ?? []).map((r: { counter_account: string }) => r.counter_account),
    );

    let transitCreated = 0;
    if (existingTransitSet.size === 0) {
      const toInsert: { company_id: string; counter_account: string }[] = [];
      for (const [h, names] of hToNames) {
        const isTransit = hasNonDigit(h) || names.size > 10;
        if (isTransit && h) {
          toInsert.push({ company_id: companyId, counter_account: h });
        }
      }
      if (toInsert.length > 0) {
        const { error } = await supabase
          .from("transit_accounts")
          .upsert(toInsert, {
            onConflict: "company_id,counter_account",
            ignoreDuplicates: false,
          });
        if (!error) transitCreated = toInsert.length;
      }
    }

    // Re-fetch transit for supplier logic
    const { data: transitRows } = await supabase
      .from("transit_accounts")
      .select("counter_account")
      .eq("company_id", companyId);
    const transitSet = new Set(
      (transitRows ?? []).map((r: { counter_account: string }) => r.counter_account),
    );

    // ── 3.2 Build suppliers ───────────────────────────────────
    // For counter_account: need mode(M) per H
    const hToNameCounts = new Map<string, Map<string, number>>();
    const supplierRows: {
      company_id: string;
      display_name: string;
      identifier_type: "counter_account" | "name_based";
      identifier_value: string;
      is_auto_created: boolean;
      is_manually_classified: boolean;
    }[] = [];
    const supplierNamesMap = new Map<string, Map<string, number>>(); // identifier_key -> { name -> count }

    for (const tx of transactions) {
      const h = (tx.counter_account || "").trim();
      const m = normalizeName(tx.description || "");
      if (!h && !m) continue;

      if (transitSet.has(h)) {
        if (!m) continue;
        const ident = `name_based:${m}`;
        if (!supplierNamesMap.has(ident)) {
          supplierNamesMap.set(ident, new Map());
          supplierRows.push({
            company_id: companyId,
            display_name: m,
            identifier_type: "name_based",
            identifier_value: m,
            is_auto_created: true,
            is_manually_classified: false,
          });
        }
        const nm = supplierNamesMap.get(ident)!;
        nm.set(m, (nm.get(m) ?? 0) + 1);
      } else {
        if (!h) continue;
        const ident = `counter_account:${h}`;
        if (!hToNameCounts.has(h)) {
          hToNameCounts.set(h, new Map());
        }
        const nc = hToNameCounts.get(h)!;
        if (m) nc.set(m, (nc.get(m) ?? 0) + 1);
      }
    }

    // For counter_account: compute mode(M) and add to supplierRows
    for (const [h, nameCounts] of hToNameCounts) {
      if (!h) continue;
      let bestName = "";
      let bestCount = 0;
      for (const [name, count] of nameCounts) {
        if (count > bestCount) {
          bestCount = count;
          bestName = name;
        }
      }
      const displayName = bestName || h;
      const ident = `counter_account:${h}`;
      supplierRows.push({
        company_id: companyId,
        display_name: displayName,
        identifier_type: "counter_account",
        identifier_value: h,
        is_auto_created: true,
        is_manually_classified: false,
      });
      const nm = new Map<string, number>();
      for (const [name, count] of nameCounts) {
        nm.set(name, count);
      }
      supplierNamesMap.set(ident, nm);
    }

    // Add name_based supplier_names from transactions (we already collected in loop above)
    // For counter_account we have hToNameCounts - the ident for supplierRows is different
    // We need to map: supplierRows index or identifier_value -> names

    let suppliersCreated = 0;
    let suppliersUpdated = 0;

    for (const row of supplierRows) {
      const { data: existing } = await supabase
        .from("suppliers")
        .select("id, display_name")
        .eq("company_id", companyId)
        .eq("identifier_type", row.identifier_type)
        .eq("identifier_value", row.identifier_value)
        .maybeSingle();

      let supplierId: string;

      if (existing) {
        supplierId = existing.id;
        suppliersUpdated++;

        // Update display_name only if not manually overridden
        const { data: full } = await supabase
          .from("suppliers")
          .select("is_manually_classified")
          .eq("id", supplierId)
          .single();
        if (full && !full.is_manually_classified) {
          await supabase
            .from("suppliers")
            .update({ display_name: row.display_name, updated_at: new Date().toISOString() })
            .eq("id", supplierId);
        }
      } else {
        const { data: inserted, error } = await supabase
          .from("suppliers")
          .insert(row)
          .select("id")
          .single();
        if (error) continue;
        supplierId = inserted!.id;
        suppliersCreated++;
      }

      const namesMap = supplierNamesMap.get(
        `${row.identifier_type}:${row.identifier_value}`,
      );
      if (namesMap) {
        for (const [name, count] of namesMap) {
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
    }

    return NextResponse.json({
      success: true,
      transitCreated,
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
