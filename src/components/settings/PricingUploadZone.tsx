"use client";

import { useCallback, useRef } from "react";
import { Upload, FileSpreadsheet, AlertCircle, Loader2 } from "lucide-react";
import { clsx } from "clsx";

interface PricingUploadZoneProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  error: string | null;
  fileName: string | null;
}

export function PricingUploadZone({
  onFileSelect,
  isProcessing,
  error,
  fileName,
}: PricingUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect],
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Upload className="w-5 h-5 text-primary-500" />
        העלאת קובץ מחירון
      </h2>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
          isProcessing
            ? "border-gray-200 bg-gray-50"
            : error
              ? "border-red-300 bg-red-50"
              : "border-gray-300 hover:border-primary-400 hover:bg-primary-50",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleChange}
          className="hidden"
          disabled={isProcessing}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-3" />
            <p className="text-gray-600">מעבד את הקובץ...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
            <p className="text-red-600 font-medium">{error}</p>
            <p className="text-sm text-gray-500 mt-2">לחץ לבחירת קובץ אחר</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <FileSpreadsheet className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-gray-600 font-medium">גרור קובץ Excel לכאן</p>
            <p className="text-sm text-gray-400 mt-1">או לחץ לבחירה</p>
            <p className="text-xs text-gray-400 mt-3">.xlsx או .xls</p>
          </div>
        )}
      </div>

      {fileName && !error && !isProcessing && (
        <p className="text-sm text-gray-500 mt-3">קובץ נבחר: {fileName}</p>
      )}

      <div className="mt-6 p-4 bg-gray-50 rounded-xl text-sm text-gray-700 border border-gray-100">
        <p className="font-medium text-gray-800 mb-2">
          פורמט נדרש (שורה ראשונה = כותרת):
        </p>
        <p className="font-mono text-xs">
          <span className="text-primary-600">A</span> מזהה מוצר •
          <span className="text-primary-600"> B</span> מזהה חנות •
          <span className="text-primary-600"> C</span> שם לקוח •
          <span className="text-primary-600"> D</span> קו חלוקה •
          <span className="text-primary-600"> E</span> נהג •
          <span className="text-primary-600"> F</span> מע״מ •
          <span className="text-primary-600"> G</span> מחיר •
          <span className="text-primary-600"> H</span> הנחה •
          <span className="text-primary-600"> I</span> לאחר הנחה
        </p>
      </div>
    </div>
  );
}
