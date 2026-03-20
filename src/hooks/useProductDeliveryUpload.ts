// ============================================================
// PRODUCT DELIVERY UPLOAD HOOK
// מעלה קובץ פירוט מוצרים — נתונים שבועיים לפי חנות+מוצר
// ============================================================

"use client";

import { useState, useCallback } from "react";
import {
  processProductDeliveryExcel,
  type ProcessorExclusions,
  normalizeExclusionValue,
} from "@/lib/productDeliveryExcelProcessor";
import { createClient } from "@/lib/supabase/client";
import type {
  ProductDeliveryProcessingResult,
  ProductDeliveryUploadPayload,
  MonthlyDistRecord,
  StoreDeliveryAggregate,
} from "@/types/productDeliveries";

export type ProductDeliveryUploadStatus =
  | "idle"
  | "reading"
  | "processing"
  | "uploading"
  | "success"
  | "error";

interface UploadState {
  status:   ProductDeliveryUploadStatus;
  progress: number;
  error:    string | null;
  result:   ProductDeliveryProcessingResult | null;
  uploadResponse: {
    recordsUpserted:  number;
    storesCount:      number;
    productsCount:    number;
    weeksCount:       number;
    periodStart:      string;
    periodEnd:        string;
    totalGrossQty:    number;
    totalReturnsQty:  number;
    processingTimeMs: number;
  } | null;
}

// Target 1MB per chunk (actual UTF-8 bytes), safely under Vercel's 4.5MB limit.
// Smaller chunks = faster DB upsert per request = less chance of 60s timeout.
// Hebrew chars are 2 bytes in UTF-8 but count as 1 in JS string.length —
// so we measure with TextEncoder to get the real byte count.
const CHUNK_MAX_BYTES = 1 * 1024 * 1024;
const encoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;

function utf8ByteSize(s: string): number {
  if (encoder) return encoder.encode(s).length;
  return s.length * 3; // safe fallback: worst-case UTF-8
}

