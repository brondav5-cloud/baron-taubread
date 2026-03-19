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

function buildChunks(records: AggregatedWeeklyRecord[]): AggregatedWeeklyRecord[][] {
  const chunks: AggregatedWeeklyRecord[][] = [];
  let current: AggregatedWeeklyRecord[] = [];
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
    // Yield to the browser before SheetJS blocks the main thread
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    onProgress(20);
    const result = await processProductDeliveryExcel(file);
    if (!result.success) return { success: false, error: result.error ?? "שגיאה בעיבוד הקובץ" };

    onProgress(50);
    const recordChunks = buildChunks(result.records);
    // storeDeliveries is always sent as its own final request to avoid
    // pushing the last records chunk over the server's body size limit.
    const totalChunks = recordChunks.length + 1;
    let uploadResponse = null;

    // Send all record chunks (none of them are the "last" chunk)
    for (let i = 0; i < recordChunks.length; i++) {
      const payload: ProductDeliveryUploadPayload = {
        filename:   file.name,
        records:    recordChunks[i]!,
        stats:      result.stats,
        chunkIndex: i,
        totalChunks,
      };
      const response = await fetch("/api/upload-product-deliveries", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      if (!response.ok) {
        let errMsg = "שגיאה בשמירת הנתונים";
        try { const d = await response.json(); if (d?.error) errMsg = d.error; } catch { /* ignore */ }
        return { success: false, error: errMsg };
      }
      onProgress(50 + Math.round(((i + 1) / totalChunks) * 50));
    }

    // Final chunk: empty records + distRecords + storeDeliveries
    const finalPayload: ProductDeliveryUploadPayload = {
      filename:        file.name,
      records:         [],
      distRecords:     result.distRecords as MonthlyDistRecord[],
      storeDeliveries: result.storeDeliveries as StoreDeliveryAggregate[],
      stats:           result.stats,
      chunkIndex:      totalChunks - 1,
      totalChunks,
    };
    const finalResponse = await fetch("/api/upload-product-deliveries", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(finalPayload),
    });
    if (!finalResponse.ok) {
      let errMsg = "שגיאה בשמירת נתוני אספקות";
      try { const d = await finalResponse.json(); if (d?.error) errMsg = d.error; } catch { /* ignore */ }
      return { success: false, error: errMsg };
    }
    uploadResponse = await finalResponse.json();
    onProgress(100);

    return { success: true, stats: uploadResponse?.stats ?? null };
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
      // storeDeliveries always goes as its own final request
      const totalChunks = recordChunks.length + 1;
      let uploadResponse = null;

      for (let i = 0; i < recordChunks.length; i++) {
        const payload: ProductDeliveryUploadPayload = {
          filename:   file.name,
          records:    recordChunks[i]!,
          stats:      result.stats,
          chunkIndex: i,
          totalChunks,
        };

        const response = await fetch("/api/upload-product-deliveries", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });

        if (!response.ok) {
          let errMsg = "שגיאה בשמירת הנתונים";
          try {
            const errorData = await response.json();
            if (errorData?.error) errMsg = errorData.error;
          } catch {
            errMsg = `שגיאת שרת (${response.status})`;
          }
          throw new Error(errMsg);
        }

        const chunkProgress = 70 + Math.round(((i + 1) / totalChunks) * 30);
        setState((prev) => ({ ...prev, progress: chunkProgress }));
      }

      // Final chunk: empty records + distRecords + storeDeliveries
      const finalPayload: ProductDeliveryUploadPayload = {
        filename:        file.name,
        records:         [],
        distRecords:     result.distRecords as MonthlyDistRecord[],
        storeDeliveries: result.storeDeliveries as StoreDeliveryAggregate[],
        stats:           result.stats,
        chunkIndex:      totalChunks - 1,
        totalChunks,
      };
      const finalResponse = await fetch("/api/upload-product-deliveries", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(finalPayload),
      });
      if (!finalResponse.ok) {
        let errMsg = "שגיאה בשמירת נתוני אספקות";
        try {
          const errorData = await finalResponse.json();
          if (errorData?.error) errMsg = errorData.error;
        } catch {
          errMsg = `שגיאת שרת (${finalResponse.status})`;
        }
        throw new Error(errMsg);
      }
      uploadResponse = await finalResponse.json();
      setState((prev) => ({ ...prev, progress: 100 }));

      setState((prev) => ({
        ...prev,
        status:         "success",
        progress:       100,
        uploadResponse: uploadResponse?.stats ?? null,
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
