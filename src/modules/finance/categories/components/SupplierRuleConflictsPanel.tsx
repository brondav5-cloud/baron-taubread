"use client";

import type { SupplierRuleConflict } from "@/modules/finance/categories/types";

interface Props {
  conflicts: SupplierRuleConflict[];
}

export function SupplierRuleConflictsPanel({ conflicts }: Props) {
  if (conflicts.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
        לא נמצאו כפילויות בכללי שם ספק.
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-amber-900">כפילויות סיווג בשם ספק</h3>
        <p className="text-xs text-amber-800 mt-1">
          נמצאו ספקים שמופיעים ביותר מקטגוריה אחת. מומלץ לאחד כלל כדי למנוע סיווג לא צפוי.
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
  );
}
