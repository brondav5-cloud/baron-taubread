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

type DistRow = {
  store_external_id: number;
  store_name: string;
  year: number;
  month: number;
  net_qty: number | string;
  total_value: number | string;
};

type StoreProductsDbRow = {
  store_external_id: number;
  monthly_qty: MonthlyData | null;
  monthly_sales: MonthlyData | null;
  total_qty: number | null;
  total_sales: number | null;
};

async function fetchAllDistRows(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  companyId: string,
  normalizedName: string,
): Promise<DistRow[]> {
  const pageSize = 1000;
  const all: DistRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from("store_product_monthly_dist")
      .select(
        "store_external_id, store_name, year, month, net_qty, total_value",
      )
      .eq("company_id", companyId)
      .eq("product_name_normalized", normalizedName)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const rows = (data ?? []) as DistRow[];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

function aggregateDistToStores(rows: DistRow[]): ProductStoreRow[] {
  const map = new Map<number, ProductStoreRow>();
  for (const row of rows) {
    const ym = `${row.year}${String(row.month).padStart(2, "0")}`;
    const qty = Number(row.net_qty) || 0;
    const sales = Number(row.total_value) || 0;
    let entry = map.get(row.store_external_id);
    if (!entry) {
      entry = {
        store_external_id: row.store_external_id,
        store_uuid: "",
        store_name: row.store_name,
        store_city: null,
        monthly_qty: {},
        monthly_sales: {},
        total_qty: 0,
        total_sales: 0,
      };
      map.set(row.store_external_id, entry);
    }
    entry.monthly_qty[ym] = (entry.monthly_qty[ym] ?? 0) + qty;
    entry.monthly_sales[ym] = (entry.monthly_sales[ym] ?? 0) + sales;
    entry.total_qty += qty;
    entry.total_sales += sales;
  }
  return Array.from(map.values()).sort((a, b) => b.total_qty - a.total_qty);
}

function mapStoreProductRows(
  rows: StoreProductsDbRow[],
  storeMap: Map<number, { uuid: string; name: string; city: string | null }>,
): ProductStoreRow[] {
  return rows.map((row) => {
    const storeInfo = storeMap.get(row.store_external_id);
    return {
      store_external_id: row.store_external_id,
      store_uuid: storeInfo?.uuid ?? "",
      store_name: storeInfo?.name ?? `חנות ${row.store_external_id}`,
      store_city: storeInfo?.city ?? null,
      monthly_qty: row.monthly_qty ?? {},
      monthly_sales: row.monthly_sales ?? {},
      total_qty: row.total_qty ?? 0,
      total_sales: row.total_sales ?? 0,
    };
  });
}

/**
 * GET /api/products/[id]/stores
 * Returns all stores selling a specific product (by external_id).
 * Prefers store_product_monthly_dist (ERP/catalog source of truth);
 * falls back to store_products from Excel upload.
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

    const [productRes, storesRes] = await Promise.all([
      supabaseAdmin
        .from("products")
        .select("external_id, name")
        .eq("company_id", companyId)
        .eq("external_id", numericId)
        .maybeSingle(),
      supabaseAdmin
        .from("stores")
        .select("id, external_id, name, city")
        .eq("company_id", companyId),
    ]);

    if (productRes.error) throw productRes.error;

    const storeMap = new Map<
      number,
      { uuid: string; name: string; city: string | null }
    >();
    if (storesRes.data) {
      for (const s of storesRes.data) {
        storeMap.set(s.external_id, { uuid: s.id, name: s.name, city: s.city });
      }
    }

    let productStores: ProductStoreRow[] = [];

    if (productRes.data?.name) {
      const distRows = await fetchAllDistRows(
        supabaseAdmin,
        companyId,
        productRes.data.name.trim().toLowerCase(),
      );
      if (distRows.length > 0) {
        productStores = aggregateDistToStores(distRows).map((row) => {
          const storeInfo = storeMap.get(row.store_external_id);
          return {
            ...row,
            store_uuid: storeInfo?.uuid ?? row.store_uuid,
            store_name: storeInfo?.name ?? row.store_name,
            store_city: storeInfo?.city ?? null,
          };
        });
      }
    }

    if (productStores.length === 0) {
      const spRes = await supabaseAdmin
        .from("store_products")
        .select(
          "store_external_id, monthly_qty, monthly_sales, total_qty, total_sales",
        )
        .eq("company_id", companyId)
        .eq("product_external_id", numericId)
        .order("total_qty", { ascending: false });

      if (spRes.error) throw spRes.error;
      productStores = mapStoreProductRows(
        (spRes.data ?? []) as StoreProductsDbRow[],
        storeMap,
      );
    }

    return NextResponse.json({ productStores });
  } catch (err) {
    logError("product-stores", err);
    return NextResponse.json({ error: "שגיאה בטעינת חנויות" }, { status: 500 });
  }
}
