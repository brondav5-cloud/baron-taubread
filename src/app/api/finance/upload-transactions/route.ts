import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIdentifier } from "@/lib/api/rateLimit";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { logError } from "@/lib/api/logger";
import type { ParsedBankTransaction, SourceBank } from "@/modules/finance/types";

const MAX_TRANSACTIONS = 5_000;

/**
 * Extracts a supplier/payee name from the bank transaction details field.
 * Handles patterns like:
 *   "העברה אל: הפניקס פנסיה 000678680..."   → "הפניקס פנסיה"
 *   "העברה אל: 000181777 DAVID BRON..."      → "DAVID BRON"
 *   "העברה מ: ליאור כבנו 827-026560037..."   → "ליאור כבנו"
 * Account-number tokens (digits / digits-with-dashes) are skipped whether
 * they appear before or after the name.
 */
function extractSupplierFromDetails(details: string): string | null {
  if (!details) return null;
  const m = details.match(/^העברה\s+(?:אל|מ)[:\s]+(.+)/);
  if (!m) return null;
  const words = m[1]!.trim().split(/\s+/);
  // A token is an "account number" if it consists solely of digits and dashes
  const isAccountToken = (w: string) => /^[\d\-]+$/.test(w);
  const nameWords: string[] = [];
  let foundName = false;
  for (const word of words) {
    if (isAccountToken(word)) {
      if (foundName) break; // trailing account number → done
      continue;             // leading account number → skip
    }
    foundName = true;
    nameWords.push(word);
  }
  return nameWords.length > 0 ? nameWords.join(" ") : null;
}

interface UploadRequest {
  bank: SourceBank;
  account_number: string;
  display_name?: string;
  file_name: string;
  file_hash?: string;
  date_from?: string;
  date_to?: string;
  transactions: ParsedBankTransaction[];
}

