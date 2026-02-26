import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ParsedTransaction } from "@/types/accounting";

// POST /api/accounting/upload/batch
// Phase 2: Insert a chunk of transactions for an existing file record.
// Body: { fileId, transactions: ParsedTransaction[], isLast: boolean }
// Returns: { inserted, skipped }
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

    const body: {
      fileId: string;
      transactions: ParsedTransaction[];
      isLast: boolean;
    } = await request.json();

    const { fileId, transactions, isLast } = body;

    if (!fileId || !transactions) {
      return NextResponse.json({ error: "Missing fileId or transactions" }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch account code→id map for this user (only codes present in this batch)
    const codes = Array.from(new Set(transactions.map((t) => t.account_code)));
    const { data: accountRows, error: accErr } = await supabase
      .from("accounts")
      .select("id, code")
      .eq("user_id", user.id)
      .in("code", codes);

    if (accErr) {
      return NextResponse.json(
        { error: "Failed to fetch accounts: " + accErr.message },
        { status: 500 },
      );
    }

    const codeToId = new Map<string, string>();
    for (const acc of accountRows ?? []) {
      codeToId.set(acc.code as string, acc.id as string);
    }

    // Build rows
    const rows = transactions
      .map((tx) => {
        const accountId = codeToId.get(tx.account_code);
        if (!accountId) return null;
        return {
          user_id: user.id,
          file_id: fileId,
          account_id: accountId,
          group_code: tx.group_code,
          original_account_name: tx.original_account_name,
          transaction_date: tx.transaction_date,
          value_date: tx.value_date,
          debit: tx.debit,
          credit: tx.credit,
          description: tx.description,
          counter_account: tx.counter_account,
          reference_number: tx.reference_number,
          header_number: tx.header_number,
          movement_number: tx.movement_number,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    let inserted = 0;
    if (rows.length > 0) {
      const { error: txErr, data: txData } = await supabase
        .from("transactions")
        .upsert(rows, {
          onConflict:
            "user_id,account_id,header_number,movement_number,transaction_date,debit,credit",
          ignoreDuplicates: true,
        })
        .select("id");

      if (txErr) {
        console.error("Transaction batch insert error:", txErr.message);
      } else {
        inserted = txData?.length ?? rows.length;
      }
    }

    const skipped = rows.length - inserted;

    // On last batch: mark file completed + seed default groups
    if (isLast) {
      await supabase
        .from("uploaded_files")
        .update({ status: "completed" })
        .eq("id", fileId);

      const { count: groupCount } = await supabase
        .from("custom_groups")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (!groupCount || groupCount === 0) {
        await supabase.rpc("seed_default_custom_groups", { p_user_id: user.id });
      }
    }

    return NextResponse.json({ success: true, inserted, skipped });
  } catch (err) {
    console.error("Upload batch error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
