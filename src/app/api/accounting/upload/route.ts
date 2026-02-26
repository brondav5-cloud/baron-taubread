import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ParsedAccount } from "@/types/accounting";

// POST /api/accounting/upload
// Phase 1: Create file record + upsert accounts.
// Body: { filename, year, month, fileType, accounts, totalTransactions }
// Returns: { fileId }
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
      filename: string;
      year: number;
      month: number | null;
      fileType: "yearly" | "monthly";
      accounts: ParsedAccount[];
      totalTransactions: number;
    } = await request.json();

    const { filename, year, month, fileType, accounts, totalTransactions } = body;

    if (!filename || !year || !accounts) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
        row_count: totalTransactions,
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
    const { error: accountsErr } = await supabase.from("accounts").upsert(
      accounts.map((a) => ({
        user_id: user.id,
        code: a.code,
        name: a.name,
        latest_group_code: a.group_code,
        account_type: a.account_type,
      })),
      { onConflict: "user_id,code", ignoreDuplicates: false },
    );

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

    return NextResponse.json({ success: true, fileId });
  } catch (err) {
    console.error("Upload phase-1 error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
