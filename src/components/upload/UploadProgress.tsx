"use client";

import {
  CheckCircle,
  XCircle,
  Loader2,
  FileSpreadsheet,
  Upload,
  Database,
} from "lucide-react";
type UploadStatus =
  | "idle"
  | "reading"
  | "processing"
  | "uploading"
  | "success"
  | "error";

interface UploadProgressProps {
  status: UploadStatus;
  progress: number;
  error: string | null;
  accentColor?: "blue" | "green" | "purple";
}

function getStatusConfig(accentColor: "blue" | "green" | "purple") {
  const activeColor =
    accentColor === "green"
      ? "text-green-500"
      : accentColor === "purple"
        ? "text-purple-500"
        : "text-blue-500";
  return {
    idle: { icon: Upload, text: "ממתין להעלאה", color: "text-gray-400" },
    reading: {
      icon: FileSpreadsheet,
      text: "קורא קובץ...",
      color: activeColor,
    },
    processing: { icon: Loader2, text: "מעבד נתונים...", color: activeColor },
    uploading: { icon: Database, text: "שומר בשרת...", color: activeColor },
    success: {
      icon: CheckCircle,
      text: "הושלם בהצלחה!",
      color: "text-green-500",
    },
    error: { icon: XCircle, text: "שגיאה", color: "text-red-500" },
  };
}

export function UploadProgress({
  status,
  progress,
  error,
  accentColor = "blue",
}: UploadProgressProps) {
  const statusConfig = getStatusConfig(accentColor);
  const config = statusConfig[status];
  const Icon = config.icon;
  const isLoading = ["reading", "processing", "uploading"].includes(status);
  const barColor =
    accentColor === "green"
      ? "bg-green-500"
      : accentColor === "purple"
        ? "bg-purple-500"
        : "bg-blue-500";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className={`${config.color} ${isLoading ? "animate-spin" : ""}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className={`font-medium ${config.color}`}>{config.text}</p>
          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
      </div>

      {/* Progress bar */}
      {status !== "idle" && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              status === "error"
                ? "bg-red-500"
                : status === "success"
                  ? "bg-green-500"
                  : barColor
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Steps indicator */}
      <div className="flex justify-between mt-4 text-xs text-gray-500">
        <Step
          label="קריאת קובץ"
          isActive={status === "reading"}
          isDone={["processing", "uploading", "success"].includes(status)}
          accentColor={accentColor}
        />
        <Step
          label="עיבוד נתונים"
          isActive={status === "processing"}
          isDone={["uploading", "success"].includes(status)}
          accentColor={accentColor}
        />
        <Step
          label="שמירה בשרת"
          isActive={status === "uploading"}
          isDone={status === "success"}
          accentColor={accentColor}
        />
        <Step
          label="הושלם"
          isActive={status === "success"}
          isDone={false}
          accentColor={accentColor}
        />
      </div>
    </div>
  );
}

function Step({
  label,
  isActive,
  isDone,
  accentColor = "blue",
}: {
  label: string;
  isActive: boolean;
  isDone: boolean;
  accentColor?: "blue" | "green" | "purple";
}) {
  const activeTextColor =
    accentColor === "green"
      ? "text-green-600"
      : accentColor === "purple"
        ? "text-purple-600"
        : "text-blue-600";
  const activeBgColor =
    accentColor === "green"
      ? "bg-green-500"
      : accentColor === "purple"
        ? "bg-purple-500"
        : "bg-blue-500";

  return (
    <div
      className={`flex items-center gap-1 ${isActive ? `${activeTextColor} font-medium` : isDone ? "text-green-600" : ""}`}
    >
      <div
        className={`w-2 h-2 rounded-full ${
          isDone ? "bg-green-500" : isActive ? activeBgColor : "bg-gray-300"
        }`}
      />
      {label}
    </div>
  );
}
