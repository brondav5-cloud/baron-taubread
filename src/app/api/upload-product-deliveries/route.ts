// ============================================================
// API ROUTE: Upload Product Deliveries
// מקבל נתוני פירוט מוצרים מעובדים מהלקוח
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  deleteWeeklyRecordsForPeriod,
  upsertWeeklyRecords,
  deleteMonthlyDistForPeriod,
  upsertMonthlyDistRecords,
  createProductDeliveryUpload,
  verifyProductDeliveryTotals,
} from "@/lib/db/productDeliveries.repo";
import { upsertDeliveries, deleteDeliveriesForPeriod } from "@/lib/db/deliveries.repo";
import type { ProductDeliveryUploadPayload } from "@/types/productDeliveries";
import type { AggregatedDelivery } from "@/types/deliveries";
import { readJsonWithLimit } from "@/lib/api/readJsonWithLimit";
import {
  checkRateLimit,
  checkUploadRateDb,
  getClientIdentifier,
} from "@/lib/api/rateLimit";
import { logError } from "@/lib/api/logger";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

export const maxDuration = 60;

const MAX_BODY_BYTES = 3 * 1024 * 1024;
const MAX_PROCESSING_MS = 55_000;

const PAYLOAD_TOO_LARGE_MSG = {
  error: "גודל הבקשה חורג מהמותר. הקובץ יחולק אוטומטית — נסה שוב.",
};

const RATE_LIMIT = { max: 50, windowMs: 60_000 };

