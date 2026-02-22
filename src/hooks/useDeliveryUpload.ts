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

      const payload = {
        filename: file.name,
        deliveries: result.deliveries,
        stats: result.stats,
      };
      const bodyStr = JSON.stringify(payload);
      if (new Blob([bodyStr]).size > 3.5 * 1024 * 1024) {
        throw new Error("גודל הנתונים חורג מהמותר (4MB). נסה קובץ קטן יותר.");
      }

      setState((prev) => ({ ...prev, status: "uploading", progress: 70 }));

      const response = await fetch("/api/upload-deliveries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: bodyStr,
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

      const uploadResponse = await response.json();

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
