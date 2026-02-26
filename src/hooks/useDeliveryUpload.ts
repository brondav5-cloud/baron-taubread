// ============================================
// DELIVERY UPLOAD HOOK
// ============================================

"use client";

import { useState, useCallback } from "react";
import { processDeliveryExcel } from "@/lib/deliveryExcelProcessor";
import type { DeliveryProcessingResult } from "@/types/deliveries";

export type DeliveryUploadStatus =
  | "idle"
  | "reading"
  | "processing"
  | "uploading"
  | "success"
  | "error";

interface DeliveryUploadState {
  status: DeliveryUploadStatus;
  progress: number;
  error: string | null;
  result: DeliveryProcessingResult | null;
  uploadResponse: {
    uploadId: string;
    stats: {
      deliveriesCount: number;
      storesCount: number;
      totalValue: number;
      processingTimeMs: number;
    };
  } | null;
}

export function useDeliveryUpload() {
  const [state, setState] = useState<DeliveryUploadState>({
    status: "idle",
    progress: 0,
    error: null,
    result: null,
    uploadResponse: null,
  });

  const reset = useCallback(() => {
    setState({
      status: "idle",
      progress: 0,
      error: null,
      result: null,
      uploadResponse: null,
    });
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    try {
      // Step 1: Reading file
      setState((prev) => ({
        ...prev,
        status: "reading",
        progress: 10,
        error: null,
      }));

      // Validate file type
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];
      if (
        !validTypes.includes(file.type) &&
        !file.name.endsWith(".xlsx") &&
        !file.name.endsWith(".xls")
      ) {
        throw new Error(
          "סוג קובץ לא נתמך. יש להעלות קובץ Excel (.xlsx או .xls)",
        );
      }

      // Step 2: Processing Excel
      setState((prev) => ({ ...prev, status: "processing", progress: 30 }));
      const result = await processDeliveryExcel(file);

      if (!result.success) {
        throw new Error(result.error || "שגיאה בעיבוד הקובץ");
      }

      setState((prev) => ({ ...prev, result, progress: 60 }));

      setState((prev) => ({ ...prev, status: "uploading", progress: 70 }));

      // Split deliveries into chunks that fit within Vercel's 4.5MB limit.
      // We target ≤3.5MB per chunk to leave headroom for headers/metadata.
      const CHUNK_MAX_BYTES = 3.5 * 1024 * 1024;
      const deliveries = result.deliveries;

      // Build chunks by accumulating records until the JSON size would exceed the limit
      const chunks: (typeof deliveries)[] = [];
      let current: typeof deliveries = [];
      let currentSize = 2; // opening/closing brackets
      for (const delivery of deliveries) {
        const recordSize = JSON.stringify(delivery).length + 1; // +1 for comma
        if (current.length > 0 && currentSize + recordSize > CHUNK_MAX_BYTES) {
          chunks.push(current);
          current = [];
          currentSize = 2;
        }
        current.push(delivery);
        currentSize += recordSize;
      }
      if (current.length > 0) chunks.push(current);

      const totalChunks = chunks.length;
      let uploadResponse = null;

      for (let i = 0; i < totalChunks; i++) {
        const isLast = i === totalChunks - 1;
        const chunkPayload = {
          filename: file.name,
          deliveries: chunks[i],
          stats: result.stats, // full stats always included (used only on last chunk)
          chunkIndex: i,
          totalChunks,
        };

        const response = await fetch("/api/upload-deliveries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(chunkPayload),
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

        const chunkResponse = await response.json();
        if (isLast) uploadResponse = chunkResponse;

        // Update progress proportionally across chunks (70-100%)
        const chunkProgress = 70 + Math.round(((i + 1) / totalChunks) * 30);
        setState((prev) => ({ ...prev, progress: chunkProgress }));
      }

      // Success!
      setState((prev) => ({
        ...prev,
        status: "success",
        progress: 100,
        uploadResponse,
      }));

      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: error instanceof Error ? error.message : "שגיאה לא ידועה",
        progress: 0,
      }));
      return false;
    }
  }, []);

  return {
    ...state,
    uploadFile,
    reset,
  };
}
