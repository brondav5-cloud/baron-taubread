import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@/lib/supabase/env";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

const getAdmin = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * DELETE /api/expenses/reset
 * Deletes all expense_entries and expense_uploads for the company.
 * Keeps: suppliers (with their category assignments), expense_categories, revenue_entries.
 */
export async function DELETE() {
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
        { error: "רק מנהל ראשי יכול למחוק נתונים" },
        { status: 403 },
      );
    }

    const admin = getAdmin();

    // 1. Delete all expense entries
    const { error: entriesErr } = await admin
      .from("expense_entries")
      .delete()
      .eq("company_id", companyId);

    if (entriesErr) {
      throw new Error(`שגיאה במחיקת רשומות הוצאות: ${entriesErr.message}`);
    }

    // 2. Delete all upload records
    const { error: uploadsErr } = await admin
      .from("expense_uploads")
      .delete()
      .eq("company_id", companyId);

    if (uploadsErr) {
      throw new Error(`שגיאה במחיקת רשומות העלאה: ${uploadsErr.message}`);
    }

    return NextResponse.json({
      ok: true,
      message: "כל נתוני ההוצאות נמחקו בהצלחה",
    });
  } catch (err) {
    console.error("[expenses/reset]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "שגיאה בשרת" },
      { status: 500 },
    );
  }
}
