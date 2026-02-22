"use client";

import { useCallback } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";
import type { UploadState, ExcelRow } from "./useExcelUpload";

// ============================================
// DROP ZONE
// ============================================

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function DropZone({ onFileSelect, disabled }: DropZoneProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
        onFileSelect(file);
      }
    },
    [onFileSelect, disabled],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
      e.target.value = "";
    },
    [onFileSelect],
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className={clsx(
        "border-2 border-dashed rounded-2xl p-12 text-center transition-all",
        disabled
          ? "border-gray-200 bg-gray-50 cursor-not-allowed"
          : "border-primary-300 bg-primary-50 hover:border-primary-400 hover:bg-primary-100 cursor-pointer",
      )}
    >
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileInput}
        className="hidden"
        id="excel-upload"
        disabled={disabled}
      />
      <label
        htmlFor="excel-upload"
        className={clsx(
          "flex flex-col items-center gap-4",
          !disabled && "cursor-pointer",
        )}
      >
        <div
          className={clsx(
            "w-16 h-16 rounded-full flex items-center justify-center",
            disabled ? "bg-gray-200" : "bg-primary-100",
          )}
        >
          <Upload
            className={clsx(
              "w-8 h-8",
              disabled ? "text-gray-400" : "text-primary-600",
            )}
          />
        </div>
        <div>
          <p
            className={clsx(
              "text-lg font-medium",
              disabled ? "text-gray-400" : "text-gray-700",
            )}
          >
            גרור קובץ Excel לכאן
          </p>
          <p
            className={clsx(
              "text-sm mt-1",
              disabled ? "text-gray-400" : "text-gray-500",
            )}
          >
            או לחץ לבחירת קובץ (.xlsx, .xls)
          </p>
        </div>
      </label>
    </div>
  );
}

// ============================================
// FILE INFO
// ============================================

interface FileInfoProps {
  fileName: string;
  fileSize: number;
  totalRows: number;
  periods: string[];
  onRemove: () => void;
}

export function FileInfo({
  fileName,
  fileSize,
  totalRows,
  periods,
  onRemove,
}: FileInfoProps) {
  const fileSizeFormatted = (fileSize / 1024).toFixed(1) + " KB";

  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{fileName}</p>
            <p className="text-sm text-gray-500">
              {fileSizeFormatted} • {totalRows.toLocaleString()} שורות
            </p>
          </div>
        </div>
        <button
          onClick={onRemove}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {periods.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-sm text-gray-600">
            <span className="font-medium">תקופות בקובץ:</span>{" "}
            {periods.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================
// PREVIEW TABLE
// ============================================

interface PreviewTableProps {
  rows: ExcelRow[];
  totalRows: number;
}

export function PreviewTable({ rows, totalRows }: PreviewTableProps) {
  if (rows.length === 0) return null;

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b">
        <h3 className="font-medium text-gray-900">
          תצוגה מקדימה ({rows.length} מתוך {totalRows.toLocaleString()})
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2 text-right font-medium">חודש</th>
              <th className="px-3 py-2 text-right font-medium">לקוח</th>
              <th className="px-3 py-2 text-right font-medium">מוצר</th>
              <th className="px-3 py-2 text-right font-medium">כמות נטו</th>
              <th className="px-3 py-2 text-right font-medium">מכירות</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-600">{row.month_year}</td>
                <td className="px-3 py-2 text-gray-900">{row.store_name}</td>
                <td className="px-3 py-2 text-gray-600">{row.product_name}</td>
                <td className="px-3 py-2 text-gray-900">
                  {row.qty_net.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-gray-900">
                  ₪{row.sales_amount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// PROGRESS BAR
// ============================================

interface ProgressBarProps {
  progress: number;
  status: string;
}

export function ProgressBar({ progress, status }: ProgressBarProps) {
  const statusText: Record<string, string> = {
    uploading: "מעלה נתונים...",
    processing: "מעבד נתונים...",
  };

  return (
    <div className="bg-white border rounded-xl p-6">
      <div className="flex items-center gap-4 mb-4">
        <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
        <span className="font-medium text-gray-900">
          {statusText[status] || "מעבד..."}
        </span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm text-gray-500 mt-2 text-center">{progress}%</p>
    </div>
  );
}

// ============================================
// SUCCESS MESSAGE
// ============================================

interface SuccessMessageProps {
  result: {
    stores_created: number;
    products_created: number;
    records_inserted: number;
  };
  onReset: () => void;
}

export function SuccessMessage({ result, onReset }: SuccessMessageProps) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
      <h3 className="text-lg font-bold text-green-800 mb-2">
        ההעלאה הושלמה בהצלחה!
      </h3>
      <div className="grid grid-cols-3 gap-4 my-6">
        <div className="bg-white rounded-lg p-3">
          <p className="text-2xl font-bold text-green-600">
            {result.stores_created}
          </p>
          <p className="text-sm text-gray-600">חנויות חדשות</p>
        </div>
        <div className="bg-white rounded-lg p-3">
          <p className="text-2xl font-bold text-green-600">
            {result.products_created}
          </p>
          <p className="text-sm text-gray-600">מוצרים חדשים</p>
        </div>
        <div className="bg-white rounded-lg p-3">
          <p className="text-2xl font-bold text-green-600">
            {result.records_inserted.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">רשומות מכירות</p>
        </div>
      </div>
      <button
        onClick={onReset}
        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        העלאה נוספת
      </button>
    </div>
  );
}

// ============================================
// ERROR MESSAGE
// ============================================

interface ErrorMessageProps {
  error: string;
  onRetry: () => void;
}

export function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-lg font-bold text-red-800 mb-2">שגיאה בהעלאה</h3>
      <p className="text-red-600 mb-4">{error}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        נסה שוב
      </button>
    </div>
  );
}

// ============================================
// MAIN UPLOAD COMPONENT
// ============================================

interface ExcelUploadProps {
  state: UploadState;
  onFileSelect: (file: File) => void;
  onUpload: () => void;
  onReset: () => void;
}

export function ExcelUpload({
  state,
  onFileSelect,
  onUpload,
  onReset,
}: ExcelUploadProps) {
  const {
    status,
    fileName,
    fileSize,
    totalRows,
    previewRows,
    periods,
    error,
    progress,
    result,
  } = state;

  // Idle - show drop zone
  if (status === "idle") {
    return <DropZone onFileSelect={onFileSelect} />;
  }

  // Parsing - show loading
  if (status === "parsing") {
    return (
      <div className="bg-white border rounded-xl p-12 text-center">
        <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">קורא את הקובץ...</p>
      </div>
    );
  }

  // Preview - show file info and preview
  if (status === "preview" && fileName && fileSize) {
    return (
      <div className="space-y-4">
        <FileInfo
          fileName={fileName}
          fileSize={fileSize}
          totalRows={totalRows}
          periods={periods}
          onRemove={onReset}
        />
        <PreviewTable rows={previewRows} totalRows={totalRows} />
        <div className="flex justify-center">
          <button
            onClick={onUpload}
            className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
          >
            העלה {totalRows.toLocaleString()} רשומות
          </button>
        </div>
      </div>
    );
  }

  // Uploading/Processing - show progress
  if (status === "uploading" || status === "processing") {
    return <ProgressBar progress={progress} status={status} />;
  }

  // Success
  if (status === "success" && result) {
    return <SuccessMessage result={result} onReset={onReset} />;
  }

  // Error
  if (status === "error" && error) {
    return <ErrorMessage error={error} onRetry={onReset} />;
  }

  return null;
}
