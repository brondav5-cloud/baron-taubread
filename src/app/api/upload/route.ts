import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbStore, DbProduct } from "@/types/supabase";

const MAX_BODY_BYTES = 4 * 1024 * 1024;
const MAX_PROCESSING_MS = 55_000;
import { mergePeriodLists } from "@/lib/periodUtils";
import { normalizeAndValidateStoreProductRow } from "@/lib/storeProducts/normalize";
import { prepareStoreRecords, prepareProductRecords, prepareStoreProductRecords } from "./prepareRecords";
import {
  normalizeMonth,
  normalizeMonthsDetected,
} from "./mergeUtils";
import type { UploadPayload } from "./types";
import { readJsonWithLimit } from "@/lib/api/readJsonWithLimit";
import { checkRateLimit, checkUploadRateDb, getClientIdentifier } from "@/lib/api/rateLimit";
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

    const dbRate = await checkUploadRateDb(supabaseAdmin, companyId, 10, 10);
    if (!dbRate.ok) {
      return NextResponse.json(
        { error: "יותר מדי העלאות ב-10 הדקות האחרונות. נסה שוב מאוחר יותר." },
        { status: 429, headers: { "Retry-After": String(dbRate.retryAfter ?? 600) } },
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
      monthly_returns: Record<string, number>;
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
      // 2. FETCH EXISTING DATA (for stores + products merging)
      // store_products merge is now handled by the DB (upsert with jsonb ||)
      // so we no longer fetch all store_products here — major perf improvement
      // ============================================

      const [
        { data: existingStores },
        { data: existingProducts },
        { data: existingMetadata },
      ] = await Promise.all([
        supabaseAdmin
          .from("stores")
          .select("external_id, monthly_qty, monthly_sales, monthly_gross, monthly_returns")
          .eq("company_id", companyId),
        supabaseAdmin
          .from("products")
          .select("external_id, monthly_qty, monthly_sales")
          .eq("company_id", companyId),
        supabaseAdmin
          .from("data_metadata")
          .select("months_list")
          .eq("company_id", companyId)
          .single(),
      ]);

      // Create maps for quick lookup
      type StoreLite = Pick<DbStore, "external_id" | "monthly_qty" | "monthly_sales" | "monthly_gross" | "monthly_returns">;
      const existingStoresMap = new Map<number, StoreLite>();
      (existingStores || []).forEach((s) =>
        existingStoresMap.set(s.external_id, s as StoreLite),
      );

      type ProductLite = Pick<DbProduct, "external_id" | "monthly_qty" | "monthly_sales">;
      const existingProductsMap = new Map<number, ProductLite>();
      (existingProducts || []).forEach((p) =>
        existingProductsMap.set(p.external_id, p as ProductLite),
      );

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
      // 4-6. PREPARE RECORDS (stores, products, store_products)
      // ============================================

      const metricsMonths = allMonthsList.slice(-24);
      const lastPeriod = metricsMonths[metricsMonths.length - 1];
      const metricsCurrentYear = lastPeriod
        ? parseInt(lastPeriod.slice(0, 4), 10)
        : periods.currentYear;
      const metricsPreviousYear = metricsCurrentYear - 1;
      const metricsCtx = { metricsMonths, allMonthsList: periods.all, currentYear: metricsCurrentYear, previousYear: metricsPreviousYear };

      const storeRecords = prepareStoreRecords(stores, existingStoresMap, companyId, metricsCtx);
      const productRecords = prepareProductRecords(products, existingProductsMap, companyId, metricsCtx);

      let storeProductRecords: Array<{
        store_external_id: number;
        product_external_id: number;
        product_name: string;
        product_category: string | null;
        monthly_qty: Record<string, number>;
        monthly_sales: Record<string, number>;
        monthly_returns: Record<string, number>;
        total_qty: number;
        total_sales: number;
      }> = [];
      let storeProductsUpserted = 0;

      if (validatedStoreProducts.length > 0) {
        const { records, errors: mergeErrors } = prepareStoreProductRecords(
          validatedStoreProducts,
        );

        if (mergeErrors.length > 0) {
          const first20 = mergeErrors.slice(0, 20);
          return NextResponse.json(
            { ok: false, message: "Validation failed", errors: first20, errorsCount: mergeErrors.length },
            { status: 400 },
          );
        }

        storeProductRecords = records;
        storeProductsUpserted = records.length;
      }

      // ============================================
      // 6b. ATOMIC UPLOAD (stores + products + store_products in one transaction)
      // ============================================
      const elapsed = Date.now() - startTime;
      if (elapsed > MAX_PROCESSING_MS) {
        return NextResponse.json(
          { ok: false, message: "העיבוד ארך יותר מדי זמן. נסה קובץ קטן יותר." },
          { status: 504 },
        );
      }

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
      // 6c. DB-LEVEL VERIFICATION
      // Re-query the DB after the RPC so the comparison is against
      // what is ACTUALLY stored — not what was prepared in memory.
      // Uses server-side SUM — no row-limit issues.
      // ============================================

      const normalizedMonths = periods.all.map(normalizeMonth);

      const { data: verifyData, error: verifyError } = await supabaseAdmin.rpc(
        "verify_monthly_upload",
        {
          p_company_id: companyId,
          p_months:     normalizedMonths,  // pass as JS array — Supabase serializes to jsonb correctly
        },
      );

      const dbVerify = (verifyError || !verifyData)
        ? null
        : (verifyData as {
            total_gross_qty:   number;
            total_returns_qty: number;
            total_net_qty:     number;
            total_sales:       number;
            stores_count:      number;
            products_count:    number;
          });

      if (verifyError) {
        console.warn("[UPLOAD] verify_monthly_upload RPC error:", verifyError.message);
      }

      const clientTotalReturns = stats.totalReturnsQty ?? 0;
      const clientTotalGross   = stats.totalGrossQty   ?? 0;

      // DB totals — only meaningful if the RPC is available (migration ran).
      // If RPC is missing, skip verification entirely rather than show a false alarm.
      const dbVerifyAvailable = !verifyError && dbVerify !== null;
      const dbTotalGross   = dbVerify?.total_gross_qty   ?? 0;
      const dbTotalReturns = dbVerify?.total_returns_qty ?? 0;

      const returnsDiff = dbVerifyAvailable ? Math.abs(dbTotalReturns - clientTotalReturns) : 0;
      const grossDiff   = dbVerifyAvailable ? Math.abs(dbTotalGross   - clientTotalGross)   : 0;

      // > 0.5% discrepancy flagged as warning — only when DB verification succeeded
      const returnsWarning = dbVerifyAvailable && clientTotalReturns > 0 && returnsDiff / clientTotalReturns > 0.005;
      const grossWarning   = dbVerifyAvailable && clientTotalGross   > 0 && grossDiff   / clientTotalGross   > 0.005;

      const rejectedRows = (stats.storeProductsCount ?? 0) - validatedStoreProducts.length;

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
          store_products_upserted: storeProductsUpserted,
          processingTimeMs,
          newMonthsAdded: newMonthsCount,
          totalMonths: allMonthsList.length,
          stores_inserted: storesInserted,
          stores_updated: storesUpdated,
          products_inserted: productsInserted,
          products_updated: productsUpdated,
          months_detected: monthsDetected,
          // DB totals (queried AFTER save — reflects what is actually stored)
          totalGrossQty:    dbTotalGross,
          totalReturnsQty:  dbTotalReturns,
          dbStoresCount:    dbVerify?.stores_count   ?? storeRecords.length,
          dbProductsCount:  dbVerify?.products_count ?? productRecords.length,
          dbNetQty:         dbVerify?.total_net_qty  ?? 0,
          dbSales:          dbVerify?.total_sales    ?? 0,
          verifiedByDb:     !verifyError,
          // Client-reported totals (for comparison in UI)
          clientTotalGrossQty:   clientTotalGross,
          clientTotalReturnsQty: clientTotalReturns,
          clientRowsCount:       stats.rowsCount,
          clientRowsSkipped:     stats.rowsSkipped ?? 0,
          clientSkipReasons:     stats.skipReasons ?? {},
          rejectedRows,
          // Validation summary
          validation: {
            status: (returnsWarning || grossWarning || rejectedRows > 0) ? "warning" : "ok",
            returnsMatch:  !returnsWarning,
            grossMatch:    !grossWarning,
            returnsDiff,
            grossDiff,
            rejectedRows,
            verifiedByDb: !verifyError,
          },
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
