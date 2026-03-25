"use client";

// ============================================================
// SmartOrderRecommendationsTable
// Two types of recommendations:
//   1. REDUCE — excess returns (from store_product_monthly_dist)
//   2. INCREASE — maximize sales (from weekly: Top-10 / avg3 > current)
// ============================================================

import { useMemo, useState } from "react";
import { Download, Loader2, AlertCircle, TrendingDown, TrendingUp } from "lucide-react";
import { clsx } from "clsx";
import { useBulkOrderRecommendations } from "@/hooks/useBulkOrderRecommendations";
import { loadXlsx } from "@/lib/loadXlsx";
import type { StoreWeekComparison, ProductWeekComparison } from "@/hooks/useWeeklyComparison";

interface SmartOrderRecommendationsTableProps {
  stores:        StoreWeekComparison[];
  selectedWeek:  string;
}

// ── Increase recommendation (maximize sales) ─────────────────────────────────

type SuggestSource = "T10" | "avg3" | "שב׳" | "כמות";

function getSuggestedQty(p: ProductWeekComparison, preferTop10: boolean): { qty: number; source: SuggestSource } {
  if (preferTop10 && p.top10Benchmark != null) return { qty: Math.round(p.top10Benchmark), source: "T10" };
  if (p.avgLast3WeeksQty != null) return { qty: Math.round(p.avgLast3WeeksQty), source: "avg3" };
  if (p.lastWeekQty != null) return { qty: p.lastWeekQty, source: "שב׳" };
  return { qty: p.grossQty, source: "כמות" };
}