export async function POST(request: NextRequest) {
  try {
    // ── Rate limit ────────────────────────────────────────────────────────────
    const clientId = getClientIdentifier(request);
    const rate = checkRateLimit(`finance-upload:${clientId}`, 10, 60_000);
    if (!rate.ok) {
      return NextResponse.json(
        { error: "יותר מדי העלאות. נסה שוב בעוד דקה." },
        { status: 429 }
      );
    }

    // ── Auth ──────────────────────────────────────────────────────────────────
    const supabaseAuth = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
    }

    const { companyId: company_id } = await resolveSelectedCompanyId(supabaseAuth, user.id);
    if (!company_id) {
      return NextResponse.json({ error: "לא נבחרה חברה" }, { status: 400 });
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    let body: UploadRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "גוף הבקשה אינו JSON תקין" }, { status: 400 });
    }

    const { bank, account_number, display_name, file_name, file_hash, date_from, date_to, transactions } =
      body;

    if (!bank || !account_number || !file_name || !Array.isArray(transactions)) {
      return NextResponse.json(
        { error: "שדות חובה חסרים: bank, account_number, file_name, transactions" },
        { status: 400 }
      );
    }

    if (!["leumi", "hapoalim", "mizrahi"].includes(bank)) {
      return NextResponse.json({ error: `ערך bank לא תקין: ${bank}` }, { status: 400 });
    }

    if (transactions.length === 0) {
      return NextResponse.json({ error: "הקובץ לא מכיל תנועות" }, { status: 400 });
    }

    if (transactions.length > MAX_TRANSACTIONS) {
      return NextResponse.json(
        { error: `יותר מדי שורות: מקסימום ${MAX_TRANSACTIONS}` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // ── Find or create bank_account ───────────────────────────────────────────
    // Use select-then-insert instead of upsert to avoid PostgREST constraint issues
    let bank_account_id: string;
    {
      const { data: existing } = await supabase
        .from("bank_accounts")
        .select("id")
        .eq("company_id", company_id)
        .eq("bank", bank)
        .eq("account_number", account_number)
        .maybeSingle();

      if (existing?.id) {
        bank_account_id = existing.id;
      } else {
        const { data: created, error: createErr } = await supabase
          .from("bank_accounts")
          .insert({
            company_id,
            bank,
            account_number,
            display_name: display_name || `${bank} ${account_number}`,
          })
          .select("id")
          .single();

        if (createErr || !created) {
          logError("finance/upload-transactions: insert bank_account", createErr);
          return NextResponse.json(
            { error: `שגיאה ביצירת חשבון בנק: ${createErr?.message ?? "unknown"}` },
            { status: 500 }
          );
        }
        bank_account_id = created.id;
      }
    }

    // ── Create uploaded file record ───────────────────────────────────────────
    const { data: fileRow, error: fileError } = await supabase
      .from("bank_uploaded_files")
      .insert({
        company_id,
        bank_account_id,
        file_name,
        file_hash: file_hash || null,
        file_format: `${bank}_${bank === "hapoalim" ? "xlsx" : bank === "leumi" ? "csv" : "xls"}`,
        date_from: date_from || null,
        date_to: date_to || null,
        row_count: transactions.length,
        uploaded_by: user.id,
      })
      .select("id")
      .single();

    if (fileError || !fileRow) {
      const dbError = fileError as {
        message?: string;
        code?: string;
        details?: string;
        hint?: string;
      } | null;

      logError("finance/upload-transactions: insert file record", fileError, {
        code: dbError?.code,
        details: dbError?.details,
        hint: dbError?.hint,
      });

      return NextResponse.json(
        {
          error: "שגיאה ברישום הקובץ",
          ...(process.env.NODE_ENV !== "production"
            ? {
                debug: {
                  message: dbError?.message ?? null,
                  code: dbError?.code ?? null,
                  details: dbError?.details ?? null,
                  hint: dbError?.hint ?? null,
                },
              }
            : {}),
        },
        { status: 500 }
      );
    }

    const uploaded_file_id: string = fileRow.id;

    // ── Build insert rows ─────────────────────────────────────────────────────
    const rows = transactions.map((tx) => ({
      company_id,
      bank_account_id,
      uploaded_file_id,
      date: tx.date,
      description: tx.description ?? "",
      details: tx.details ?? "",
      reference: tx.reference ?? "",
      debit: tx.debit ?? 0,
      credit: tx.credit ?? 0,
      balance: tx.balance ?? null,
      operation_code: tx.operation_code || null,
      batch_code: tx.batch_code || null,
      notes: tx.notes || null,
      source_bank: bank,
      raw_row: tx.raw_row ?? {},
      supplier_name: extractSupplierFromDetails(tx.details ?? ""),
    }));

    // ── Insert with dedup handling ────────────────────────────────────────────
    // Strategy: try batch insert first; if there are unique violations,
    // fall back to individual inserts and count skipped duplicates.

    const BATCH_SIZE = 500;
    let inserted = 0;
    let skipped = 0;
    const insertErrors: string[] = [];

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      const { error: batchError, count } = await supabase
        .from("bank_transactions")
        .insert(batch, { count: "exact" });

      if (!batchError) {
        inserted += count ?? batch.length;
        continue;
      }

      // Unique constraint violation (23505) — fall back to row-by-row
      if (batchError.code === "23505") {
        for (const row of batch) {
          const { error: rowError } = await supabase
            .from("bank_transactions")
            .insert(row);

          if (!rowError) {
            inserted++;
          } else if (rowError.code === "23505") {
            skipped++;
          } else {
            insertErrors.push(`${row.date} / ${row.reference}: ${rowError.message}`);
          }
        }
      } else {
        logError("finance/upload-transactions: batch insert", batchError);
        insertErrors.push(`שגיאת batch ${i}–${i + batch.length}: ${batchError.message}`);
      }
    }

    // If nothing was inserted and there were errors, remove the orphan file record
    if (inserted === 0 && rows.length > 0 && insertErrors.length > 0) {
      await supabase.from("bank_uploaded_files").delete().eq("id", uploaded_file_id);
      return NextResponse.json(
        { error: "הכנסת שורות נכשלה לחלוטין", details: insertErrors },
        { status: 500 }
      );
    }

    // Update actual inserted count on file record
    await supabase
      .from("bank_uploaded_files")
      .update({ row_count: inserted })
      .eq("id", uploaded_file_id);

    // ── Auto-match checks registry ────────────────────────────────────────────
    // If any checks are registered for this company, try to resolve check
    // transactions (reference = check_number, debit = amount) → supplier_name.
    let matched = 0;
    if (inserted > 0) {
      const { data: matchData, error: matchErr } = await supabase
        .rpc("match_checks_registry", { p_company_id: company_id });

      if (!matchErr && typeof matchData === "number") {
        matched = matchData;
      } else if (matchErr) {
        logError("finance/upload-transactions: match_checks_registry", matchErr);
      }
    }

    return NextResponse.json({
      ok: true,
      file_id: uploaded_file_id,
      bank_account_id,
      inserted,
      skipped,
      matched,
      errors: insertErrors,
    });
  } catch (err) {
    logError("finance/upload-transactions: unhandled", err);
    return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
  }
}
