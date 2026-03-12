"use client";

import { useState, useMemo, useEffect } from "react";
import { Calendar, BarChart3, TrendingUp, TrendingDown, Minus, X } from "lucide-react";
import { clsx } from "clsx";
import { formatNumber } from "@/lib/calculations";
import {
  useStoreMonthlyProducts,
  type MonthlyProductRow,
} from "@/hooks/useStoreMonthlyProducts";

function formatMonthLabel(mk: string): string {
  if (!mk) return "";
  const [y, m] = mk.split("-");
  const names = ["","ינואר","פברואר","מרץ","אפריל","מאי","יוני",
                  "יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
  return `${names[parseInt(m ?? "0", 10)] ?? m} ${y}`;
}

// Short month colors for compare pills
const COMPARE_COLORS = [
  { bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-400"   },
  { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-400" },
  { bg: "bg-pink-100",   text: "text-pink-700",   border: "border-pink-400"   },
  { bg: "bg-teal-100",   text: "text-teal-700",   border: "border-teal-400"   },
];

function pctCell(current: number, compare: number) {
  const pct = compare > 0 ? ((current - compare) / compare) * 100 : null;
  if (pct === null) return <span className="text-gray-300 text-xs">—</span>;
  return (
    <span className={clsx(
      "inline-flex items-center gap-0.5 text-xs font-medium",
      pct > 3 ? "text-green-600" : pct < -3 ? "text-red-600" : "text-gray-500",
    )}>
      {pct > 3 ? <TrendingUp className="w-3 h-3" /> : pct < -3 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
      {pct > 0 ? "+" : ""}{pct.toFixed(0)}%
    </span>
  );
}

export function StoreMonthlyBreakdown({
  companyId,
  storeExternalId,
  initialMonth,
}: {
  companyId: string | null;
  storeExternalId: number | null;
  initialMonth?: string;
}) {
  const { rows, availableMonths, isLoading, error } = useStoreMonthlyProducts(
    companyId,
    storeExternalId,
  );

  const [selectedMonth,  setSelectedMonth]  = useState(initialMonth ?? "");
  const [compareMonths,  setCompareMonths]  = useState<string[]>([]);
  const [showCompare,    setShowCompare]    = useState(false);

  // When initialMonth changes (navigated from chart), update selected month
  useEffect(() => {
    if (initialMonth) {
      setSelectedMonth(initialMonth);
    }
  }, [initialMonth]);

  // Default: pick first available month once loaded
  const currentMonth = selectedMonth || availableMonths[0] || "";

  // Build per-month lookup
  const byMonth = useMemo(() => {
    const map = new Map<string, MonthlyProductRow[]>();
    rows.forEach((row) => {
      if (!map.has(row.month_key)) map.set(row.month_key, []);
      map.get(row.month_key)!.push(row);
    });
    return map;
  }, [rows]);

  const currentRows = useMemo(
    () => (byMonth.get(currentMonth) ?? []).sort((a, b) => b.qty - a.qty),
    [byMonth, currentMonth],
  );

  // For each compare month: rows + lookup map
  const compareSets = useMemo(() =>
    compareMonths.map((mk) => {
      const cmpRows = byMonth.get(mk) ?? [];
      const map = new Map<number, MonthlyProductRow>();
      cmpRows.forEach((r) => map.set(r.product_external_id, r));
      return { mk, rows: cmpRows, map };
    }),
    [byMonth, compareMonths],
  );

  // Active compare months (those that are toggled AND exist)
  const activeCompare = showCompare ? compareSets : [];

  // Total columns
  const totalCols = 4 + activeCompare.length * 2; // מוצר + כמות + (כמות_השוואה + שינוי)*N + חזרות + מכירות

  const toggleCompareMonth = (mk: string) => {
    setCompareMonths((prev) =>
      prev.includes(mk) ? prev.filter((m) => m !== mk) : [...prev, mk],
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400 animate-pulse">
        טוען נתונים חודשיים...
      </div>
    );
  }
  if (error) {
    return <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-red-500">{error}</div>;
  }
  if (availableMonths.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500 font-medium">אין נתונים חודשיים עדיין</p>
        <p className="text-sm text-gray-400 mt-1">
          יש להעלות קובץ נתוני מכירות כדי לראות פירוט חודשי לפי מוצר
        </p>
        <a href="/dashboard/upload" className="inline-block mt-4 text-purple-600 text-sm underline hover:text-purple-800">
          עבור להעלאת נתונים
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-3">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">חודש:</label>
            <select
              value={currentMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-500"
            >
              {availableMonths.map((mk) => (
                <option key={mk} value={mk}>{formatMonthLabel(mk)}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setShowCompare(!showCompare);
              if (!showCompare && compareMonths.length === 0 && availableMonths.length > 1) {
                setCompareMonths([availableMonths[1]!]);
              }
            }}
            className={clsx(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              showCompare ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
          >
            <BarChart3 className="w-4 h-4" />
            השוואה בין חודשים
          </button>

          <span className="text-xs text-gray-400 mr-auto">{currentRows.length} מוצרים</span>
        </div>

        {/* Multi-month selector pills */}
        {showCompare && (
          <div className="flex flex-wrap gap-2 items-center pt-1 border-t border-gray-100">
            <span className="text-xs font-medium text-gray-500">השוואה לעומת:</span>
            {availableMonths.filter((mk) => mk !== currentMonth).map((mk) => {
              const selected = compareMonths.includes(mk);
              const color = COMPARE_COLORS[compareMonths.indexOf(mk) % COMPARE_COLORS.length] ??
                            COMPARE_COLORS[0]!;
              return (
                <button
                  key={mk}
                  onClick={() => toggleCompareMonth(mk)}
                  className={clsx(
                    "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                    selected
                      ? `${color.bg} ${color.text} ${color.border}`
                      : "bg-white text-gray-500 border-gray-300 hover:border-purple-400",
                  )}
                >
                  {formatMonthLabel(mk)}
                </button>
              );
            })}
            {compareMonths.length > 0 && (
              <button
                onClick={() => setCompareMonths([])}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 mr-1"
              >
                <X className="w-3 h-3" /> נקה
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-purple-50 flex items-center gap-3 flex-wrap">
          <h3 className="font-bold text-purple-900">
            📦 {formatMonthLabel(currentMonth)}
          </h3>
          {activeCompare.map((c, i) => {
            const color = COMPARE_COLORS[i % COMPARE_COLORS.length]!;
            return (
              <span key={c.mk} className={clsx("text-xs font-medium px-2 py-0.5 rounded-full", color.bg, color.text)}>
                לעומת {formatMonthLabel(c.mk)}
              </span>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2 text-right font-medium">מוצר</th>
                <th className="px-3 py-2 text-center font-medium">כמות נטו</th>
                {activeCompare.map((c, i) => {
                  const color = COMPARE_COLORS[i % COMPARE_COLORS.length]!;
                  return [
                    <th key={`qty-${c.mk}`} className={clsx("px-3 py-2 text-center font-medium", color.text)}>
                      {formatMonthLabel(c.mk)}
                    </th>,
                    <th key={`pct-${c.mk}`} className="px-3 py-2 text-center font-medium">שינוי</th>,
                  ];
                })}
                <th className="px-3 py-2 text-center font-medium">חזרות</th>
                <th className="px-3 py-2 text-center font-medium">מכירות ₪</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan={totalCols} className="px-4 py-8 text-center text-gray-400">
                    לא נמצאו נתונים לחודש זה
                  </td>
                </tr>
              ) : (
                currentRows.map((row) => (
                  <tr key={row.product_external_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-800">
                      <a
                        href={`/dashboard/weekly/product?name=${encodeURIComponent(row.product_name)}`}
                        className="hover:text-purple-700 hover:underline"
                        title="ראה מוצר זה בכל החנויות"
                      >
                        {row.product_name}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-center font-semibold text-gray-900">
                      {formatNumber(row.qty)}
                    </td>
                    {activeCompare.map((c) => {
                      const cmpRow = c.map.get(row.product_external_id);
                      return [
                        <td key={`qty-${c.mk}`} className="px-3 py-2 text-center text-gray-500">
                          {cmpRow ? formatNumber(cmpRow.qty) : "—"}
                        </td>,
                        <td key={`pct-${c.mk}`} className="px-3 py-2 text-center">
                          {cmpRow ? pctCell(row.qty, cmpRow.qty) : <span className="text-gray-300 text-xs">—</span>}
                        </td>,
                      ];
                    })}
                    <td className="px-3 py-2 text-center">
                      {row.returns_qty > 0 ? (
                        <span className="text-red-600 text-xs">
                          {formatNumber(row.returns_qty)}
                          <span className="text-gray-400 mr-1">({row.returns_pct.toFixed(1)}%)</span>
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600">
                      ₪{formatNumber(Math.round(row.sales))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {currentRows.length > 0 && (
              <tfoot className="bg-gray-50 border-t font-medium text-sm">
                <tr>
                  <td className="px-4 py-2 text-gray-700">סה״כ</td>
                  <td className="px-3 py-2 text-center text-gray-900">
                    {formatNumber(currentRows.reduce((s, r) => s + r.qty, 0))}
                  </td>
                  {activeCompare.map((c) => {
                    const totalCurrent = currentRows.reduce((s, r) => s + r.qty, 0);
                    const totalCmp = c.rows.reduce((s, r) => s + r.qty, 0);
                    return [
                      <td key={`tot-qty-${c.mk}`} className="px-3 py-2 text-center text-gray-500">
                        {c.rows.length > 0 ? formatNumber(totalCmp) : "—"}
                      </td>,
                      <td key={`tot-pct-${c.mk}`} className="px-3 py-2 text-center">
                        {c.rows.length > 0 ? pctCell(totalCurrent, totalCmp) : <span className="text-gray-300 text-xs">—</span>}
                      </td>,
                    ];
                  })}
                  <td className="px-3 py-2 text-center text-red-600 text-xs">
                    {formatNumber(currentRows.reduce((s, r) => s + r.returns_qty, 0))}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-700">
                    ₪{formatNumber(Math.round(currentRows.reduce((s, r) => s + r.sales, 0)))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
