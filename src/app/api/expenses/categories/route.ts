import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@/lib/supabase/env";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import type { ExpenseCategoryParentType } from "@/types/expenses";

const getAdmin = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    }

    const { companyId, role } = await resolveSelectedCompanyId(
      supabase,
      user.id,
    );
    if (!companyId || role !== "super_admin") {
      return NextResponse.json(
        { error: "רק מנהל ראשי יכול לנהל קטגוריות" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { name, parentType } = body as {
      name: string;
      parentType: ExpenseCategoryParentType;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "שם קטגוריה נדרש" }, { status: 400 });
    }

    const admin = getAdmin();

    const { data: maxOrder } = await admin
      .from("expense_categories")
      .select("sort_order")
      .eq("company_id", companyId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const { data, error } = await admin
      .from("expense_categories")
      .insert({
        company_id: companyId,
        name: name.trim(),
        parent_type: parentType || "operating",
        sort_order: (maxOrder?.sort_order ?? 0) + 1,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "קטגוריה עם שם זה כבר קיימת" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: `שגיאה ביצירת קטגוריה: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, category: data });
  } catch (err) {
    console.error("[expenses/categories]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "שגיאה בשרת" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    }

    const { companyId, role } = await resolveSelectedCompanyId(
      supabase,
      user.id,
    );
    if (!companyId || role !== "super_admin") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const url = new URL(request.url);
    const categoryId = url.searchParams.get("id");
    if (!categoryId) {
      return NextResponse.json({ error: "חסר מזהה קטגוריה" }, { status: 400 });
    }

    const admin = getAdmin();

    // Unlink suppliers from this category first
    await admin
      .from("suppliers")
      .update({ category_id: null })
      .eq("category_id", categoryId)
      .eq("company_id", companyId);

    const { error } = await admin
      .from("expense_categories")
      .delete()
      .eq("id", categoryId)
      .eq("company_id", companyId);

    if (error) {
      return NextResponse.json(
        { error: `שגיאה במחיקת קטגוריה: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[expenses/categories]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "שגיאה בשרת" },
      { status: 500 },
    );
  }
}
