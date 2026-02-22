"use client";

import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, Truck, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { useDataUpload } from "@/hooks/useDataUpload";
import { useDeliveryUpload } from "@/hooks/useDeliveryUpload";
import {
  UploadDropZone,
  UploadProgress,
  UploadResult,
} from "@/components/upload";
import { DeliveryUploadResult } from "@/components/upload/DeliveryUploadResult";

type UploadTab = "sales" | "deliveries";

export default function UploadPage() {
  const [activeTab, setActiveTab] = useState<UploadTab>("sales");

  // Sales upload hook
  const salesUpload = useDataUpload();

  // Deliveries upload hook
  const deliveryUpload = useDeliveryUpload();

  const handleSalesFileSelect = useCallback(
    (file: File) => {
      salesUpload.uploadFile(file);
    },
    [salesUpload],
  );

  const handleDeliveryFileSelect = useCallback(
    (file: File) => {
      deliveryUpload.uploadFile(file);
    },
    [deliveryUpload],
  );

  const isSalesUploading = ["reading", "processing", "uploading"].includes(
    salesUpload.status,
  );
  const isDeliveryUploading = ["reading", "processing", "uploading"].includes(
    deliveryUpload.status,
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Upload className="w-7 h-7 text-blue-600" />
            העלאת נתונים
          </h1>
          <p className="text-gray-500 mt-1">העלה קבצי Excel לעדכון המערכת</p>
        </div>

        {((activeTab === "sales" && salesUpload.status !== "idle") ||
          (activeTab === "deliveries" && deliveryUpload.status !== "idle")) && (
          <button
            onClick={
              activeTab === "sales" ? salesUpload.reset : deliveryUpload.reset
            }
            disabled={
              activeTab === "sales" ? isSalesUploading : isDeliveryUploading
            }
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            התחל מחדש
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("sales")}
          className={clsx(
            "flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 -mb-px",
            activeTab === "sales"
              ? "text-blue-600 border-blue-600 bg-blue-50"
              : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50",
          )}
        >
          <FileSpreadsheet className="w-5 h-5" />
          נתוני מכירות
        </button>
        <button
          onClick={() => setActiveTab("deliveries")}
          className={clsx(
            "flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 -mb-px",
            activeTab === "deliveries"
              ? "text-green-600 border-green-600 bg-green-50"
              : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50",
          )}
        >
          <Truck className="w-5 h-5" />
          תעודות משלוח
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "sales" ? (
        <SalesUploadContent
          upload={salesUpload}
          onFileSelect={handleSalesFileSelect}
          isUploading={isSalesUploading}
        />
      ) : (
        <DeliveryUploadContent
          upload={deliveryUpload}
          onFileSelect={handleDeliveryFileSelect}
          isUploading={isDeliveryUploading}
        />
      )}
    </div>
  );
}

// ============================================
// SALES UPLOAD CONTENT
// ============================================

interface SalesUploadContentProps {
  upload: ReturnType<typeof useDataUpload>;
  onFileSelect: (file: File) => void;
  isUploading: boolean;
}

function SalesUploadContent({
  upload,
  onFileSelect,
  isUploading,
}: SalesUploadContentProps) {
  return (
    <>
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-medium text-blue-900 mb-2">הנחיות להעלאה</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>הקובץ חייב להיות בפורמט Excel (.xlsx או .xls)</li>
          <li>
            עמודות נדרשות: חודש ושנה, מזהה לקוח, שם לקוח, מוצר, כמות נטו, מכירות
          </li>
          <li>הקובץ יחליף את כל הנתונים הקיימים במערכת</li>
          <li>מומלץ לשמור snapshot לפני העלאה חדשה</li>
        </ul>
      </div>

      {/* Drop Zone */}
      <UploadDropZone onFileSelect={onFileSelect} disabled={isUploading} />

      {/* Progress */}
      {upload.status !== "idle" && (
        <UploadProgress
          status={upload.status}
          progress={upload.progress}
          error={upload.error}
        />
      )}

      {/* Result */}
      {upload.status === "success" && upload.result && (
        <UploadResult
          result={upload.result}
          serverStats={upload.uploadResponse?.stats}
        />
      )}

      {/* Success actions */}
      {upload.status === "success" && (
        <div className="flex gap-4 justify-center">
          <a
            href="/dashboard"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            עבור לדשבורד
          </a>
          <button
            onClick={upload.reset}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            העלה קובץ נוסף
          </button>
        </div>
      )}
    </>
  );
}

// ============================================
// DELIVERY UPLOAD CONTENT
// ============================================

interface DeliveryUploadContentProps {
  upload: ReturnType<typeof useDeliveryUpload>;
  onFileSelect: (file: File) => void;
  isUploading: boolean;
}

function DeliveryUploadContent({
  upload,
  onFileSelect,
  isUploading,
}: DeliveryUploadContentProps) {
  return (
    <>
      {/* Instructions */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <h3 className="font-medium text-green-900 mb-2">
          הנחיות להעלאת תעודות משלוח
        </h3>
        <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
          <li>הקובץ חייב להיות בפורמט Excel (.xlsx או .xls)</li>
          <li>
            עמודות נדרשות: תאריך מסמך, מזהה לקוח, שם לקוח, ערך כספי(לפני מעמ)
          </li>
          <li>רק שורות עם ערך כספי חיובי יילקחו (תעודות משלוח בפועל)</li>
          <li>הנתונים מצטברים - העלאות חדשות מעדכנות את הקיימות</li>
        </ul>
      </div>

      {/* What happens */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h3 className="font-medium text-gray-900 mb-2">מה יקרה אחרי ההעלאה?</h3>
        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
          <li>הנתונים יעובדו ויסוכמו לפי חנות/שבוע/חודש</li>
          <li>יחושב מספר אספקות וסכום כולל לכל חנות</li>
          <li>הנתונים יוצגו בדף חנות פרטית</li>
        </ul>
      </div>

      {/* Drop Zone */}
      <UploadDropZone
        onFileSelect={onFileSelect}
        disabled={isUploading}
        accentColor="green"
      />

      {/* Progress */}
      {upload.status !== "idle" && (
        <UploadProgress
          status={upload.status}
          progress={upload.progress}
          error={upload.error}
          accentColor="green"
        />
      )}

      {/* Result */}
      {upload.status === "success" && upload.result && (
        <DeliveryUploadResult
          result={upload.result}
          serverStats={upload.uploadResponse?.stats}
        />
      )}

      {/* Success actions */}
      {upload.status === "success" && (
        <div className="flex gap-4 justify-center">
          <a
            href="/dashboard/stores"
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            עבור לחנויות
          </a>
          <button
            onClick={upload.reset}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            העלה קובץ נוסף
          </button>
        </div>
      )}
    </>
  );
}
