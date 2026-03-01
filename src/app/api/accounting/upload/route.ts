import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
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

    const { companyId } = await resolveSelectedCompanyId(authClient, user.id);
    if (!companyId) {
      return NextResponse.json({ error: "יש לבחור חברה להעלאת נתונים" }, { status: 403 });
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

    const supabase = getSupabaseAdmin();

    // 1. Create uploaded_files record
    const { data: uploadRecord, error: uploadErr } = await supabase
      .from("uploaded_files")
      .insert({
        company_id: companyId,
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

    // 2. Upsert accounts — split into new vs existing to avoid overwriting account_type
    // account_type is determined once when an account is first created.
    // Uploading a new file (e.g. 2025) must NOT change account_type for existing accounts.
    const { data: existingAccounts } = await supabase
      .from("accounts")
      .select("code")
      .eq("company_id", companyId);

    const existingCodes = new Set((existingAccounts ?? []).map((a: { code: string }) => a.code));
    const newAccounts = accounts.filter((a) => !existingCodes.has(a.code));
    const updatedAccounts = accounts.filter((a) => existingCodes.has(a.code));

    // Insert brand-new accounts (with account_type)
    if (newAccounts.length > 0) {
      const { error: insertErr } = await supabase.from("accounts").insert(
        newAccounts.map((a) => ({
          company_id: companyId,
          user_id: user.id,
          code: a.code,
          name: a.name,
          latest_group_code: a.group_code,
          account_type: a.account_type,
        })),
      );
      if (insertErr) {
        await supabase.from("uploaded_files").update({ status: "error", error_msg: insertErr.message }).eq("id", fileId);
        return NextResponse.json({ error: "Failed to insert new accounts: " + insertErr.message }, { status: 500 });
      }
    }

    // Update existing accounts — name and group_code only, NEVER account_type
    for (const a of updatedAccounts) {
      await supabase
        .from("accounts")
        .update({ name: a.name, latest_group_code: a.group_code })
        .eq("company_id", companyId)
        .eq("code", a.code);
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
