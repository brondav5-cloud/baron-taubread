"use client";

// ============================================================
// SmartOrderRecommendationsTable
// One-screen view: filter by agent/driver/network/city → see
// all Smart Order recommendations for matching stores.
// Export includes store external_id for future integration.
// ============================================================

import { useMemo, useState } from "react";
import { Download, Loader2, AlertCircle, TrendingDown } from "lucide-react";
import { clsx } from "clsx";
import { useBulkOrderRecommendations } from "@/hooks/useBulkOrderRecommendations";
import { loadXlsx } from "@/lib/loadXlsx";
import type { StoreWeekComparison } from "@/hooks/useWeeklyComparison";

interface SmartOrderRecommendationsTableProps {
  stores:        StoreWeekComparison[];
  selectedWeek:  string;
}

export function SmartOrderRecommendationsTable({
  stores,
  selectedWeek,
}: SmartOrderRecommendationsTableProps) {
  const [isExporting, setIsExporting] = useState(false);

  const storeIds     = useMemo(() => stores.map((s) => s.storeExternalId), [stores]);
  const storeNames   = useMemo(() => new Map(stores.map((s) => [s.storeExternalId, s.storeName])), [stores]);
  const productNames = useMemo(() => {
    const m = new Map<string, string>();
    stores.forEach((s) =>
      s.products.forEach((p) => {
        if (!m.has(p.productNameNormalized)) m.set(p.productNameNormalized, p.productName);
      }),
    );
    return m;
  }, [stores]);

  const { rows, isLoading, error } = useBulkOrderRecommendations(
    storeIds,
    storeNames,
    productNames,
    selectedWeek,
  );

  const handleExport = async () => {
    if (rows.length === 0) return;
    setIsExporting(true);
    try {
      const XLSX = await loadXlsx();
      const fmtDate = (d: string) => {
        const [y, m, day] = d.split("-");
        return `${day}-${m}-${y}`;
      };
      const sheetData = rows.map((r) => ({
        "מזהה חנות": r.storeExternalId,
        חנות: r.storeName,
        מוצר: r.productName,
        "אספקה חודשית (יח')": r.recommendation.monthlyGrossQty,
        "חזרות חודש (יח')": r.recommendation.monthlyReturnsQty,
        "אחוז חזרות": `${r.recommendation.monthlyReturnsRate}%`,
        נורמה: `${r.recommendation.normalReturnsPct}%`,
        חריגה: `+${r.recommendation.excessReturnsPct}%`,
        "צמצום חודשי מומלץ": r.recommendation.monthlyReductionQty,
        "צמצום שבועי מומלץ": r.recommendation.weeklyReductionQty,
      }));
      const ws = XLSX.utils.json_to_sheet(sheetData);
      ws["!cols"] = [
        { wch: 12 }, { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 14 },
        { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 16 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "המלצות הזמנה");
      XLSX.writeFile(wb, `המלצות_הזמנה_${fmtDate(selectedWeek)}.xlsx`);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  if (stores.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
        <p className="font-medium">בחר פילטר (עיר, נהג, סוכן, רשת) כדי לראות המלצות</p>
        <p className="text-sm mt-1">או נקה את הפילטרים כדי לראות את כל החנויות</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-orange-600" />
          <span className="font-semibold text-orange-800">המלצות הזמנה חכמה</span>
          <span className="text-sm text-orange-600">
            {stores.length} חנויות מסוננות
          </span>
        </div>
        {rows.length > 0 && (
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            ייצא לאקסל (כולל מזהה חנות)
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 py-8 justify-center text-orange-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>טוען המלצות...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 py-4 px-4 bg-red-50 rounded-xl border border-red-200 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!isLoading && !error && rows.length === 0 && (
        <div className="text-center py-12 bg-amber-50 rounded-xl border border-amber-200">
          <p className="font-medium text-amber-800">אין מוצרים עם חזרות חריגות</p>
          <p className="text-sm text-amber-600 mt-1">
            עבור {stores.length} החנויות המסוננות — כולן במסגרת הנורמה
          </p>
          <p className="text-xs text-amber-500 mt-2">
            העלה קובץ &quot;פירוט מוצרים&quot; אם עדיין לא — ההמלצות יופיעו כאן
          </p>
        </div>
      )}

      {!isLoading && !error && rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-orange-200">
          <table className="w-full text-sm">
            <thead className="bg-orange-100 text-orange-900">
              <tr>
                <th className="text-right px-4 py-2.5 font-semibold">מזהה</th>
                <th className="text-right px-4 py-2.5 font-semibold">חנות</th>
                <th className="text-right px-4 py-2.5 font-semibold">מוצר</th>
                <th className="text-center px-3 py-2.5 font-semibold">אספקה חודשית</th>
                <th className="text-center px-3 py-2.5 font-semibold">חזרות בפועל</th>
                <th className="text-center px-3 py-2.5 font-semibold">נורמה</th>
                <th className="text-center px-3 py-2.5 font-semibold">חריגה</th>
                <th className="text-center px-3 py-2.5 font-semibold">צמצום שבועי מומלץ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100">
              {rows.map((r) => (
                <tr
                  key={`${r.storeExternalId}-${r.productNameNorm}`}
                  className="hover:bg-orange-50/50"
                >
                  <td className="px-4 py-2 font-mono text-gray-600">{r.storeExternalId}</td>
                  <td className="px-4 py-2 font-medium text-gray-900">{r.storeName}</td>
                  <td className="px-4 py-2 text-gray-800">{r.productName}</td>
                  <td className="px-3 py-2 text-center">
                    {r.recommendation.monthlyGrossQty.toLocaleString("he-IL")} יח׳
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={clsx(
                      "font-semibold",
                      r.recommendation.monthlyReturnsRate > r.recommendation.normalReturnsPct + 15
                        ? "text-red-600"
                        : "text-orange-600",
                    )}>
                      {r.recommendation.monthlyReturnsRate}%
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-green-700">
                    {r.recommendation.normalReturnsPct}%
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full text-xs">
                      +{r.recommendation.excessReturnsPct}%
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center font-medium text-orange-700">
                    {r.recommendation.weeklyReductionQty.toLocaleString("he-IL")} יח׳
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
