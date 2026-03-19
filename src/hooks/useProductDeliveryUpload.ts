// ============================================================
// PRODUCT DELIVERY UPLOAD HOOK
// מעלה קובץ פירוט מוצרים — נתונים שבועיים לפי חנות+מוצר
// ============================================================

"use client";

import { useState, useCallback } from "react";
import { processProductDeliveryExcel } from "@/lib/productDeliveryExcelProcessor";
import type {
  ProductDeliveryProcessingResult,
  ProductDeliveryUploadPayload,
  AggregatedWeeklyRecord,
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

// Target 2MB per chunk (actual UTF-8 bytes), safely under Vercel's 4.5MB limit.
// Hebrew chars are 2 bytes in UTF-8 but count as 1 in JS string.length —
// so we measure with TextEncoder to get the real byte count.
const CHUNK_MAX_BYTES = 2 * 1024 * 1024;
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

async function postChunk(
  payload: ProductDeliveryUploadPayload,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const response = await fetch("/api/upload-product-deliveries", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });
  if (!response.ok) {
    let errMsg = `שגיאת שרת (${response.status})`;
    try { const d = await response.json(); if (d?.error) errMsg = d.error; } catch { /* ignore */ }
    return { ok: false, error: errMsg };
  }
  return { ok: true, data: await response.json() };
}

export async function uploadProductDeliveryFile(
  file: File,
  onProgress: (pct: number) => void,
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
    onProgress(20);
    const result = await processProductDeliveryExcel(file);
    if (!result.success) return { success: false, error: result.error ?? "שגיאה בעיבוד הקובץ" };

    onProgress(50);

    const recordChunks = buildChunks(result.records);
    const distChunks   = buildChunks(result.distRecords);
    // Final chunk carries storeDeliveries only (always exactly 1)
    const totalChunks  = recordChunks.length + distChunks.length + 1;
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

    // 3. Final chunk: storeDeliveries only → store_deliveries
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
      const result = await processProductDeliveryExcel(file);

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
