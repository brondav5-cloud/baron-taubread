"use client";

import type { ViewMode } from "@/hooks/useStoresPage";
import type { MonthSelection } from "@/components/ui";

interface CompareWarningsProps {
  viewMode: ViewMode;
  monthSelection: MonthSelection;
}

export function CompareWarnings({
  viewMode,
  monthSelection,
}: CompareWarningsProps) {
  // Warning when compare mode is on but no months selected
  if (
    viewMode === "data" &&
    monthSelection.isCompareMode &&
    monthSelection.compareMonths.length === 0
  ) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
        <span className="text-2xl">⚠️</span>
        <div>
          <p className="font-medium text-orange-800">מצב השוואה פעיל</p>
          <p className="text-sm text-orange-600">
            לחץ על בוחר התקופות ובחר חודשים בטאב &quot;להשוואה&quot; כדי לראות
            את ההשוואה
          </p>
        </div>
      </div>
    );
  }

  // Info when compare mode is on but user is in metrics view
  if (
    viewMode === "metrics" &&
    monthSelection.isCompareMode &&
    monthSelection.compareMonths.length > 0
  ) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
        <span className="text-2xl">💡</span>
        <div>
          <p className="font-medium text-blue-800">השוואת תקופות פעילה</p>
          <p className="text-sm text-blue-600">
            עבור למצב &quot;נתונים&quot; כדי לראות את ההשוואה בין התקופות
          </p>
        </div>
      </div>
    );
  }

  return null;
}
