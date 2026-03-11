// ============================================
// API ROUTE: Upload Deliveries
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  upsertDeliveries,
  createDeliveryUpload,
} from "@/lib/db/deliveries.repo";
import type { DeliveryUploadPayload } from "@/types/deliveries";
import { readJsonWithLimit } from "@/lib/api/readJsonWithLimit";
import { checkRateLimit, checkUploadRateDb, getClientIdentifier } from "@/lib/api/rateLimit";
import { logError } from "@/lib/api/logger";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Each chunk is limited to 4MB (Vercel hard limit is 4.5MB per request)
const MAX_BODY_BYTES = 4 * 1024 * 1024;
const MAX_PROCESSING_MS = 55_000;
const PAYLOAD_TOO_LARGE_MSG = {
  error: "גודל הבקשה חורג מהמותר. נסה שוב — הקובץ יחולק אוטומטית.",
};

const DELIVERY_RATE_LIMIT = { max: 10, windowMs: 60_000 };

export async function POST(request: NextRequest) {
  const startTime = performance.now();

  try {
    const id = getClientIdentifier(request);
    const rate = checkRateLimit(
      `upload-deliveries:${id}`,
      DELIVERY_RATE_LIMIT.max,
      DELIVERY_RATE_LIMIT.windowMs,
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
        { error: "יש לבחור חברה להעלאת אספקות" },
        { status: 403 },
      );
    }
    const allowedUploadRoles = ["admin", "super_admin", "editor"];
    if (!role || !allowedUploadRoles.includes(role)) {
      return NextResponse.json(
        { error: "רק עורכים ומנהלים יכולים להעלות אספקות" },
        { status: 403 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

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
    const payload = parseResult.data as DeliveryUploadPayload & {
      chunkIndex?: number;
      totalChunks?: number;
    };

    if (!payload.deliveries || payload.deliveries.length === 0) {
      return NextResponse.json({ error: "אין נתוני אספקות" }, { status: 400 });
    }

    const isChunked =
      typeof payload.totalChunks === "number" && payload.totalChunks > 1;
    const chunkIndex = payload.chunkIndex ?? 0;
    const totalChunks = payload.totalChunks ?? 1;
    const isLastChunk = chunkIndex === totalChunks - 1;

    const elapsed = performance.now() - startTime;
    if (elapsed > MAX_PROCESSING_MS) {
      return NextResponse.json(
        { error: "העיבוד ארך יותר מדי זמן." },
        { status: 504 },
      );
    }

    const result = await upsertDeliveries(
      supabaseAdmin,
      companyId,
      payload.deliveries,
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "שגיאה בשמירת הנתונים" },
        { status: 500 },
      );
    }

    const processingTime = Math.round(performance.now() - startTime);

    // Create upload record only on last (or only) chunk
    if (!isChunked || isLastChunk) {
      const uploadRecord = await createDeliveryUpload(
        supabaseAdmin,
        companyId,
        {
          filename: payload.filename,
          uploaded_by: user.id,
          period_start: payload.stats.periodStart,
          period_end: payload.stats.periodEnd,
          rows_processed: payload.stats.rowsProcessed,
          stores_count: payload.stats.storesCount,
          total_deliveries: payload.stats.totalDeliveries,
          total_value: payload.stats.totalValue,
          status: "completed",
          error_message: null,
          processing_time_ms: processingTime,
        },
      );

      return NextResponse.json({
        success: true,
        uploadId: uploadRecord?.id,
        stats: {
          deliveriesCount: payload.stats.totalDeliveries,
          storesCount: payload.stats.storesCount,
          totalValue: payload.stats.totalValue,
          processingTimeMs: processingTime,
        },
      });
    }

    // Intermediate chunk — just confirm success
    return NextResponse.json({
      success: true,
      partial: true,
      chunkIndex,
      totalChunks,
    });
  } catch (error) {
    logError("upload-deliveries", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "שגיאה בשרת" },
      { status: 500 },
    );
  }
}
