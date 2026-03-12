"use client";

import { useState, useCallback } from "react";
import { processExcelFile } from "@/lib/excelProcessor";
import type { ProcessingResult } from "@/types/supabase";

export type UploadStatus =
  | "idle"
  | "reading"
  | "processing"
  | "uploading"
  | "success"
  | "error";

interface UploadState {
  status: UploadStatus;
  progress: number;
  error: string | null;
  result: ProcessingResult | null;
  uploadResponse: {
    uploadId: string;
    stats: {
      stores: number;
      products: number;
      processingTimeMs: number;
    };
  } | null;
}

// ============================================================
// STANDALONE UPLOAD FUNCTION (for queue use)
// ============================================================

export async function uploadSalesFile(
  file: File,
  onProgress: (pct: number) => void,
): Promise<{ success: boolean; stats?: unknown; error?: string }> {
  try {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return { success: false, error: "סוג קובץ לא נתמך. יש להעלות קובץ Excel (.xlsx)" };
    }
    onProgress(20);
    const result = await processExcelFile(file);
    if (!result.success) return { success: false, error: result.error ?? "שגיאה בעיבוד הקובץ" };

    onProgress(60);
    const payload = {
      filename: file.name,
      stores: result.stores, products: result.products,
      storeProducts: result.storeProducts, filters: result.filters,
      periods: result.periods, stats: result.stats,
    };
    const bodyStr = JSON.stringify(payload);
    if (new Blob([bodyStr]).size > 3.5 * 1024 * 1024) {
      return { success: false, error: "גודל הנתונים חורג מהמותר (4MB). נסה קובץ קטן יותר." };
    }
    const response = await fetch("/api/upload", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: bodyStr,
    });
    if (!response.ok) {
      let errMsg = "שגיאה בשמירת הנתונים";
      try { const d = await response.json(); if (d?.error) errMsg = d.error; } catch { /* ignore */ }
      return { success: false, error: errMsg };
    }
    onProgress(100);
    const uploadResponse = await response.json();
    return { success: true, stats: uploadResponse?.stats ?? null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "שגיאה לא ידועה" };
  }
}

// ============================================================

export function useDataUpload() {
  const [state, setState] = useState<UploadState>({
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

      // Step 2: Processing Excel (client-side aggregation)
      setState((prev) => ({ ...prev, status: "processing", progress: 30 }));
      const result = await processExcelFile(file);

      if (!result.success) {
        throw new Error(result.error || "שגיאה בעיבוד הקובץ");
      }

      setState((prev) => ({ ...prev, result, progress: 60 }));

      const payload = {
        filename: file.name,
        stores: result.stores,
        products: result.products,
        storeProducts: result.storeProducts,
        filters: result.filters,
        periods: result.periods,
        stats: result.stats,
      };
      const bodyStr = JSON.stringify(payload);
      if (new Blob([bodyStr]).size > 3.5 * 1024 * 1024) {
        throw new Error("גודל הנתונים חורג מהמותר (4MB). נסה קובץ קטן יותר.");
      }

      setState((prev) => ({ ...prev, status: "uploading", progress: 70 }));

      const response = await fetch("/api/upload", {
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
          errMsg = `שגיאת שרת (${response.status}). ייתכן שחוסרות הרשאות או חיבור ל-Supabase.`;
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
