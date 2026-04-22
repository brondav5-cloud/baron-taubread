"use client";

import type {
  SupplierRuleConflict,
  SupplierSimilarityWarning,
} from "@/modules/finance/categories/types";

interface Props {
  conflicts: SupplierRuleConflict[];
  similarities: SupplierSimilarityWarning[];
}

export function SupplierRuleConflictsPanel({ conflicts, similarities }: Props) {
  if (conflicts.length === 0 && similarities.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
        לא נמצאו כפילויות או ספקים דומים בכללי שם ספק.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {conflicts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-amber-900">כפילויות סיווג בשם ספק</h3>
            <p className="text-xs text-amber-800 mt-1">
              אותו ספק קיים ביותר מקטגוריה אחת. מומלץ לאחד כלל כדי למנוע סיווג לא צפוי.
            </p>
          </div>
          <div className="space-y-2">
            {conflicts.map((conflict) => (
              <div key={conflict.supplier_key} className="bg-white border border-amber-100 rounded-lg px-3 py-2">
                <p className="text-sm font-medium text-gray-800">&ldquo;{conflict.supplier_display}&rdquo;</p>
                <p className="text-xs text-gray-500 mt-1">
                  משויך לקטגוריות: {conflict.categories.map((c) => c.name).join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {similarities.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-blue-900">ספקים דומים לזיהוי</h3>
            <p className="text-xs text-blue-800 mt-1">
              נמצאו וריאציות דומות (למשל עם/בלי בע&quot;מ). בדוק אם מדובר באותו ספק.
            </p>
          </div>
          <div className="space-y-2">
            {similarities.map((item) => (
              <div key={item.base_key} className="bg-white border border-blue-100 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-500">וריאציות:</p>
                <p className="text-sm text-gray-800 mt-0.5">{item.variants.join(" · ")}</p>
                <p className="text-xs text-gray-500 mt-1">
                  קטגוריות קשורות: {item.categories.map((c) => c.name).join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
