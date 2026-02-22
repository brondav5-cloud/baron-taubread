"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileSpreadsheet, X } from "lucide-react";

interface UploadDropZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  accentColor?: "blue" | "green";
}

export function UploadDropZone({
  onFileSelect,
  disabled,
  accentColor = "blue",
}: UploadDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const colors = {
    blue: {
      bg: "bg-blue-100",
      text: "text-blue-600",
      border: "border-blue-500",
      bgLight: "bg-blue-50",
      hoverBorder: "hover:border-blue-400",
    },
    green: {
      bg: "bg-green-100",
      text: "text-green-600",
      border: "border-green-500",
      bgLight: "bg-green-50",
      hoverBorder: "hover:border-green-400",
    },
  };
  const c = colors[accentColor];

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [disabled, onFileSelect],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [onFileSelect],
  );

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
        transition-all duration-200
        ${isDragging ? `${c.border} ${c.bgLight}` : `border-gray-300 ${c.hoverBorder} hover:bg-gray-50`}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {selectedFile ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <FileSpreadsheet className="w-8 h-8 text-green-600" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">
              {selectedFile.name}
            </span>
            <button
              onClick={clearSelection}
              className="p-1 hover:bg-gray-200 rounded-full"
              disabled={disabled}
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <span className="text-sm text-gray-500">
            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div
            className={`w-16 h-16 ${c.bg} rounded-full flex items-center justify-center`}
          >
            <Upload className={`w-8 h-8 ${c.text}`} />
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900">
              גרור קובץ Excel לכאן
            </p>
            <p className="text-sm text-gray-500 mt-1">או לחץ לבחירת קובץ</p>
          </div>
          <p className="text-xs text-gray-400">קבצים נתמכים: .xlsx, .xls</p>
        </div>
      )}
    </div>
  );
}