export async function POST(request: NextRequest) {
  const startTime = performance.now();

  try {
    // Rate limit by IP / fingerprint
    const clientId = getClientIdentifier(request);
    const rate = checkRateLimit(
      `upload-product-deliveries:${clientId}`,
      RATE_LIMIT.max,
      RATE_LIMIT.windowMs,
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

    // Auth
    const supabaseAuth = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { companyId, role } = await resolveSelectedCompanyId(
      supabaseAuth,
      user.id,
    );
    if (!companyId) {
      return NextResponse.json(
        { error: "יש לבחור חברה לפני ההעלאה" },
        { status: 403 },
      );
    }

    const allowedRoles = ["admin", "super_admin", "editor"];
    if (!role || !allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "רק עורכים ומנהלים יכולים להעלות נתונים" },
        { status: 403 },
      );
    }

    // DB-level rate limit
    const supabaseAdmin = getSupabaseAdmin();
    const dbRate = await checkUploadRateDb(supabaseAdmin, companyId, 15, 10);
    if (!dbRate.ok) {
      return NextResponse.json(
        {
          error:
            "יותר מדי העלאות ב-10 הדקות האחרונות. נסה שוב מאוחר יותר.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(dbRate.retryAfter ?? 600) },
        },
      );
    }

    // Parse body with size limit
    const parseResult = await readJsonWithLimit(request, MAX_BODY_BYTES);
    if (!parseResult.ok) {
      return NextResponse.json(PAYLOAD_TOO_LARGE_MSG, { status: 413 });
    }

    const payload = parseResult.data as ProductDeliveryUploadPayload;

    const chunkIndex  = payload.chunkIndex  ?? 0;
    const totalChunks = payload.totalChunks ?? 1;
    const isLastChunk = chunkIndex === totalChunks - 1;

    // Allow empty records only on the final chunk (storeDeliveries-only request)
    if (!payload.records || (payload.records.length === 0 && !isLastChunk)) {
      return NextResponse.json(
        { error: "אין נתונים בבקשה" },
        { status: 400 },
      );
    }

    if (performance.now() - startTime > MAX_PROCESSING_MS) {
      return NextResponse.json(
        { error: "העיבוד ארך יותר מדי זמן" },
        { status: 504 },
      );
    }

    // On the first chunk: delete existing data for this period so the new
    // file fully replaces old data (no stale "ghost" records left behind).
    if (chunkIndex === 0) {
      if (payload.stats?.periodStart && payload.stats?.periodEnd) {
        const delResult = await deleteWeeklyRecordsForPeriod(
          supabaseAdmin,
          companyId,
          payload.stats.periodStart,
          payload.stats.periodEnd,
        );
        if (!delResult.success) {
          return NextResponse.json(
            { error: delResult.error ?? "שגיאה במחיקת נתונים שבועיים ישנים" },
            { status: 500 },
          );
        }
      }

      if (payload.stats?.distYearMonthFrom && payload.stats?.distYearMonthTo) {
        const delDist = await deleteMonthlyDistForPeriod(
          supabaseAdmin,
          companyId,
          payload.stats.distYearMonthFrom,
          payload.stats.distYearMonthTo,
        );
        if (!delDist.success) {
          return NextResponse.json(
            { error: delDist.error ?? "שגיאה במחיקת נתוני חלוקה ישנים" },
            { status: 500 },
          );
        }
      }
    }

    // Upsert weekly records (may be empty on the final storeDeliveries-only chunk)
    const result = await upsertWeeklyRecords(
      supabaseAdmin,
      companyId,
      payload.records,
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "שגיאה בשמירת הנתונים" },
        { status: 500 },
      );
    }

    const processingTime = Math.round(performance.now() - startTime);

    // On the last chunk: upsert monthly distribution records → store_product_monthly_dist
    if (isLastChunk && payload.distRecords?.length) {
      const distResult = await upsertMonthlyDistRecords(
        supabaseAdmin,
        companyId,
        payload.distRecords,
      );
      if (!distResult.success) {
        return NextResponse.json(
          { error: distResult.error ?? "שגיאה בשמירת נתוני חלוקה חודשית" },
          { status: 500 },
        );
      }
    }

    // On the last chunk: replace store-level delivery aggregates → store_deliveries
    if (isLastChunk && payload.storeDeliveries?.length) {
      if (payload.stats?.periodStart && payload.stats?.periodEnd) {
        await deleteDeliveriesForPeriod(
          supabaseAdmin,
          companyId,
          payload.stats.periodStart,
          payload.stats.periodEnd,
        );
      }
      const deliveries: AggregatedDelivery[] = payload.storeDeliveries.map((sd) => ({
        storeExternalId: sd.storeExternalId,
        storeName: sd.storeName,
        year: sd.year,
        month: sd.month,
        week: sd.week,
        deliveriesCount: sd.deliveriesCount,
        totalValue: sd.totalValue,
        totalQuantity: sd.totalQuantity,
      }));
      await upsertDeliveries(supabaseAdmin, companyId, deliveries);
    }

    // Log upload record only on the last chunk
    if (isLastChunk) {
      const stats = payload.stats;

      // DB spot-check: verify totals actually saved match what the client sent
      let dbVerification = null;
      if (stats.periodStart && stats.periodEnd) {
        const dbTotals = await verifyProductDeliveryTotals(
          supabaseAdmin,
          companyId,
          stats.periodStart,
          stats.periodEnd,
        );

        const returnsDiff = Math.abs(dbTotals.dbTotalReturnsQty - stats.totalReturnsQty);
        const grossDiff   = Math.abs(dbTotals.dbTotalGrossQty   - stats.totalGrossQty);
        const returnsWarning = stats.totalReturnsQty > 0 && returnsDiff / stats.totalReturnsQty > 0.005;
        const grossWarning   = stats.totalGrossQty   > 0 && grossDiff   / stats.totalGrossQty   > 0.005;

        dbVerification = {
          status:           (returnsWarning || grossWarning) ? "warning" : "ok",
          dbStoresCount:    dbTotals.dbStoresCount,
          dbTotalGrossQty:  dbTotals.dbTotalGrossQty,
          dbTotalReturnsQty: dbTotals.dbTotalReturnsQty,
          dbRecordsCount:   dbTotals.dbRecordsCount,
          returnsMatch:     !returnsWarning,
          grossMatch:       !grossWarning,
          returnsDiff,
          grossDiff,
        };
      }

      await createProductDeliveryUpload(supabaseAdmin, companyId, {
        filename:           payload.filename,
        uploaded_by:        user.id,
        period_start:       stats.periodStart,
        period_end:         stats.periodEnd,
        weeks_count:        stats.weeksCount,
        rows_processed:     stats.rowsProcessed,
        rows_skipped:       stats.rowsSkipped,
        stores_count:       stats.storesCount,
        products_count:     stats.productsCount,
        total_gross_qty:    stats.totalGrossQty,
        total_returns_qty:  stats.totalReturnsQty,
        delivery_events:    result.upserted,
        status:             "completed",
        error_message:      null,
        processing_time_ms: processingTime,
      });

      return NextResponse.json({
        success: true,
        stats: {
          recordsUpserted:   result.upserted,
          storesCount:       payload.stats.storesCount,
          productsCount:     payload.stats.productsCount,
          weeksCount:        payload.stats.weeksCount,
          periodStart:       payload.stats.periodStart,
          periodEnd:         payload.stats.periodEnd,
          totalGrossQty:     payload.stats.totalGrossQty,
          totalReturnsQty:   payload.stats.totalReturnsQty,
          rowsProcessed:     payload.stats.rowsProcessed,
          rowsSkipped:       payload.stats.rowsSkipped,
          processingTimeMs:  processingTime,
          dbVerification,
        },
      });
    }

    // Intermediate chunk
    return NextResponse.json({
      success: true,
      partial: true,
      chunkIndex,
      totalChunks,
    });
  } catch (error) {
    logError("upload-product-deliveries", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "שגיאה בשרת" },
      { status: 500 },
    );
  }
}
