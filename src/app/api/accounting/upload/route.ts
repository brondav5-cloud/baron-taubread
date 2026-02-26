import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ParsedAccountingResult } from "@/types/accounting";

interface UploadRequestBody {
  filename: string;
  year: number;
  month: number | null;
  fileType: "yearly" | "monthly";
  parsed: ParsedAccountingResult;
}

// POST /api/accounting/upload
// Accepts pre-parsed JSON from the client (parsing happens client-side via loadXlsx).
// Body: { filename, year, month, fileType, parsed: ParsedAccountingResult }
export async function POST(request: Request) {
  try {
    const authClient = createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: UploadRequestBody = await request.json();
    const { filename, year, month, fileType, parsed } = body;

    if (!filename || !year || !parsed) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error ?? "Parse failed" }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Create uploaded_files record
    const { data: uploadRecord, error: uploadErr } = await supabase
      .from("uploaded_files")
      .insert({
        user_id: user.id,
        filename,
        year,
        month,
        file_type: fileType,
        row_count: parsed.stats.rowsCount,
        status: "processing",
      })
      .select()
      .single();

    if (uploadErr || !uploadRecord) {
      return NextResponse.json(
        { error: "Failed to create upload record: " + (uploadErr?.message ?? "unknown") },
        { status: 500 },
      );
    }

    const fileId = uploadRecord.id as string;

    // 2. Upsert accounts
    const { data: upsertedAccounts, error: accountsErr } = await supabase
      .from("accounts")
      .upsert(
        parsed.accounts.map((a) => ({
          user_id: user.id,
          code: a.code,
          name: a.name,
          latest_group_code: a.group_code,
          account_type: a.account_type,
        })),
        { onConflict: "user_id,code", ignoreDuplicates: false },
      )
      .select("id, code");

    if (accountsErr) {
      await supabase
        .from("uploaded_files")
        .update({ status: "error", error_msg: accountsErr.message })
        .eq("id", fileId);
      return NextResponse.json(
        { error: "Failed to upsert accounts: " + accountsErr.message },
        { status: 500 },
      );
    }

    // Build code → id map
    const codeToId = new Map<string, string>();
    for (const acc of upsertedAccounts ?? []) {
      codeToId.set(acc.code as string, acc.id as string);
    }

    // 3. Insert transactions in chunks
    const CHUNK_SIZE = 500;
    let inserted = 0;

    for (let i = 0; i < parsed.transactions.length; i += CHUNK_SIZE) {
      const chunk = parsed.transactions.slice(i, i + CHUNK_SIZE);
      const rows = chunk
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

      const { error: txErr } = await supabase
        .from("transactions")
        .upsert(rows, {
          onConflict:
            "user_id,account_id,header_number,movement_number,transaction_date,debit,credit",
          ignoreDuplicates: true,
        });

      if (txErr) {
        console.error("Transaction insert error (chunk):", txErr.message);
      } else {
        inserted += rows.length;
      }
    }

    const skipped = Math.max(0, parsed.stats.rowsCount - inserted);

    // 4. Mark upload completed
    await supabase
      .from("uploaded_files")
      .update({ status: "completed", row_count: inserted })
      .eq("id", fileId);

    // 5. Seed default groups on first upload
    const { count: groupCount } = await supabase
      .from("custom_groups")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (!groupCount || groupCount === 0) {
      await supabase.rpc("seed_default_custom_groups", { p_user_id: user.id });
    }

    return NextResponse.json({
      success: true,
      fileId,
      stats: {
        accountsCount: parsed.stats.accountsCount,
        rowsInserted: inserted,
        rowsSkipped: skipped,
        dateRange: parsed.stats.dateRange,
      },
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
