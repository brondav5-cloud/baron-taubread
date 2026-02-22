import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@/lib/supabase/env";
import type { MonthlyData, DbStore, DbProduct } from "@/types/supabase";

const MAX_BODY_BYTES = 4 * 1024 * 1024;

const getSupabaseAdmin = () =>
  createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
import {
  calculateStoreMetrics,
  calculateProductMetrics,
} from "@/lib/excelProcessor";
import { mergePeriodLists } from "@/lib/periodUtils";
import {
  validateMonthlyMap,
  computeTotals,
  normalizeAndValidateStoreProductRow,
} from "@/lib/storeProducts/normalize";
import { getStoreProductsByCompany } from "@/lib/db/storeProducts.repo";
import {
  normalizeMonth,
  normalizeMonthsDetected,
  mergeMonthlyData,
} from "./mergeUtils";
import type { UploadPayload } from "./types";
import { readJsonWithLimit } from "@/lib/api/readJsonWithLimit";
import { checkRateLimit, getClientIdentifier } from "@/lib/api/rateLimit";
import { logError } from "@/lib/api/logger";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

const PAYLOAD_TOO_LARGE_MSG = {
  error: "גודל הבקשה חורג מהמותר (4MB). נסה קובץ קטן יותר.",
};

const UPLOAD_RATE_LIMIT = { max: 5, windowMs: 60_000 };

