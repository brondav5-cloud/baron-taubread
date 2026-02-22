import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logError } from "@/lib/api/logger";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@/lib/supabase/env";
import type { MonthlyData } from "@/types/supabase";

function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * GET /api/stores/[id]/products
 * Returns store products (מוכר) and missing products (לא מוכר) for a store.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: storeId } = await params;
  if (!storeId) {
    return NextResponse.json({ error: "חסר מזהה חנות" }, { status: 400 });
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(storeId)) {
    return NextResponse.json({ error: "מזהה חנות לא תקין" }, { status: 400 });
  }

  const supabaseAuth = createServerSupabaseClient();
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    }

    const { companyId } = await resolveSelectedCompanyId(supabaseAuth, user.id);
    if (!companyId) {
      return NextResponse.json(
        { error: "יש לבחור חברה" },
        { status: 403 },
      );
    }

    // 2) Load store by UUID, validate company_id
    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("id, external_id, company_id")
      .eq("id", storeId)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ error: "החנות לא נמצאה" }, { status: 404 });
    }

    if (store.company_id !== companyId) {
      return NextResponse.json({ error: "החנות לא נמצאה" }, { status: 404 });
    }

    const externalId = String(store.external_id);

    // 3) Fetch store_products + all products in parallel
    const [spRes, allProdRes] = await Promise.all([
      supabaseAdmin
        .from("store_products")
        .select(
          "product_external_id, product_name, product_category, monthly_qty, monthly_sales, total_qty, total_sales",
        )
        .eq("company_id", companyId)
        .eq("store_external_id", externalId)
        .order("total_qty", { ascending: false }),
      supabaseAdmin
        .from("products")
        .select("external_id, name, category, metrics")
        .eq("company_id", companyId),
    ]);

    const storeProducts = (spRes.data || []) as Array<{
      product_external_id: number;
      product_name: string;
      product_category: string;
      monthly_qty: MonthlyData;
      monthly_sales: MonthlyData;
      total_qty: number;
      total_sales: number;
    }>;

    let missingProducts: Array<{
      external_id: number;
      name: string;
      category: string | null;
      total_qty_global: number;
    }> = [];

    if (!allProdRes.error && allProdRes.data) {
      const soldIds = new Set(storeProducts.map((p) => p.product_external_id));
      missingProducts = allProdRes.data
        .filter((p) => !soldIds.has(p.external_id))
        .map((p) => ({
          external_id: p.external_id,
          name: p.name,
          category: p.category,
          total_qty_global:
            (p.metrics as Record<string, number>)?.qty_current_year ?? 0,
        }))
        .sort((a, b) => b.total_qty_global - a.total_qty_global);
    }

    return NextResponse.json({
      storeProducts,
      missingProducts,
    });
  } catch (err) {
    logError("stores-products", err);
    return NextResponse.json({ error: "שגיאה בטעינת מוצרים" }, { status: 500 });
  }
}
