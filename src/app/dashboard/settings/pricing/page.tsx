"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Receipt, CheckCircle, Upload } from "lucide-react";
import { usePricing } from "@/hooks/usePricing";
import { usePricingUpload } from "@/hooks/usePricingUpload";
import { useStoresAndProducts } from "@/context/StoresAndProductsContext";
import { useAuth } from "@/hooks/useAuth";
import {
  PricingUploadZone,
  PricingPreview,
  PricingStoresList,
} from "@/components/settings";
import { PageHeader } from "@/components/ui";

export default function PricingPage() {
  const auth = useAuth();
  const router = useRouter();
  const { index, storesWithPricingStatus, hasPricingData, refresh } =
    usePricing();
  const { stores } = useStoresAndProducts();
  const upload = usePricingUpload(refresh, stores);

  const role =
    auth.status === "authed"
      ? auth.user.selectedCompanyRole ?? auth.user.role
      : null;
  const isAdmin = role === "admin" || role === "super_admin";

  useEffect(() => {
    if (auth.status !== "loading" && !isAdmin) {
      router.replace("/dashboard/settings");
    }
  }, [auth.status, isAdmin, router]);

  if (auth.status === "loading" || !isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="ניהול מחירון"
        subtitle="העלאה ועריכת מחירונים לחנויות"
        icon={<Receipt className="w-6 h-6" />}
      />

      {/* Success Message */}
      {upload.status === "success" && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <div>
            <p className="font-medium text-green-800">המחירון נשמר בהצלחה!</p>
            <p className="text-sm text-green-600">
              {index?.totalStores} חנויות | {index?.totalProducts} מוצרים
            </p>
          </div>
          <button
            onClick={upload.reset}
            className="mr-auto text-sm text-green-700 hover:underline"
          >
            העלה קובץ נוסף
          </button>
        </div>
      )}

      {/* Upload or Preview */}
      {upload.status !== "success" &&
        (upload.status === "preview" && upload.result ? (
          <PricingPreview
            result={upload.result}
            onConfirm={upload.confirm}
            onCancel={upload.reset}
            isProcessing={upload.isProcessing}
            storesCount={stores.length}
            mappingStats={upload.mappingStats}
          />
        ) : (
          <PricingUploadZone
            onFileSelect={upload.handleFile}
            isProcessing={upload.isProcessing}
            error={upload.error}
            fileName={upload.fileName}
          />
        ))}

      {/* Current Pricing Info */}
      {hasPricingData && upload.status !== "preview" && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5 text-blue-500" />
            <div>
              <p className="font-medium text-blue-800">מחירון קיים במערכת</p>
              <p className="text-sm text-blue-600">
                {index?.totalStores} חנויות | עודכן:{" "}
                {index?.lastUpdated
                  ? new Date(index.lastUpdated).toLocaleDateString("he-IL")
                  : "-"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stores List */}
      {upload.status !== "preview" && (
        <PricingStoresList index={index} stores={storesWithPricingStatus} />
      )}
    </div>
  );
}
