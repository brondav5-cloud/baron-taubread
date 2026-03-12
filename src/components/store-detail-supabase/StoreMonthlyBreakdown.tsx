"use client";

import { useState, useMemo } from "react";
import { Calendar, BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
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

export function StoreMonthlyBreakdown({
  companyId,
  storeExternalId,
}: {
  companyId: string | null;
  storeExternalId: number | null;
}) {
  const { rows, availableMonths, isLoading, error } = useStoreMonthlyProducts(
    companyId,
    storeExternalId,
  );

  const [selectedMonth, setSelectedMonth] = useState("");
  const [compareMonth,  setCompareMonth]  = useState("");
  const [showCompare,   setShowCompare]   = useState(false);

  const currentMonth = selectedMonth || availableMonths[0] || "";
  const prevMonth    = compareMonth  || availableMonths[1] || "";

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
  const compareRows = useMemo(() => byMonth.get(prevMonth) ?? [], [byMonth, prevMonth]);
  const compareMap  = useMemo(() => {
    const m = new Map<number, MonthlyProductRow>();
    compareRows.forEach((r) => m.set(r.product_external_id, r));
    return m;
  }, [compareRows]);

  // How many columns (for colSpan calculations)
  const baseCols    = 3; // מוצר + כמות + מכירות
  const compareCols = showCompare && prevMonth ? 2 : 0;
  const totalCols   = baseCols + compareCols;

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
      <div className="bg-white rounded-2xl shadow-sm border p-4 flex flex-wrap gap-4 items-center">
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
          onClick={() => setShowCompare(!showCompare)}
          className={clsx(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            showCompare ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          )}
        >
          <BarChart3 className="w-4 h-4" />
          השוואה בין חודשים
        </button>

        {showCompare && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">לעומת:</label>
            <select
              value={prevMonth}
              onChange={(e) => setCompareMonth(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-500"
            >
              {availableMonths.filter((mk) => mk !== currentMonth).map((mk) => (
                <option key={mk} value={mk}>{formatMonthLabel(mk)}</option>
              ))}
            </select>
          </div>
        )}

        <span className="text-xs text-gray-400 mr-auto">{currentRows.length} מוצרים</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-purple-50">
          <h3 className="font-bold text-purple-900">
            📦 {formatMonthLabel(currentMonth)}
            {showCompare && prevMonth && (
              <span className="text-sm font-normal text-purple-600 mr-2">
                לעומת {formatMonthLabel(prevMonth)}
              </span>
            )}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2 text-right font-medium">מוצר</th>
                <th className="px-3 py-2 text-center font-medium">כמות</th>
                {showCompare && prevMonth && (
                  <th className="px-3 py-2 text-center font-medium">{formatMonthLabel(prevMonth)}</th>
                )}
                {showCompare && prevMonth && (
                  <th className="px-3 py-2 text-center font-medium">שינוי</th>
                )}
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
                currentRows.map((row) => {
                  const cmpRow = showCompare && prevMonth
                    ? compareMap.get(row.product_external_id)
                    : null;
                  const pct = cmpRow && cmpRow.qty > 0
                    ? ((row.qty - cmpRow.qty) / cmpRow.qty) * 100
                    : null;
                  return (
                    <tr key={row.product_external_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-800">{row.product_name}</td>
                      <td className="px-3 py-2 text-center font-semibold text-gray-900">
                        {formatNumber(row.qty)}
                      </td>
                      {showCompare && prevMonth && (
                        <td className="px-3 py-2 text-center text-gray-500">
                          {cmpRow ? formatNumber(cmpRow.qty) : "—"}
                        </td>
                      )}
                      {showCompare && prevMonth && (
                        <td className="px-3 py-2 text-center">
                          {pct === null ? (
                            <span className="text-gray-300 text-xs">—</span>
                          ) : (
                            <span className={clsx(
                              "inline-flex items-center gap-0.5 text-xs font-medium",
                              pct > 3 ? "text-green-600" : pct < -3 ? "text-red-600" : "text-gray-500",
                            )}>
                              {pct > 3 ? <TrendingUp className="w-3 h-3" /> : pct < -3 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                              {pct > 0 ? "+" : ""}{pct.toFixed(0)}%
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-3 py-2 text-center text-gray-600">
                        ₪{formatNumber(Math.round(row.sales))}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {currentRows.length > 0 && (
              <tfoot className="bg-gray-50 border-t font-medium text-sm">
                <tr>
                  <td className="px-4 py-2 text-gray-700">סה״כ</td>
                  <td className="px-3 py-2 text-center text-gray-900">
                    {formatNumber(currentRows.reduce((s, r) => s + r.qty, 0))}
                  </td>
                  {showCompare && prevMonth && (
                    <td className="px-3 py-2 text-center text-gray-500">
                      {compareRows.length > 0
                        ? formatNumber(compareRows.reduce((s, r) => s + r.qty, 0))
                        : "—"}
                    </td>
                  )}
                  {showCompare && prevMonth && <td />}
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