function buildChunks<T>(records: T[]): T[][] {
  const chunks: T[][] = [];
  let current: T[] = [];
  let currentBytes = 2; // opening/closing brackets of JSON array

  for (const record of records) {
    const recordBytes = utf8ByteSize(JSON.stringify(record)) + 1; // +1 for comma
    if (current.length > 0 && currentBytes + recordBytes > CHUNK_MAX_BYTES) {
      chunks.push(current);
      current = [];
      currentBytes = 2;
    }
    current.push(record);
    currentBytes += recordBytes;
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
}

// ============================================================
// STANDALONE UPLOAD FUNCTION (for queue use)
// ============================================================

async function fetchExclusions(companyId: string): Promise<ProcessorExclusions> {
  const supabase = createClient();
  const { data } = await supabase
    .from("excluded_entities")
    .select("entity_type, entity_value")
    .eq("company_id", companyId)
    .eq("active", true);

  const excl: ProcessorExclusions = {
    networks: new Set<string>(),
    drivers:  new Set<string>(),
    stores:   new Set<string>(),
    agents:   new Set<string>(),
    lines:    new Set<string>(),
  };
  const typeMap: Record<string, keyof ProcessorExclusions> = {
    network: "networks",
    driver:  "drivers",
    store:   "stores",
    agent:   "agents",
    line:    "lines",
  };
  for (const row of data ?? []) {
    const key = typeMap[row.entity_type as string];
    if (!key) continue;
    const canon = normalizeExclusionValue(row.entity_value);
    if (canon) excl[key].add(canon);
  }
  return excl;
}

const RETRYABLE_STATUSES = new Set([503, 504, 429]);
const MAX_RETRIES = 3;

async function postChunk(
  payload: ProductDeliveryUploadPayload,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    let response: Response;
    try {
      response = await fetch("/api/upload-product-deliveries", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
    } catch {
      // Network-level failure (offline, proxy error)
      if (attempt < MAX_RETRIES) {
        await new Promise<void>((r) => setTimeout(r, 2000 * 2 ** attempt));
        attempt++;
        continue;
      }
      return { ok: false, error: "שגיאת רשת — בדוק חיבור לאינטרנט" };
    }

    if (response.ok) return { ok: true, data: await response.json() };

    // Retry on gateway timeouts / rate limits (3s → 6s → 12s)
    if (RETRYABLE_STATUSES.has(response.status) && attempt < MAX_RETRIES) {
      await new Promise<void>((r) => setTimeout(r, 3000 * 2 ** attempt));
      attempt++;
      continue;
    }

    let errMsg = `שגיאת שרת (${response.status})`;
    try { const d = await response.json(); if (d?.error) errMsg = d.error; } catch { /* ignore */ }
    return { ok: false, error: errMsg };
  }

  return { ok: false, error: "הצ'אנק נכשל לאחר מספר ניסיונות — נסה שוב" };
}

export async function uploadProductDeliveryFile(
  file: File,
  onProgress: (pct: number) => void,
  companyId?: string,
): Promise<{
  success: boolean;
  stats?: UploadState["uploadResponse"];
  error?: string;
}> {
  try {
    const validExts = [".xlsx", ".xls"];
    if (!validExts.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      return { success: false, error: "סוג קובץ לא נתמך. יש להעלות קובץ Excel (.xlsx)" };
    }

    onProgress(5);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    // Fetch exclusions before processing so excluded rows are never uploaded
    const exclusions = companyId ? await fetchExclusions(companyId) : undefined;

    onProgress(20);
    const result = await processProductDeliveryExcel(file, exclusions);
    if (!result.success) return { success: false, error: result.error ?? "שגיאה בעיבוד הקובץ" };

    onProgress(50);

    const recordChunks = buildChunks(result.records);
    const distChunks   = buildChunks(result.distRecords);
    const dailyChunks  = buildChunks(result.dailyRecords);
    // Final chunk carries storeDeliveries only (always exactly 1)
    const totalChunks  = recordChunks.length + distChunks.length + dailyChunks.length + 1;
    let chunksSent = 0;

    const progress = () => {
      chunksSent++;
      onProgress(50 + Math.round((chunksSent / totalChunks) * 50));
    };

    // 1. Weekly records → store_product_weekly
    for (let i = 0; i < recordChunks.length; i++) {
      const res = await postChunk({
        filename: file.name, records: recordChunks[i]!,
        stats: result.stats, chunkIndex: i, totalChunks,
      });
      if (!res.ok) return { success: false, error: res.error };
      progress();
    }

    // 2. Monthly dist records → store_product_monthly_dist (chunked)
    for (let i = 0; i < distChunks.length; i++) {
      const res = await postChunk({
        filename: file.name, records: [],
        distRecords: distChunks[i] as MonthlyDistRecord[],
        stats: result.stats,
        chunkIndex: recordChunks.length + i,
        totalChunks,
      });
      if (!res.ok) return { success: false, error: res.error };
      progress();
    }

    // 3. Daily records → store_product_daily (chunked)
    for (let i = 0; i < dailyChunks.length; i++) {
      const res = await postChunk({
        filename: file.name, records: [],
        dailyRecords: dailyChunks[i] as import("@/types/productDeliveries").DailyDeliveryRecord[],
        stats: result.stats,
        chunkIndex: recordChunks.length + distChunks.length + i,
        totalChunks,
      });
      if (!res.ok) return { success: false, error: res.error };
      progress();
    }

    // 4. Final chunk: storeDeliveries only → store_deliveries
    const finalRes = await postChunk({
      filename: file.name, records: [],
      storeDeliveries: result.storeDeliveries as StoreDeliveryAggregate[],
      stats: result.stats,
      chunkIndex: totalChunks - 1,
      totalChunks,
    });
    if (!finalRes.ok) return { success: false, error: finalRes.error };
    onProgress(100);

    return { success: true, stats: (finalRes.data as { stats?: UploadState["uploadResponse"] })?.stats ?? null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "שגיאה לא ידועה" };
  }
}

// ============================================================

export function useProductDeliveryUpload() {
  const [state, setState] = useState<UploadState>({
    status:         "idle",
    progress:       0,
    error:          null,
    result:         null,
    uploadResponse: null,
  });

  const reset = useCallback(() => {
    setState({
      status:         "idle",
      progress:       0,
      error:          null,
      result:         null,
      uploadResponse: null,
    });
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    try {
      // Validate file type
      const validExts = [".xlsx", ".xls"];
      const hasValidExt = validExts.some((ext) =>
        file.name.toLowerCase().endsWith(ext),
      );
      if (!hasValidExt) {
        throw new Error("סוג קובץ לא נתמך. יש להעלות קובץ Excel (.xlsx)");
      }

      // Step 1: Reading
      setState((prev) => ({
        ...prev,
        status:   "reading",
        progress: 10,
        error:    null,
      }));

      // Step 2: Processing (client-side SheetJS parsing)
      setState((prev) => ({ ...prev, status: "processing", progress: 30 }));
      // Fetch exclusions from DB before parsing so excluded rows are never uploaded
      const { data: authData } = await createClient().auth.getUser();
      const { data: userRow } = authData?.user
        ? await createClient().from("users").select("company_id").eq("id", authData.user.id).single()
        : { data: null };
      const exclusions = userRow?.company_id
        ? await fetchExclusions(userRow.company_id as string)
        : undefined;
      const result = await processProductDeliveryExcel(file, exclusions);

      if (!result.success) {
        throw new Error(result.error ?? "שגיאה בעיבוד הקובץ");
      }

      setState((prev) => ({ ...prev, result, progress: 60 }));

      // Step 3: Upload in chunks
      setState((prev) => ({ ...prev, status: "uploading", progress: 70 }));

      const recordChunks = buildChunks(result.records);
      const distChunks   = buildChunks(result.distRecords);
      const totalChunks  = recordChunks.length + distChunks.length + 1;
      let chunksSent = 0;
      let uploadResponse = null;

      const trackProgress = () => {
        chunksSent++;
        setState((prev) => ({
          ...prev,
          progress: 70 + Math.round((chunksSent / totalChunks) * 30),
        }));
      };

      // 1. Weekly records → store_product_weekly
      for (let i = 0; i < recordChunks.length; i++) {
        const res = await postChunk({
          filename: file.name, records: recordChunks[i]!,
          stats: result.stats, chunkIndex: i, totalChunks,
        });
        if (!res.ok) throw new Error(res.error);
        trackProgress();
      }

      // 2. Monthly dist records → store_product_monthly_dist (chunked)
      for (let i = 0; i < distChunks.length; i++) {
        const res = await postChunk({
          filename: file.name, records: [],
          distRecords: distChunks[i] as MonthlyDistRecord[],
          stats: result.stats,
          chunkIndex: recordChunks.length + i,
          totalChunks,
        });
        if (!res.ok) throw new Error(res.error);
        trackProgress();
      }

      // 3. Final chunk: storeDeliveries only → store_deliveries
      const finalRes = await postChunk({
        filename: file.name, records: [],
        storeDeliveries: result.storeDeliveries as StoreDeliveryAggregate[],
        stats: result.stats,
        chunkIndex: totalChunks - 1,
        totalChunks,
      });
      if (!finalRes.ok) throw new Error(finalRes.error);
      uploadResponse = finalRes.data;
      setState((prev) => ({ ...prev, progress: 100 }));

      setState((prev) => ({
        ...prev,
        status:         "success",
        progress:       100,
        uploadResponse: (uploadResponse as { stats?: UploadState["uploadResponse"] })?.stats ?? null,
      }));

      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status:   "error",
        progress: 0,
        error:    error instanceof Error ? error.message : "שגיאה לא ידועה",
      }));
      return false;
    }
  }, []);

  return { ...state, uploadFile, reset };
}
