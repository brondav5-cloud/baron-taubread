"use client";

import {
  Check,
  X,
  AlertTriangle,
  Store,
  Package,
  FileText,
  Link,
} from "lucide-react";
import type { ExcelParseResult } from "@/types/pricing";

export interface MappingStats {
  matchedById: number;
  matchedByName: number;
  unmatched: number;
  toSaveCount: number;
  fromFile: number;
  storesInSystem: number;
}

interface PricingPreviewProps {
  result: ExcelParseResult;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing: boolean;
  storesCount?: number;
  mappingStats?: MappingStats | null;
}

export function PricingPreview({
  result,
  onConfirm,
  onCancel,
  isProcessing,
  storesCount = 0,
  mappingStats,
}: PricingPreviewProps) {
  const { summary, errors, warnings } = result;
  const lowStoreCount = summary.totalRows > 100 && summary.totalStores < 20;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary-500" />
        תצוגה מקדימה
      </h2>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatBox
          icon={FileText}
          label="שורות"
          value={summary.totalRows.toLocaleString()}
        />
        <StatBox
          icon={Store}
          label="חנויות"
          value={summary.totalStores.toLocaleString()}
        />
        <StatBox
          icon={Package}
          label="מוצרים"
          value={summary.totalProducts.toLocaleString()}
        />
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <h3 className="text-red-700 font-medium mb-2 flex items-center gap-2">
            <X className="w-4 h-4" />
            שגיאות ({errors.length})
          </h3>
          <ul className="text-sm text-red-600 space-y-1 max-h-32 overflow-y-auto">
            {errors.slice(0, 10).map((err, i) => (
              <li key={i}>
                שורה {err.row}: {err.message}
              </li>
            ))}
            {errors.length > 10 && <li>...ועוד {errors.length - 10} שגיאות</li>}
          </ul>
        </div>
      )}

      {/* התאמה לחנויות במערכת – ממשק החיבור */}
      {mappingStats && (
        <div
          className={`rounded-xl p-4 mb-4 border ${
            mappingStats.unmatched > 0
              ? mappingStats.toSaveCount === 0
                ? "bg-red-50 border-red-200"
                : "bg-amber-50 border-amber-200"
              : "bg-emerald-50 border-emerald-200"
          }`}
        >
          <h3
            className="font-medium mb-2 flex items-center gap-2"
            style={{ color: "inherit" }}
          >
            <Link className="w-4 h-4" />
            התאמה לחנויות במערכת
          </h3>
          <p className="text-sm mb-2">
            בקובץ: {mappingStats.fromFile} חנויות | במערכת:{" "}
            {mappingStats.storesInSystem} חנויות
          </p>
          <ul className="text-sm space-y-0.5">
            <li>
              <strong>{mappingStats.matchedById}</strong> תואמות לפי מזהה לקוח
            </li>
            <li>
              <strong>{mappingStats.matchedByName}</strong> תואמות לפי שם חנות
            </li>
            {mappingStats.unmatched > 0 && (
              <li className="text-amber-800 font-medium">
                <strong>{mappingStats.unmatched}</strong> לא תואמות – לא ישמרו
              </li>
            )}
          </ul>
          {mappingStats.toSaveCount === 0 &&
            mappingStats.storesInSystem > 0 && (
              <p className="text-sm mt-2 text-red-700">
                וודא ש&ldquo;מזהה לקוח&rdquo; או &ldquo;שם לקוח&rdquo; בקובץ
                המחירון תואמים בדיוק לקובץ העלאת הנתונים.
              </p>
            )}
        </div>
      )}

      {/* אין חנויות במערכת */}
      {storesCount === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-red-700 font-medium">
            אין חנויות במערכת. יש לבצע תחילה &ldquo;העלאת נתונים&rdquo; מהתפריט
            הראשי.
          </p>
        </div>
      )}

      {/* Low store count hint */}
      {lowStoreCount && !mappingStats?.unmatched && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-amber-800">
            <strong>הערה:</strong> נמצאו {summary.totalStores} חנויות ייחודיות
            מתוך {summary.totalRows} שורות.
            {storesCount > 0 && ` במערכת יש ${storesCount} חנויות.`}
          </p>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
          <h3 className="text-yellow-700 font-medium mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            אזהרות ({warnings.length})
          </h3>
          <ul className="text-sm text-yellow-600 space-y-1 max-h-32 overflow-y-auto">
            {warnings.slice(0, 5).map((warn, i) => (
              <li key={i}>{warn.message}</li>
            ))}
            {warnings.length > 5 && (
              <li>...ועוד {warnings.length - 5} אזהרות</li>
            )}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onConfirm}
          disabled={
            isProcessing ||
            storesCount === 0 ||
            (mappingStats !== null &&
              mappingStats !== undefined &&
              mappingStats.toSaveCount === 0)
          }
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-50"
        >
          <Check className="w-5 h-5" />
          {isProcessing ? "שומר..." : "אישור ושמירה"}
        </button>
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 disabled:opacity-50"
        >
          ביטול
        </button>
      </div>
    </div>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 text-center">
      <Icon className="w-6 h-6 text-primary-500 mx-auto mb-2" />
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}
