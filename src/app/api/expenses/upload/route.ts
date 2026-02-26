import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@/lib/supabase/env";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import type { ParsedExpenseRow } from "@/types/expenses";

const getAdmin = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface UploadPayload {
  rows: ParsedExpenseRow[];
  suppliers: Array<{ name: string; accountKey: string }>;
  totals: { totalDebits: number; totalCredits: number; totalBalance: number };
  stats: { rowsCount: number; suppliersCount: number };
  fileName: string;
  periodMonth?: number;
  periodYear?: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    }

    const { companyId, role } = await resolveSelectedCompanyId(
      supabaseAuth,
      user.id,
    );
    if (!companyId || (role !== "super_admin" && role !== "admin")) {
      return NextResponse.json(
        { error: "רק מנהל ראשי יכול לגשת למודול הוצאות" },
        { status: 403 },
      );
    }

    const payload: UploadPayload = await request.json();
    const { rows, suppliers, totals, stats, fileName, periodMonth, periodYear } =
      payload;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "לא נמצאו שורות בקובץ" }, { status: 400 });
    }

    const admin = getAdmin();

    const { data: upload, error: uploadErr } = await admin
      .from("expense_uploads")
      .insert({
        company_id: companyId,
        uploaded_by: user.id,
        file_name: fileName,
        period_month: periodMonth ?? null,
        period_year: periodYear ?? null,
        rows_count: stats.rowsCount,
        suppliers_found: stats.suppliersCount,
        total_debits: totals.totalDebits,
        total_credits: totals.totalCredits,
        status: "processing",
      })
      .select()
      .single();

    if (uploadErr || !upload) {
      return NextResponse.json(
        { error: "שגיאה ביצירת רשומת העלאה" },
        { status: 500 },
      );
    }

    try {
      // Seed default categories if none exist
      const { count } = await admin
        .from("expense_categories")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId);

      if (count === 0) {
        await admin.rpc("seed_default_expense_categories", {
          p_company_id: companyId,
        });
      }

      // Upsert suppliers
      const supplierIds = new Map<string, string>();

      for (const s of suppliers) {
        const { data: existing } = await admin
          .from("suppliers")
          .select("id")
          .eq("company_id", companyId)
          .eq("account_key", s.accountKey)
          .single();

        if (existing) {
          supplierIds.set(s.accountKey, existing.id);
        } else {
          const { data: inserted } = await admin
            .from("suppliers")
            .insert({
              company_id: companyId,
              name: s.name,
              account_key: s.accountKey,
            })
            .select("id")
            .single();
          if (inserted) {
            supplierIds.set(s.accountKey, inserted.id);
          }
        }
      }

      // Insert expense entries in batches
      const BATCH_SIZE = 200;
      const entries = rows
        .map((row) => {
          const supplierId = supplierIds.get(row.accountKey);
          if (!supplierId) return null;

          let month = periodMonth ?? new Date().getMonth() + 1;
          let year = periodYear ?? new Date().getFullYear();
          if (row.referenceDate) {
            const d = new Date(row.referenceDate);
            if (!isNaN(d.getTime())) {
              month = d.getMonth() + 1;
              year = d.getFullYear();
            }
          }

          return {
            company_id: companyId,
            upload_id: upload.id,
            supplier_id: supplierId,
            account_key: row.accountKey,
            reference_date: row.referenceDate,
            details: row.details,
            credits: row.credits,
            debits: row.debits,
            balance: row.balance,
            month,
            year,
          };
        })
        .filter(Boolean);

      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        const { error: batchErr } = await admin
          .from("expense_entries")
          .insert(batch);
        if (batchErr) {
          throw new Error(`שגיאה בהכנסת רשומות (batch ${i}): ${batchErr.message}`);
        }
      }

      // Mark upload as completed
      await admin
        .from("expense_uploads")
        .update({ status: "completed" })
        .eq("id", upload.id);

      return NextResponse.json({
        ok: true,
        uploadId: upload.id,
        stats: {
          rowsInserted: entries.length,
          suppliersFound: supplierIds.size,
          totalDebits: totals.totalDebits,
          totalCredits: totals.totalCredits,
        },
      });
    } catch (err) {
      await admin
        .from("expense_uploads")
        .update({
          status: "failed",
          error_message: err instanceof Error ? err.message : "שגיאה לא ידועה",
        })
        .eq("id", upload.id);
      throw err;
    }
  } catch (err) {
    console.error("[expenses/upload]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "שגיאה בשרת" },
      { status: 500 },
    );
  }
}
