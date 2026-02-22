"use client";

import { useState } from "react";
import { X, Calendar } from "lucide-react";
import { insertWorkPlanItem } from "@/lib/supabase/work-plan.queries";
import { useAuth } from "@/hooks/useAuth";
import { useStoresAndProducts } from "@/context/StoresAndProductsContext";
import { getWeekKey } from "@/hooks/work-plan/helpers";
import { getPriorityFromStatus } from "@/hooks/work-plan/helpers";
import { DAYS } from "@/hooks/work-plan";
import { toast } from "@/providers/ToastProvider";

const WEEK_OPTIONS: { value: number; label: string }[] = [
  { value: -2, label: "לפני שבועיים" },
  { value: -1, label: "שבוע שעבר" },
  { value: 0, label: "השבוע" },
  { value: 1, label: "שבוע הבא" },
  { value: 2, label: "בעוד שבועיים" },
];

interface AddVisitQuickModalProps {
  storeId: number;
  storeName: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function AddVisitQuickModal({
  storeId,
  storeName,
  onSuccess,
  onClose,
}: AddVisitQuickModalProps) {
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;
  const userId = auth.status === "authed" ? auth.user.userId : "";
  const { getStoreByExternalId } = useStoresAndProducts();
  const [weekOffset, setWeekOffset] = useState(0);
  const [day, setDay] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!companyId || !userId) return;
    const dbStore = getStoreByExternalId(storeId);
    if (!dbStore) {
      toast.error("החנות לא נמצאה");
      return;
    }
    setIsSubmitting(true);
    const weekKey = getWeekKey(weekOffset);
    const m = dbStore.metrics || {};
    const priority = getPriorityFromStatus((m.status_long as string) || "יציב");
    const result = await insertWorkPlanItem({
      company_id: companyId,
      week_key: weekKey,
      day,
      item_type: "visit",
      sort_order: 999,
      priority,
      completed: false,
      created_by: userId,
      store_id: dbStore.external_id,
      store_name: dbStore.name,
      store_city: dbStore.city || undefined,
      store_agent: dbStore.agent || undefined,
    });
    setIsSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    const weekLabel =
      WEEK_OPTIONS.find((w) => w.value === weekOffset)?.label ?? "השבוע";
    toast.success(`הוספנו את ${storeName} לתכנון - ${weekLabel}`);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-500" />
            <h3 className="font-bold text-lg">
              הוסף לתכנון עבודה: {storeName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              שבוע עבודה
            </label>
            <select
              value={weekOffset}
              onChange={(e) => setWeekOffset(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-xl text-sm"
            >
              {WEEK_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              יום בשבוע
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((name, i) => (
                <button
                  key={i}
                  onClick={() => setDay(i)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    day === i
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-50"
          >
            {isSubmitting ? "מוסיף..." : "הוסף לתכנון"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-xl text-gray-600 hover:bg-gray-50"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
