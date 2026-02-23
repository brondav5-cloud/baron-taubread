"use client";

import { useState, useCallback } from "react";
import { loadXlsx } from "@/lib/loadXlsx";
import { getSupabaseClient } from "@/lib/supabase/client";

// ============================================
// TYPES
// ============================================

export interface ExcelRow {
  month_year: string;
  store_external_code: string;
  store_name: string;
  network: string;
  city: string;
  product_external_code: string;
  product_name: string;
  category: string;
  qty_supplied: number;
  qty_returned: number;
  returns_pct: number;
  qty_net: number;
  sales_amount: number;
  driver: string;
  agent: string;
}

export interface UploadState {
  status:
    | "idle"
    | "parsing"
    | "preview"
    | "uploading"
    | "processing"
    | "success"
    | "error";
  fileName: string | null;
  fileSize: number | null;
  rows: ExcelRow[];
  totalRows: number;
  previewRows: ExcelRow[];
  periods: string[];
  error: string | null;
  progress: number;
  result: {
    stores_created: number;
    products_created: number;
    records_inserted: number;
  } | null;
}

// ============================================
// COLUMN MAPPING (Excel headers → our fields)
// ============================================

const COLUMN_MAP: Record<string, keyof ExcelRow> = {
  "חודש ושנה": "month_year",
  "מזהה לקוח": "store_external_code",
  "שם לקוח": "store_name",
  רשת: "network",
  עיר: "city",
  "מזהה מוצר": "product_external_code",
  מוצר: "product_name",
  "קטגורית מוצרים": "category",
  "כמות שסופק": "qty_supplied",
  חזרות: "qty_returned",
  "חזרות(%)": "returns_pct",
  "כמות נטו": "qty_net",
  "סך מחזור מכירות": "sales_amount",
  נהג: "driver",
  סוכן: "agent",
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function cleanColumnName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function parseExcelRow(
  row: Record<string, unknown>,
  columnMapping: Record<string, string>,
): ExcelRow {
  const result: ExcelRow = {
    month_year: "",
    store_external_code: "",
    store_name: "",
    network: "",
    city: "",
    product_external_code: "",
    product_name: "",
    category: "",
    qty_supplied: 0,
    qty_returned: 0,
    returns_pct: 0,
    qty_net: 0,
    sales_amount: 0,
    driver: "",
    agent: "",
  };

  for (const [excelCol, ourField] of Object.entries(columnMapping)) {
    const value = row[excelCol];

    switch (ourField) {
      case "store_external_code":
      case "product_external_code":
        result[ourField] = String(value ?? "");
        break;
      case "qty_supplied":
      case "qty_returned":
      case "qty_net":
        result[ourField] = Number(value) || 0;
        break;
      case "returns_pct":
      case "sales_amount":
        result[ourField] = Number(value) || 0;
        break;
      case "month_year":
      case "store_name":
      case "network":
      case "city":
      case "product_name":
      case "category":
      case "driver":
      case "agent":
        result[ourField] = String(value ?? "");
        break;
    }
  }

  return result;
}

function extractPeriods(rows: ExcelRow[]): string[] {
  const periods = new Set<string>();
  rows.forEach((row) => {
    if (row.month_year) {
      periods.add(row.month_year);
    }
  });
  return Array.from(periods).sort();
}

// ============================================
// HOOK
// ============================================

export function useExcelUpload(companyId: string) {
  const [state, setState] = useState<UploadState>({
    status: "idle",
    fileName: null,
    fileSize: null,
    rows: [],
    totalRows: 0,
    previewRows: [],
    periods: [],
    error: null,
    progress: 0,
    result: null,
  });

  // Reset state
  const reset = useCallback(() => {
    setState({
      status: "idle",
      fileName: null,
      fileSize: null,
      rows: [],
      totalRows: 0,
      previewRows: [],
      periods: [],
      error: null,
      progress: 0,
      result: null,
    });
  }, []);

  // Parse Excel file
  const parseFile = useCallback(async (file: File) => {
    setState((prev) => ({
      ...prev,
      status: "parsing",
      fileName: file.name,
      fileSize: file.size,
      error: null,
    }));

    try {
      const XLSX = await loadXlsx();
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error("הקובץ ריק - אין גיליונות");
      }

      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        throw new Error("לא ניתן לקרוא את הגיליון");
      }

      // Convert to JSON
      const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      if (rawData.length === 0) {
        throw new Error("הקובץ ריק - אין נתונים");
      }

      // Get column names from first row and clean them
      const rawColumns = Object.keys(rawData[0] ?? {});
      const columnMapping: Record<string, string> = {};

      for (const rawCol of rawColumns) {
        const cleanedCol = cleanColumnName(rawCol);
        const ourField = COLUMN_MAP[cleanedCol];
        if (ourField) {
          columnMapping[rawCol] = ourField;
        }
      }

      // Check required columns
      const requiredFields = [
        "month_year",
        "store_external_code",
        "store_name",
        "product_external_code",
        "product_name",
      ];
      const mappedFields = Object.values(columnMapping);
      const missingFields = requiredFields.filter(
        (f) => !mappedFields.includes(f),
      );

      if (missingFields.length > 0) {
        throw new Error(`חסרות עמודות: ${missingFields.join(", ")}`);
      }

      // Parse all rows
      const parsedRows = rawData.map((row) =>
        parseExcelRow(row, columnMapping),
      );

      // Extract unique periods
      const periods = extractPeriods(parsedRows);

      setState((prev) => ({
        ...prev,
        status: "preview",
        rows: parsedRows,
        totalRows: parsedRows.length,
        previewRows: parsedRows.slice(0, 10),
        periods,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: error instanceof Error ? error.message : "שגיאה בקריאת הקובץ",
      }));
    }
  }, []);

  // Upload to database
  const uploadToDatabase = useCallback(async () => {
    if (state.rows.length === 0) return;

    setState((prev) => ({ ...prev, status: "uploading", progress: 0 }));

    const supabase = getSupabaseClient();

    try {
      // Step 1: Create upload record
      const { data: uploadRecord, error: uploadError } = await supabase
        .from("data_uploads")
        .insert({
          company_id: companyId,
          file_name: state.fileName,
          file_size: state.fileSize,
          records_count: state.totalRows,
          periods: state.periods,
          status: "processing" as const,
        })
        .select("id")
        .single();

      if (uploadError || !uploadRecord) {
        throw new Error("שגיאה ביצירת רשומת העלאה: " + uploadError?.message);
      }

      const importId = uploadRecord.id;
      setState((prev) => ({ ...prev, progress: 10 }));

      // Step 2: Insert to staging table in batches
      const BATCH_SIZE = 500;
      const totalBatches = Math.ceil(state.rows.length / BATCH_SIZE);

      for (let i = 0; i < state.rows.length; i += BATCH_SIZE) {
        const batch = state.rows.slice(i, i + BATCH_SIZE);
        const stagingRows = batch.map((row) => ({
          import_id: importId,
          company_id: companyId,
          month_year: row.month_year,
          store_external_code: row.store_external_code,
          store_name: row.store_name,
          network: row.network,
          city: row.city,
          product_external_code: row.product_external_code,
          product_name: row.product_name,
          category: row.category,
          qty_supplied: row.qty_supplied,
          qty_returned: row.qty_returned,
          qty_net: row.qty_net,
          sales_amount: row.sales_amount,
          driver: row.driver,
          agent: row.agent,
        }));

        const { error: stagingError } = await supabase
          .from("staging_sales")
          .insert(stagingRows);

        if (stagingError) {
          throw new Error("שגיאה בהכנסת נתונים: " + stagingError.message);
        }

        const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
        const progress = 10 + (currentBatch / totalBatches) * 50;
        setState((prev) => ({ ...prev, progress }));
      }

      // Step 3: Process staging data
      setState((prev) => ({ ...prev, status: "processing", progress: 60 }));

      const { data: processResult, error: processError } = await supabase.rpc(
        "process_staging_sales",
        {
          p_import_id: importId,
          p_company_id: companyId,
        },
      );

      if (processError) {
        throw new Error("שגיאה בעיבוד הנתונים: " + processError.message);
      }

      setState((prev) => ({ ...prev, progress: 90 }));

      // Step 4: Update upload status
      await supabase
        .from("data_uploads")
        .update({ status: "completed" as const })
        .eq("id", importId);

      // Success!
      const resultData = Array.isArray(processResult)
        ? processResult[0]
        : processResult;
      const result = {
        stores_created: resultData?.stores_created ?? 0,
        products_created: resultData?.products_created ?? 0,
        records_inserted: resultData?.records_inserted ?? 0,
      };

      setState((prev) => ({
        ...prev,
        status: "success",
        progress: 100,
        result,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: error instanceof Error ? error.message : "שגיאה בהעלאה",
      }));
    }
  }, [
    state.rows,
    state.fileName,
    state.fileSize,
    state.totalRows,
    state.periods,
    companyId,
  ]);

  return {
    state,
    parseFile,
    uploadToDatabase,
    reset,
  };
}