export async function POST(request: NextRequest) {
  try {
    const id = getClientIdentifier(request);
    const rate = checkRateLimit(
      `upload:${id}`,
      UPLOAD_RATE_LIMIT.max,
      UPLOAD_RATE_LIMIT.windowMs,
    );
    if (!rate.ok) {
      return NextResponse.json(
        { error: "יותר מדי העלאות. נסה שוב בעוד דקה." },
        {
          status: 429,
          headers: rate.retryAfter
            ? { "Retry-After": String(rate.retryAfter) }
            : undefined,
        },
      );
    }

    const contentLength = request.headers.get("content-length");
    if (contentLength) {
      const len = parseInt(contentLength, 10);
      if (!Number.isNaN(len) && len > MAX_BODY_BYTES) {
        return NextResponse.json(PAYLOAD_TOO_LARGE_MSG, { status: 413 });
      }
    }

    const startTime = Date.now();
    const supabaseAdmin = getSupabaseAdmin();
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
    if (!companyId) {
      return NextResponse.json(
        { error: "יש לבחור חברה להעלאת נתונים" },
        { status: 403 },
      );
    }
    const allowedUploadRoles = ["admin", "super_admin", "editor"];
    if (!role || !allowedUploadRoles.includes(role)) {
      return NextResponse.json(
        { error: "רק עורכים ומנהלים יכולים להעלות נתונים" },
        { status: 403 },
      );
    }

    const parseResult = await readJsonWithLimit(request, MAX_BODY_BYTES);
    if (!parseResult.ok) {
      return NextResponse.json(PAYLOAD_TOO_LARGE_MSG, { status: 413 });
    }
    const payload = parseResult.data as UploadPayload;
    const {
      filename,
      stores,
      products,
      storeProducts = [],
      filters,
      periods,
      stats,
    } = payload;

    if (!stores || !products || !periods) {
      return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
    }

    // Validate store_products before any DB writes
    let validatedStoreProducts: Array<{
      store_external_id: number;
      product_external_id: number;
      product_name: string;
      product_category: string | null;
      monthly_qty: Record<string, number>;
      monthly_sales: Record<string, number>;
    }> = [];
    if (storeProducts.length > 0) {
      const validationErrors: string[] = [];
      for (let i = 0; i < storeProducts.length; i++) {
        const sp = storeProducts[i];
        if (!sp) continue;
        const result = normalizeAndValidateStoreProductRow(sp, i);
        if (!result.ok) {
          validationErrors.push(...result.errors);
        } else {
          validatedStoreProducts.push(
            result.row as (typeof validatedStoreProducts)[0],
          );
        }
      }
      if (validationErrors.length > 0) {
        const first20 = validationErrors.slice(0, 20);
        return NextResponse.json(
          {
            ok: false,
            message: "Validation failed",
            errors: first20,
            errorsCount: validationErrors.length,
          },
          { status: 400 },
        );
      }
    }

    // 1. Create upload record
    const { data: uploadRecord, error: uploadError } = await supabaseAdmin
      .from("uploads")
      .insert({
        company_id: companyId,
        filename,
        status: "processing",
        rows_count: stats.rowsCount,
      })
      .select()
      .single();

    if (uploadError) {
      console.error("SUPABASE_ERROR", { table: "uploads", error: uploadError });
      return NextResponse.json(
        { error: "שגיאה ביצירת רשומת העלאה" },
        { status: 500 },
      );
    }

    try {
      // ============================================
      // 2. FETCH EXISTING DATA (for merging)
      // ============================================

      const { data: existingStores } = await supabaseAdmin
        .from("stores")
        .select("*")
        .eq("company_id", companyId);

      const { data: existingProducts } = await supabaseAdmin
        .from("products")
        .select("*")
        .eq("company_id", companyId);

      const { data: existingMetadata } = await supabaseAdmin
        .from("data_metadata")
        .select("*")
        .eq("company_id", companyId)
        .single();

      // Create maps for quick lookup
      const existingStoresMap = new Map<number, DbStore>();
      (existingStores || []).forEach((s) =>
        existingStoresMap.set(s.external_id, s),
      );

      const existingProductsMap = new Map<number, DbProduct>();
      (existingProducts || []).forEach((p) =>
        existingProductsMap.set(p.external_id, p),
      );

      const existingStoreProducts = await getStoreProductsByCompany(
        supabaseAdmin,
        companyId,
      );

      const existingStoreProductsMap = new Map<
        string,
        { monthly_qty: MonthlyData; monthly_sales: MonthlyData }
      >();
      existingStoreProducts.forEach((sp) => {
        const key = `${sp.store_external_id}_${sp.product_external_id}`;
        existingStoreProductsMap.set(key, {
          monthly_qty: (sp.monthly_qty as MonthlyData) || {},
          monthly_sales: (sp.monthly_sales as MonthlyData) || {},
        });
      });

      // Compute insert/update counts for summary (before any DB writes)
      const existingStoreIds = new Set(
        (existingStores || []).map((s) => s.external_id),
      );
      const existingProductIds = new Set(
        (existingProducts || []).map((p) => p.external_id),
      );
      const storesInserted = stores.filter(
        (s) => !existingStoreIds.has(s.external_id),
      ).length;
      const storesUpdated = stores.filter((s) =>
        existingStoreIds.has(s.external_id),
      ).length;
      const productsInserted = products.filter(
        (p) => !existingProductIds.has(p.external_id),
      ).length;
      const productsUpdated = products.filter((p) =>
        existingProductIds.has(p.external_id),
      ).length;

      // ============================================
      // 3. MERGE DATA (נתונים - נשארים + מתווספים)
      // ============================================

      // Merge months_list (all months for DATA tab)
      const existingMonthsList = existingMetadata?.months_list || [];
      const allMonthsList = mergePeriodLists(existingMonthsList, periods.all);

      // ============================================
      // 4. PREPARE STORE RECORDS (merged data + new metrics)
      // ============================================

      const validStores = stores.filter((store) => {
        const storeKey = Number(store.external_id);
        if (!Number.isFinite(storeKey) || storeKey <= 0) {
          console.warn("[UPLOAD] Skipping store with invalid external_id", {
            external_id: store.external_id,
            name: store.name,
          });
          return false;
        }
        return true;
      });
      const metricsMonths = allMonthsList.slice(-24);
      const lastPeriod = metricsMonths[metricsMonths.length - 1];
      const metricsCurrentYear = lastPeriod
        ? parseInt(lastPeriod.slice(0, 4), 10)
        : periods.currentYear;
      const metricsPreviousYear = metricsCurrentYear - 1;

      const storeRecords = validStores.map((store) => {
        const existing = existingStoresMap.get(store.external_id);

        // MERGE monthly data (keep existing + add new)
        const mergedMonthlyQty = mergeMonthlyData(
          existing?.monthly_qty || null,
          store.monthly_qty,
        );
        const mergedMonthlySales = mergeMonthlyData(
          existing?.monthly_sales || null,
          store.monthly_sales,
        );
        const mergedMonthlyGross = mergeMonthlyData(
          existing?.monthly_gross || null,
          store.monthly_gross,
        );
        const mergedMonthlyReturns = mergeMonthlyData(
          existing?.monthly_returns || null,
          store.monthly_returns,
        );

        // CALCULATE metrics from MERGED data + full months list (supports incremental uploads)
        const storeIdentity = {
          storeKey: store.external_id,
          storeMeta: { storeName: store.name },
        };
        const metrics = calculateStoreMetrics(
          mergedMonthlyQty,
          mergedMonthlyGross,
          mergedMonthlyReturns,
          metricsMonths.length > 0 ? metricsMonths : periods.all,
          metricsCurrentYear,
          metricsPreviousYear,
          storeIdentity,
        );

        return {
          company_id: companyId,
          external_id: store.external_id,
          name: store.name,
          city: store.city || null,
          network: store.network || null,
          driver: store.driver || null,
          agent: store.agent || null,
          // MERGED data (accumulated)
          monthly_qty: mergedMonthlyQty,
          monthly_sales: mergedMonthlySales,
          monthly_gross: mergedMonthlyGross,
          monthly_returns: mergedMonthlyReturns,
          // NEW metrics (calculated fresh)
          metrics,
        };
      });

      // ============================================
      // 5. PREPARE PRODUCT RECORDS (merged data + new metrics)
      // ============================================

      const productRecords = products.map((product) => {
        const existing = existingProductsMap.get(product.external_id);

        // MERGE monthly data
        const mergedMonthlyQty = mergeMonthlyData(
          existing?.monthly_qty || null,
          product.monthly_qty,
        );
        const mergedMonthlySales = mergeMonthlyData(
          existing?.monthly_sales || null,
          product.monthly_sales,
        );

        // CALCULATE metrics from MERGED data (supports incremental uploads)
        const metrics = calculateProductMetrics(
          mergedMonthlyQty,
          mergedMonthlySales,
          metricsMonths.length > 0 ? metricsMonths : periods.all,
          metricsCurrentYear,
          metricsPreviousYear,
        );

        return {
          company_id: companyId,
          external_id: product.external_id,
          name: product.name,
          category: product.category || null,
          monthly_qty: mergedMonthlyQty,
          monthly_sales: mergedMonthlySales,
          metrics,
        };
      });

      // ============================================
      // 6. STORE_PRODUCTS (prepare for atomic RPC)
      // ============================================
      const storeProductRecords: Array<{
        store_external_id: number;
        product_external_id: number;
        product_name: string;
        product_category: string | null;
        monthly_qty: Record<string, number>;
        monthly_sales: Record<string, number>;
        total_qty: number;
        total_sales: number;
      }> = [];
      let storeProductsUpserted = 0;

      if (validatedStoreProducts.length > 0) {
        const mergeErrors: string[] = [];

        for (const validated of validatedStoreProducts) {
          const key = `${validated.store_external_id}_${validated.product_external_id}`;
          const existing = existingStoreProductsMap.get(key);
          const mergedMonthlyQty = mergeMonthlyData(
            (existing?.monthly_qty as Record<string, number>) ?? null,
            validated.monthly_qty,
          );
          const mergedMonthlySales = mergeMonthlyData(
            (existing?.monthly_sales as Record<string, number>) ?? null,
            validated.monthly_sales,
          );

          const qtyRes = validateMonthlyMap(mergedMonthlyQty, "monthly_qty");
          const salesRes = validateMonthlyMap(
            mergedMonthlySales,
            "monthly_sales",
          );
          if (!qtyRes.ok || !salesRes.ok) {
            mergeErrors.push(
              ...(qtyRes.ok ? [] : qtyRes.errors),
              ...(salesRes.ok ? [] : salesRes.errors),
            );
            continue;
          }

          const { total_qty, total_sales } = computeTotals(
            qtyRes.value,
            salesRes.value,
          );

          storeProductRecords.push({
            store_external_id: validated.store_external_id,
            product_external_id: validated.product_external_id,
            product_name: validated.product_name,
            product_category: validated.product_category,
            monthly_qty: qtyRes.value,
            monthly_sales: salesRes.value,
            total_qty,
            total_sales,
          });
        }

        if (mergeErrors.length > 0) {
          const first20 = mergeErrors.slice(0, 20);
          return NextResponse.json(
            {
              ok: false,
              message: "Validation failed",
              errors: first20,
              errorsCount: mergeErrors.length,
            },
            { status: 400 },
          );
        }

        storeProductsUpserted = storeProductRecords.length;
      }

      // ============================================
      // 6b. ATOMIC UPLOAD (stores + products + store_products in one transaction)
      // ============================================
      const { error: rpcError } = await supabaseAdmin.rpc(
        "perform_company_data_upload",
        {
          p_company_id: companyId,
          p_stores: storeRecords,
          p_products: productRecords,
          p_store_products: storeProductRecords,
        },
      );

      if (rpcError) {
        console.error("SUPABASE_ERROR", {
          rpc: "perform_company_data_upload",
          error: rpcError,
        });
        throw new Error(`שגיאה בשמירת הנתונים: ${rpcError.message}`);
      }

      // ============================================
      // 7. UPDATE METADATA (both data and metrics periods)
      // ============================================

      const sortedMonths = [...allMonthsList].sort();
      const metricsPeriodStart =
        metricsMonths[0] || sortedMonths[0] || periods.start;
      const metricsPeriodEnd =
        metricsMonths[metricsMonths.length - 1] ||
        sortedMonths[sortedMonths.length - 1] ||
        periods.end;

      const now = new Date().toISOString();
      const { error: metadataError } = await supabaseAdmin
        .from("data_metadata")
        .upsert(
          {
            company_id: companyId,
            current_year: periods.currentYear,
            previous_year: periods.previousYear,
            period_start: sortedMonths[0] || periods.start,
            period_end: sortedMonths[sortedMonths.length - 1] || periods.end,
            months_list: allMonthsList,
            metrics_period_start: metricsPeriodStart,
            metrics_period_end: metricsPeriodEnd,
            metrics_months:
              metricsMonths.length > 0 ? metricsMonths : allMonthsList,
            last_upload_at: now,
            updated_at: now,
          },
          { onConflict: "company_id" },
        );

      if (metadataError) {
        console.error("SUPABASE_ERROR", {
          table: "data_metadata",
          error: metadataError,
        });
      }

      // ============================================
      // 8. UPDATE FILTERS (merge with existing)
      // ============================================

      const { data: existingFilters } = await supabaseAdmin
        .from("filters")
        .select("*")
        .eq("company_id", companyId)
        .single();

      // Merge filter arrays
      const mergeArrays = (a: string[] = [], b: string[] = []) =>
        Array.from(new Set([...a, ...b])).sort((x, y) =>
          x.localeCompare(y, "he"),
        );

      const { error: filtersError } = await supabaseAdmin
        .from("filters")
        .upsert(
          {
            company_id: companyId,
            cities: mergeArrays(existingFilters?.cities, filters.cities),
            networks: mergeArrays(existingFilters?.networks, filters.networks),
            drivers: mergeArrays(existingFilters?.drivers, filters.drivers),
            agents: mergeArrays(existingFilters?.agents, filters.agents),
            categories: mergeArrays(
              existingFilters?.categories,
              filters.categories,
            ),
            updated_at: now,
          },
          { onConflict: "company_id" },
        );

      if (filtersError) {
        console.error("SUPABASE_ERROR", {
          table: "filters",
          error: filtersError,
        });
      }

      // ============================================
      // 9. FINALIZE UPLOAD RECORD (with stats JSONB)
      // ============================================

      const processingTimeMs = Date.now() - startTime;
      const monthsDetected = normalizeMonthsDetected(periods.all);
      const normalizedExistingMonths = new Set(
        (existingMonthsList || []).map(normalizeMonth),
      );
      const newMonthsCount = monthsDetected.filter(
        (m) => !normalizedExistingMonths.has(m),
      ).length;

      const uploadStats = {
        stores_inserted: storesInserted,
        stores_updated: storesUpdated,
        products_inserted: productsInserted,
        products_updated: productsUpdated,
        store_products_upserted: storeProductsUpserted,
        months_detected: monthsDetected,
        processingTimeMs,
      };

      await supabaseAdmin
        .from("uploads")
        .update({
          status: "completed",
          stores_count: storeRecords.length,
          products_count: productRecords.length,
          period_start: periods.start,
          period_end: periods.end,
          processing_time_ms: processingTimeMs,
          stats: uploadStats,
        })
        .eq("id", uploadRecord.id);

      return NextResponse.json({
        ok: true,
        success: true,
        uploadId: uploadRecord.id,
        stats: {
          stores: storeRecords.length,
          products: productRecords.length,
          processingTimeMs,
          newMonthsAdded: newMonthsCount,
          totalMonths: allMonthsList.length,
          stores_inserted: storesInserted,
          stores_updated: storesUpdated,
          products_inserted: productsInserted,
          products_updated: productsUpdated,
          store_products_upserted: storeProductsUpserted,
          months_detected: monthsDetected,
        },
      });
    } catch (error) {
      // Update upload record as failed
      await supabaseAdmin
        .from("uploads")
        .update({
          status: "failed",
          error_message:
            error instanceof Error ? error.message : "שגיאה לא ידועה",
        })
        .eq("id", uploadRecord.id);

      throw error;
    }
  } catch (err) {
    logError("upload", err);
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : String(err),
        name: err instanceof Error ? err.name : null,
        stack: err instanceof Error ? err.stack : null,
      },
      { status: 500 },
    );
  }
}
