import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logError } from "@/lib/api/logger";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { MonthlyData } from "@/types/supabase";

export interface ProductStoreRow {
  store_external_id: number;
  store_uuid: string;
  store_name: string;
  store_city: string | null;
  monthly_qty: MonthlyData;
  monthly_sales: MonthlyData;
  total_qty: number;
  total_sales: number;
}

/**
 * GET /api/products/[id]/stores
 * Returns all stores selling a specific product (by external_id),
 * with product-specific monthly data from store_products table.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: productExternalId } = await params;
  if (!productExternalId) {
    return NextResponse.json({ error: "חסר מזהה מוצר" }, { status: 400 });
  }

  const numericId = parseInt(productExternalId, 10);
  if (isNaN(numericId)) {
    return NextResponse.json({ error: "מזהה מוצר לא תקין" }, { status: 400 });
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
      return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });
    }

    // Fetch store_products rows for this product + all stores in parallel
    const [spRes, storesRes] = await Promise.all([
      supabaseAdmin
        .from("store_products")
        .select(
          "store_external_id, monthly_qty, monthly_sales, total_qty, total_sales",
        )
        .eq("company_id", companyId)
        .eq("product_external_id", numericId)
        .order("total_qty", { ascending: false }),
      supabaseAdmin
        .from("stores")
        .select("id, external_id, name, city")
        .eq("company_id", companyId),
    ]);

    if (spRes.error) throw spRes.error;

    const storeMap = new Map<
      number,
      { uuid: string; name: string; city: string | null }
    >();
    if (storesRes.data) {
      for (const s of storesRes.data) {
        storeMap.set(s.external_id, { uuid: s.id, name: s.name, city: s.city });
      }
    }

    const productStores: ProductStoreRow[] = (spRes.data ?? []).map((row) => {
      const storeInfo = storeMap.get(row.store_external_id);
      return {
        store_external_id: row.store_external_id,
        store_uuid: storeInfo?.uuid ?? "",
        store_name: storeInfo?.name ?? `חנות ${row.store_external_id}`,
        store_city: storeInfo?.city ?? null,
        monthly_qty: (row.monthly_qty as MonthlyData) ?? {},
        monthly_sales: (row.monthly_sales as MonthlyData) ?? {},
        total_qty: row.total_qty ?? 0,
        total_sales: row.total_sales ?? 0,
      };
    });

    return NextResponse.json({ productStores });
  } catch (err) {
    logError("product-stores", err);
    return NextResponse.json({ error: "שגיאה בטעינת חנויות" }, { status: 500 });
  }
}