const INCREASE_MIN_UNITS = 2;  // suggest increase only if +2 units or more
const INCREASE_MIN_PCT = 10;   // or +10% (whichever is more meaningful)

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

  const { rows: reduceRows, isLoading, error, hasMonthlyData } = useBulkOrderRecommendations(
    storeIds,
    storeNames,
    productNames,
    selectedWeek,
  );

  // Increase recommendations (maximize sales) — from weekly data, no extra fetch
  const increaseRows = useMemo(() => {
    const result: {
      storeExternalId: number;
      storeName: string;
      productName: string;
      productNameNorm: string;
      currentQty: number;
      suggestedQty: number;
      increaseQty: number;
      source: SuggestSource;
    }[] = [];
    for (const store of stores) {
      for (const p of store.products) {
        if (p.isIrregular) continue;
        const { qty: suggested, source } = getSuggestedQty(p, true);
        const current = p.grossQty;
        const diff = suggested - current;
        const pctDiff = current > 0 ? (diff / current) * 100 : 0;
        if (diff >= INCREASE_MIN_UNITS && pctDiff >= INCREASE_MIN_PCT) {
          result.push({
            storeExternalId: store.storeExternalId,
            storeName: store.storeName,
            productName: p.productName,
            productNameNorm: p.productNameNormalized,
            currentQty: current,
            suggestedQty,
            increaseQty: diff,
            source,
          });
        }
      }
    }
    result.sort((a, b) => b.increaseQty - a.increaseQty);
    return result;
  }, [stores]);

  const hasAnyRecommendations = reduceRows.length > 0 || increaseRows.length > 0;

  const handleExport = async () => {
    if (!hasAnyRecommendations) return;
    setIsExporting(true);
    try {
      const XLSX = await loadXlsx();
      const fmtDate = (d: string) => {
        const [y, m, day] = d.split("-");
        return `${day}-${m}-${y}`;
      };
      const wb = XLSX.utils.book_new();
      if (reduceRows.length > 0) {
        const reduceData = reduceRows.map((r) => ({
          "מזהה חנות": r.storeExternalId,
          חנות: r.storeName,
          מוצר: r.productName,
          סוג: "לצמצום",
          "אספקה חודשית (יח')": r.recommendation.monthlyGrossQty,
          "חזרות חודש (יח')": r.recommendation.monthlyReturnsQty,
          "אחוז חזרות": `${r.recommendation.monthlyReturnsRate}%`,
          נורמה: `${r.recommendation.normalReturnsPct}%`,
          חריגה: `+${r.recommendation.excessReturnsPct}%`,
          "צמצום שבועי מומלץ": r.recommendation.weeklyReductionQty,
        }));
        const wsReduce = XLSX.utils.json_to_sheet(reduceData);
        XLSX.utils.book_append_sheet(wb, wsReduce, "לצמצום");
      }
      if (increaseRows.length > 0) {
        const increaseData = increaseRows.map((r) => ({
          "מזהה חנות": r.storeExternalId,
          חנות: r.storeName,
          מוצר: r.productName,
          סוג: "להגדלה",
          "כמות נוכחית": r.currentQty,
          "מומלץ להזמין": r.suggestedQty,
          "הגדלה": r.increaseQty,
          מקור: r.source,
        }));
        const wsIncrease = XLSX.utils.json_to_sheet(increaseData);
        XLSX.utils.book_append_sheet(wb, wsIncrease, "להגדלה");
      }
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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-orange-600" />
            <span className="font-semibold text-orange-800">המלצות הזמנה חכמה</span>
          </div>
          <span className="text-sm text-orange-600">
            {stores.length} חנויות
          </span>
          {reduceRows.length > 0 && (
            <span className="text-xs bg-orange-200 text-orange-800 font-bold px-2 py-0.5 rounded-full">
              {reduceRows.length} לצמצום
            </span>
          )}
          {increaseRows.length > 0 && (
            <span className="text-xs bg-green-200 text-green-800 font-bold px-2 py-0.5 rounded-full">
              {increaseRows.length} להגדלה
            </span>
          )}
        </div>
        {hasAnyRecommendations && (
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

      {!isLoading && !error && !hasAnyRecommendations && (
        <div className={clsx(
          "text-center py-12 rounded-xl border",
          hasMonthlyData
            ? "bg-green-50 border-green-200"
            : "bg-amber-50 border-amber-200",
        )}>
          {hasMonthlyData ? (
            <>
              <p className="font-medium text-green-800">אין המלצות כרגע</p>
              <p className="text-sm text-green-600 mt-1">
                אין מוצרים עם חזרות חריגות, ואין מוצרים מתחת ל-benchmark להגדלה
              </p>
              <p className="text-xs text-green-500 mt-2">
                המלצות לצמצום: כשאחוז החזרות מעל הנורמה · להגדלה: כשהכמות נוכחית מתחת ל-Top-10 / ממוצע 3
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-amber-800">אין עדיין נתונים להמלצות הזמנה</p>
              <p className="text-sm text-amber-600 mt-1">
                העלה קובץ &quot;פירוט מוצרים&quot; בדף העלאת נתונים
              </p>
              <p className="text-xs text-amber-500 mt-2">
                הקובץ צריך לכלול: תאריך מסמך, מזהה לקוח, שם מוצר, כמות, החזרות, שבוע
              </p>
              <p className="text-xs text-amber-500 mt-1">
                אחרי ההעלאה ההמלצות יופיעו כאן
              </p>
            </>
          )}
        </div>
      )}

      {!isLoading && !error && hasAnyRecommendations && (
        <div className="space-y-6">
          {/* Reduce — excess returns */}
          {reduceRows.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-orange-800 mb-2">
                <TrendingDown className="w-4 h-4" />
                לצמצום (חזרות עודפות)
              </h3>
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
                    {reduceRows.map((r) => (
                      <tr key={`r-${r.storeExternalId}-${r.productNameNorm}`} className="hover:bg-orange-50/50">
                        <td className="px-4 py-2 font-mono text-gray-600">{r.storeExternalId}</td>
                        <td className="px-4 py-2 font-medium text-gray-900">{r.storeName}</td>
                        <td className="px-4 py-2 text-gray-800">{r.productName}</td>
                        <td className="px-3 py-2 text-center">{r.recommendation.monthlyGrossQty.toLocaleString("he-IL")} יח׳</td>
                        <td className="px-3 py-2 text-center">
                          <span className={clsx("font-semibold", r.recommendation.monthlyReturnsRate > r.recommendation.normalReturnsPct + 15 ? "text-red-600" : "text-orange-600")}>
                            {r.recommendation.monthlyReturnsRate}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center text-green-700">{r.recommendation.normalReturnsPct}%</td>
                        <td className="px-3 py-2 text-center">
                          <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full text-xs">+{r.recommendation.excessReturnsPct}%</span>
                        </td>
                        <td className="px-3 py-2 text-center font-medium text-orange-700">{r.recommendation.weeklyReductionQty.toLocaleString("he-IL")} יח׳</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Increase — maximize sales */}
          {increaseRows.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-green-800 mb-2">
                <TrendingUp className="w-4 h-4" />
                להגדלה (מקסום מכירה)
              </h3>
              <div className="overflow-x-auto rounded-xl border border-green-200">
                <table className="w-full text-sm">
                  <thead className="bg-green-100 text-green-900">
                    <tr>
                      <th className="text-right px-4 py-2.5 font-semibold">מזהה</th>
                      <th className="text-right px-4 py-2.5 font-semibold">חנות</th>
                      <th className="text-right px-4 py-2.5 font-semibold">מוצר</th>
                      <th className="text-center px-3 py-2.5 font-semibold">כמות נוכחית</th>
                      <th className="text-center px-3 py-2.5 font-semibold">מומלץ להזמין</th>
                      <th className="text-center px-3 py-2.5 font-semibold">הגדלה</th>
                      <th className="text-center px-3 py-2.5 font-semibold">מקור</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-green-100">
                    {increaseRows.map((r) => (
                      <tr key={`i-${r.storeExternalId}-${r.productNameNorm}`} className="hover:bg-green-50/50">
                        <td className="px-4 py-2 font-mono text-gray-600">{r.storeExternalId}</td>
                        <td className="px-4 py-2 font-medium text-gray-900">{r.storeName}</td>
                        <td className="px-4 py-2 text-gray-800">{r.productName}</td>
                        <td className="px-3 py-2 text-center">{r.currentQty.toLocaleString("he-IL")} יח׳</td>
                        <td className="px-3 py-2 text-center font-semibold text-green-700">{r.suggestedQty.toLocaleString("he-IL")}</td>
                        <td className="px-3 py-2 text-center">
                          <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full text-xs">+{r.increaseQty}</span>
                        </td>
                        <td className="px-3 py-2 text-center text-gray-600 text-xs">{r.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
