"use client";

// ============================================================
// SmartOrderPanel
// Shows inside an expanded store row when there are products
// with excess returns.  Collapsible, triggered by the user.
// Export to Excel supported for order recommendations.
// ============================================================

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, TrendingDown, AlertCircle, Loader2, Download } from "lucide-react";
import { clsx } from "clsx";
import { useOrderRecommendations } from "@/hooks/useOrderRecommendations";
import type { OrderRecommendation, PolicyBracket } from "@/lib/smartOrderEngine";
import type { ProductWeekComparison } from "@/hooks/useWeeklyComparison";
import { loadXlsx } from "@/lib/loadXlsx";

// ── Props ─────────────────────────────────────────────────────────────────

interface SmartOrderPanelProps {
  storeExternalId: number;
  storeName:       string;
  selectedWeek:    string;
  products:        ProductWeekComparison[];  // for display names
}

// ── Main component ────────────────────────────────────────────────────────

export function SmartOrderPanel({ storeExternalId, storeName, selectedWeek, products }: SmartOrderPanelProps) {
  const [open, setOpen] = useState(false);
  const { recommendations, policy, isLoading, error } = useOrderRecommendations(
    storeExternalId,
    selectedWeek,
  );

  // Enrich recommendations with proper display names from the weekly products list
  const productNameMap = new Map(products.map((p) => [p.productNameNormalized, p.productName]));

  const excessProducts: OrderRecommendation[] = [];
  recommendations.forEach((rec) => {
    if (rec.isExcess) {
      excessProducts.push({
        ...rec,
        productName: productNameMap.get(rec.productNameNormalized) ?? rec.productName,
      });
    }
  });

  // Sort by excess severity descending
  excessProducts.sort((a, b) => b.excessReturnsPct - a.excessReturnsPct);

  // Always show the panel when store is expanded, so users see the feature exists
  const hasAnyRecommendations = recommendations.size > 0;
  const showNoDataMessage = !isLoading && !error && !hasAnyRecommendations;
  const showNoExcessMessage = !isLoading && !error && hasAnyRecommendations && excessProducts.length === 0;

  // Open by default when we have feedback to show — prevents "disappears" feeling
  useEffect(() => {
    if (showNoDataMessage || showNoExcessMessage || (error != null) || excessProducts.length > 0) {
      setOpen(true);
    }
  }, [showNoDataMessage, showNoExcessMessage, error, excessProducts.length]);

  const handleExport = async () => {
    if (excessProducts.length === 0) return;
    try {
      const XLSX = await loadXlsx();
      const fmtDate = (d: string) => {
        const [y, m, day] = d.split("-");
        return `${day}-${m}-${y}`;
      };
      const sheetData = excessProducts.map((rec) => ({
        חנות: storeName,
        מוצר: rec.productName,
        "אספקה חודשית (יח')": rec.monthlyGrossQty,
        "חזרות חודש (יח')": rec.monthlyReturnsQty,
        "אחוז חזרות": `${rec.monthlyReturnsRate}%`,
        "נורמה": `${rec.normalReturnsPct}%`,
        "חריגה": `+${rec.excessReturnsPct}%`,
        "צמצום חודשי מומלץ": rec.monthlyReductionQty,
        "צמצום שבועי מומלץ": rec.weeklyReductionQty,
      }));
      const ws = XLSX.utils.json_to_sheet(sheetData);
      ws["!cols"] = [
        { wch: 20 }, { wch: 28 }, { wch: 14 }, { wch: 14 },
        { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 16 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "המלצות הזמנה");
      XLSX.writeFile(wb, `המלצות_הזמנה_${storeName.replace(/\s+/g, "_")}_${fmtDate(selectedWeek)}.xlsx`);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  return (
    <div className="border-t border-orange-200 bg-orange-50/40" dir="rtl">
      {/* Header toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-orange-100/60 transition-colors text-right"
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-orange-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-orange-500 flex-shrink-0" />
        )}
        <TrendingDown className="w-4 h-4 text-orange-600 flex-shrink-0" />
        <span className="text-sm font-semibold text-orange-800">
          המלצות הזמנה חכמה
        </span>
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 text-orange-400 animate-spin" />
        ) : excessProducts.length > 0 ? (
          <span className="text-xs bg-orange-200 text-orange-800 font-bold px-1.5 py-0.5 rounded-full">
            {excessProducts.length} מוצרים
          </span>
        ) : null}
        <span className="mr-auto text-xs text-orange-500 font-normal">
          {open ? "סגור" : excessProducts.length > 0 ? "חזרות עודפות — לחץ לפרטים ולהמלצות" : "המלצות הזמנה לפי היסטוריה"}
        </span>
        {excessProducts.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); void handleExport(); }}
            className="flex items-center gap-1.5 text-xs font-medium text-orange-700 hover:text-orange-900 hover:bg-orange-100 rounded-lg px-2 py-1 transition-colors"
            title="ייצא לאקסל"
          >
            <Download className="w-3.5 h-3.5" />
            ייצא
          </button>
        )}
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 space-y-4">
          {/* Policy legend */}
          <PolicyLegend policy={policy} />

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>טוען נתונים...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {showNoDataMessage && (
            <div className="text-sm text-amber-700 bg-amber-50 rounded-lg px-4 py-3 border border-amber-200">
              <p className="font-medium mb-1">אין עדיין נתונים להמלצות הזמנה</p>
              <p className="text-xs text-amber-600">
                העלה קובץ &quot;פירוט מוצרים&quot; בדף העלאת נתונים — ההמלצות יופיעו כאן.
              </p>
            </div>
          )}

          {showNoExcessMessage && (
            <div className="text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3 border border-green-200">
              <p className="font-medium">אין מוצרים עם חזרות חריגות</p>
              <p className="text-xs text-green-600 mt-1">כל המוצרים במסגרת הנורמה. מעולה!</p>
            </div>
          )}

          {!isLoading && excessProducts.map((rec) => (
            <ProductRecommendation key={rec.productNameNormalized} rec={rec} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Policy legend ─────────────────────────────────────────────────────────

function PolicyLegend({ policy }: { policy: PolicyBracket[] }) {
  const [show, setShow] = useState(false);
  return (
    <div className="text-xs text-orange-700">
      <button
        onClick={() => setShow((v) => !v)}
        className="underline underline-offset-2 hover:text-orange-900"
      >
        {show ? "הסתר" : "הצג"} נורמת חזרות מוגדרת
      </button>
      {show && (
        <div className="mt-1.5 flex flex-wrap gap-2">
          {policy.map((b, i) => (
            <span key={i} className="bg-orange-100 text-orange-800 rounded px-2 py-0.5">
              {b.label ?? (b.maxQty ? `${b.minQty}–${b.maxQty}` : `${b.minQty}+`)} יח׳
              {" → "}{b.normalReturnsPct}% נורמלי
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Per-product recommendation card ──────────────────────────────────────

function ProductRecommendation({ rec }: { rec: OrderRecommendation }) {
  const [expanded, setExpanded] = useState(true);

  const rateColor =
    rec.monthlyReturnsRate > rec.normalReturnsPct + 15
      ? "text-red-600"
      : "text-orange-600";

  return (
    <div className="bg-white rounded-xl border border-orange-200 overflow-hidden">
      {/* Product header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50/60 transition-colors text-right"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        )}
        <span className="font-medium text-gray-900 flex-1 text-right">{rec.productName}</span>

        {/* Rate badges */}
        <div className="flex items-center gap-3 text-xs shrink-0">
          <span className="text-gray-400">אספקה חודשית:</span>
          <span className="font-semibold text-gray-700">{rec.monthlyGrossQty.toLocaleString("he-IL")} יח׳</span>
          <span className="text-gray-400">חזרות בפועל:</span>
          <span className={clsx("font-bold", rateColor)}>{rec.monthlyReturnsRate}%</span>
          <span className="text-gray-400">נורמלי:</span>
          <span className="text-green-700 font-semibold">{rec.normalReturnsPct}%</span>
          <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
            +{rec.excessReturnsPct}% חריגה
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-orange-100 px-4 py-3 space-y-3">
          {/* Summary */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 bg-orange-50/60 rounded-lg px-3 py-2">
            <span>
              חזרות חודש: <strong className="text-red-600">{rec.monthlyReturnsQty.toLocaleString("he-IL")} יח׳</strong>
            </span>
            <span>
              צמצום חודשי מומלץ: <strong className="text-orange-700">{rec.monthlyReductionQty.toLocaleString("he-IL")} יח׳</strong>
            </span>
            <span>
              צמצום שבועי: <strong className="text-orange-700">{rec.weeklyReductionQty.toLocaleString("he-IL")} יח׳/שב׳</strong>
            </span>
          </div>

          {/* Day breakdown table */}
          {rec.dayBreakdown.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">חלוקה לפי ימי אספקה:</p>
              <div className="overflow-x-auto">
                <table className="text-sm w-auto">
                  <thead>
                    <tr className="text-xs text-gray-500">
                      <th className="text-right font-medium pb-1 pl-6">יום</th>
                      <th className="text-center font-medium pb-1 px-4">ממוצע נוכחי</th>
                      <th className="text-center font-medium pb-1 px-4">קיצוץ</th>
                      <th className="text-center font-medium pb-1 px-4">מוצע</th>
                      <th className="text-center font-medium pb-1 pl-0">חלק מהשבוע</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rec.dayBreakdown.map((d) => (
                      <tr key={d.dayOfWeek} className="border-t border-gray-100">
                        <td className="py-1 pl-6 font-medium text-gray-800 text-right">{d.dayLabel}</td>
                        <td className="py-1 px-4 text-center text-gray-700">{d.currentQty}</td>
                        <td className="py-1 px-4 text-center">
                          {d.reductionQty > 0 ? (
                            <span className="text-red-600 font-medium">−{d.reductionQty}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="py-1 px-4 text-center">
                          <span className={clsx(
                            "font-bold",
                            d.suggestedQty < d.currentQty ? "text-orange-700" : "text-gray-700",
                          )}>
                            {d.suggestedQty}
                          </span>
                        </td>
                        <td className="py-1 pl-0 text-center text-gray-400 text-xs">
                          {(d.shareOfWeek * 100).toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">
              אין נתוני ימי אספקה היסטוריים — הצמצום יחושב שוב לאחר העלאת הנתונים הבאה.
            </p>
          )}

          {/* Tracking note */}
          <p className="text-xs text-gray-400 border-t border-gray-100 pt-2">
            ✓ המערכת תעקוב אחרי השפעת השינוי בשבועות הבאים ותעדכן את ההמלצה בהתאם.
          </p>
        </div>
      )}
    </div>
  );
}
