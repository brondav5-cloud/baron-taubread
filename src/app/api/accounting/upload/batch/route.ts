import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
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

    const supabase = getSupabaseAdmin();

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
    let skipped = 0;

    if (rows.length > 0) {
      const { error: txErr, data: txData } = await supabase
        .from("transactions")
        .insert(rows)
        .select("id");

      if (txErr) {
        // Duplicate constraint violation (code 23505) on re-upload — skip gracefully
        if (txErr.code === "23505") {
          skipped = rows.length;
        } else {
          return NextResponse.json(
            { error: "שגיאת שמירת תנועות: " + txErr.message },
            { status: 500 },
          );
        }
      } else {
        inserted = txData?.length ?? rows.length;
      }
    }

    skipped += rows.length - inserted;

    // On last batch: mark file completed + seed default groups
    if (isLast) {
      // Count actual inserted transactions for this file
      const { count: actualCount } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("file_id", fileId);

      await supabase
        .from("uploaded_files")
        .update({ status: "completed", row_count: actualCount ?? inserted })
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
