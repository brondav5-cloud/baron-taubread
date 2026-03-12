// ============================================================
// API ROUTE: Upload Product Deliveries
// מקבל נתוני פירוט מוצרים מעובדים מהלקוח
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  upsertWeeklyRecords,
  createProductDeliveryUpload,
} from "@/lib/db/productDeliveries.repo";
import type { ProductDeliveryUploadPayload } from "@/types/productDeliveries";
import { readJsonWithLimit } from "@/lib/api/readJsonWithLimit";
import {
  checkRateLimit,
  checkUploadRateDb,
  getClientIdentifier,
} from "@/lib/api/rateLimit";
import { logError } from "@/lib/api/logger";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

const MAX_BODY_BYTES = 4 * 1024 * 1024; // 4MB per chunk (Vercel hard limit ~4.5MB)
const MAX_PROCESSING_MS = 55_000;

const PAYLOAD_TOO_LARGE_MSG = {
  error: "גודל הבקשה חורג מהמותר. הקובץ יחולק אוטומטית — נסה שוב.",
};

const RATE_LIMIT = { max: 15, windowMs: 60_000 };

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

    if (!payload.records || payload.records.length === 0) {
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

    // Upsert weekly records
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

    const chunkIndex  = payload.chunkIndex  ?? 0;
    const totalChunks = payload.totalChunks ?? 1;
    const isLastChunk = chunkIndex === totalChunks - 1;

    // Log upload record only on the last chunk
    if (isLastChunk) {
      const stats = payload.stats;
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
          recordsUpserted:  result.upserted,
          storesCount:      payload.stats.storesCount,
          productsCount:    payload.stats.productsCount,
          weeksCount:       payload.stats.weeksCount,
          periodStart:      payload.stats.periodStart,
          periodEnd:        payload.stats.periodEnd,
          totalGrossQty:    payload.stats.totalGrossQty,
          totalReturnsQty:  payload.stats.totalReturnsQty,
          processingTimeMs: processingTime,
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
