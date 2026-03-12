"use client";

import { useState, useMemo, useEffect } from "react";
import { Calendar, BarChart3, TrendingUp, TrendingDown, Minus, X, GitCompare } from "lucide-react";
import { clsx } from "clsx";
import { formatNumber } from "@/lib/calculations";
import {
  useStoreMonthlyProducts,
  type MonthlyProductRow,
} from "@/hooks/useStoreMonthlyProducts";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function formatMonthLabel(mk: string): string {
  if (!mk) return "";
  const [y, m] = mk.split("-");
  const names = ["","ינואר","פברואר","מרץ","אפריל","מאי","יוני",
                  "יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
  return `${names[parseInt(m ?? "0", 10)] ?? m} ${y}`;
}

function formatPeriodLabel(months: string[]): string {
  if (months.length === 0) return "—";
  if (months.length === 1) return formatMonthLabel(months[0]!);
  return months.map(formatMonthLabel).join(" + ");
}

const COMPARE_COLORS = [
  { bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-400"   },
  { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-400" },
  { bg: "bg-pink-100",   text: "text-pink-700",   border: "border-pink-400"   },
  { bg: "bg-teal-100",   text: "text-teal-700",   border: "border-teal-400"   },
];

function PctCell({ current, compare }: { current: number; compare: number }) {
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

// Month chip button used in both modes
function MonthChip({
  mk,
  selected,
  color,
  onClick,
}: {
  mk: string;
  selected: boolean;
  color: typeof COMPARE_COLORS[0];
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
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
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

type ViewMode = "monthly" | "periods";

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

  // ── VIEW MODE ──────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");

  // ── MONTHLY MODE state ─────────────────────
  const [selectedMonth,  setSelectedMonth]  = useState(initialMonth ?? "");
  const [compareMonths,  setCompareMonths]  = useState<string[]>([]);
  const [showCompare,    setShowCompare]    = useState(false);

  // ── PERIODS MODE state ─────────────────────
  // Period A = "base", Period B = "compare"
  const [periodA, setPeriodA] = useState<string[]>([]);
  const [periodB, setPeriodB] = useState<string[]>([]);

  // Init period defaults once months are loaded
  useEffect(() => {
    if (availableMonths.length < 2 || periodA.length > 0) return;
    // Default: latest month in A, same month one year back in B
    const latest = availableMonths[0]!;
    const [ly, lm] = latest.split("-");
    const prevYear = `${parseInt(ly!, 10) - 1}-${lm}`;
    setPeriodA([latest]);
    if (availableMonths.includes(prevYear)) setPeriodB([prevYear]);
    else if (availableMonths.length > 1) setPeriodB([availableMonths[1]!]);
  }, [availableMonths, periodA.length]);

  // When initialMonth changes (navigated from chart), update selected month
  useEffect(() => {
    if (initialMonth) {
      setSelectedMonth(initialMonth);
      setViewMode("monthly");
    }
  }, [initialMonth]);

  const currentMonth = selectedMonth || availableMonths[0] || "";

  // ── PER-MONTH LOOKUP ───────────────────────
  const byMonth = useMemo(() => {
    const map = new Map<string, MonthlyProductRow[]>();
    rows.forEach((row) => {
      if (!map.has(row.month_key)) map.set(row.month_key, []);
      map.get(row.month_key)!.push(row);
    });
    return map;
  }, [rows]);

  // ── MONTHLY MODE: current + compare rows ──
  const currentRows = useMemo(
    () => (byMonth.get(currentMonth) ?? []).sort((a, b) => b.qty - a.qty),
    [byMonth, currentMonth],
  );

  const compareSets = useMemo(() =>
    compareMonths.map((mk) => {
      const cmpRows = byMonth.get(mk) ?? [];
      const map = new Map<number, MonthlyProductRow>();
      cmpRows.forEach((r) => map.set(r.product_external_id, r));
      return { mk, rows: cmpRows, map };
    }),
    [byMonth, compareMonths],
  );
  const activeCompare = showCompare ? compareSets : [];

  // ── PERIODS MODE: aggregate per-product ────
  const periodsData = useMemo(() => {
    if (viewMode !== "periods") return [];

    // Build product aggregate maps
    type Agg = { product_external_id: number; product_name: string; qtyA: number; qtyB: number; salesA: number; returnsA: number };
    const products = new Map<number, Agg>();

    const addToMap = (mk: string, target: "A" | "B") => {
      const monthRows = byMonth.get(mk) ?? [];
      monthRows.forEach((r) => {
        if (!products.has(r.product_external_id)) {
          products.set(r.product_external_id, {
            product_external_id: r.product_external_id,
            product_name: r.product_name,
            qtyA: 0, qtyB: 0,
            salesA: 0, returnsA: 0,
          });
        }
        const p = products.get(r.product_external_id)!;
        if (target === "A") { p.qtyA += r.qty; p.salesA += r.sales; p.returnsA += r.returns_qty; }
        else                  { p.qtyB += r.qty; }
      });
    };

    periodA.forEach((mk) => addToMap(mk, "A"));
    periodB.forEach((mk) => addToMap(mk, "B"));

    return Array.from(products.values()).sort((a, b) => b.qtyA - a.qtyA);
  }, [viewMode, byMonth, periodA, periodB]);

  const togglePeriod = (target: "A" | "B", mk: string) => {
    const setter = target === "A" ? setPeriodA : setPeriodB;
    setter((prev) => prev.includes(mk) ? prev.filter((m) => m !== mk) : [...prev, mk]);
  };

  // ── LOADING / ERROR / EMPTY ────────────────
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
        <p className="text-sm text-gray-400 mt-1">יש להעלות קובץ נתוני מכירות כדי לראות פירוט חודשי לפי מוצר</p>
        <a href="/dashboard/upload" className="inline-block mt-4 text-purple-600 text-sm underline hover:text-purple-800">
          עבור להעלאת נתונים
        </a>
      </div>
    );
  }

  // ── RENDER ────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Mode toggle + Controls ── */}
      <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Mode toggle buttons */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200 text-sm">
            <button
              onClick={() => setViewMode("monthly")}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors",
                viewMode === "monthly" ? "bg-purple-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50",
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              פירוט חודש
            </button>
            <button
              onClick={() => setViewMode("periods")}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors border-r border-gray-200",
                viewMode === "periods" ? "bg-purple-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50",
              )}
            >
              <GitCompare className="w-3.5 h-3.5" />
              השוואת תקופות
            </button>
          </div>

          {/* Monthly mode: single month selector */}
          {viewMode === "monthly" && (
            <>
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
                  if (!showCompare && compareMonths.length === 0 && availableMonths.length > 1)
                    setCompareMonths([availableMonths[1]!]);
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
            </>
          )}

          {/* Periods mode: summary labels */}
          {viewMode === "periods" && (
            <span className="text-xs text-gray-400 mr-auto">{periodsData.length} מוצרים</span>
          )}
        </div>

        {/* ── Monthly: compare month chips ── */}
        {viewMode === "monthly" && showCompare && (
          <div className="flex flex-wrap gap-2 items-center pt-1 border-t border-gray-100">
            <span className="text-xs font-medium text-gray-500">השוואה לעומת:</span>
            {availableMonths.filter((mk) => mk !== currentMonth).map((mk) => {
              const selected = compareMonths.includes(mk);
              const idx = compareMonths.indexOf(mk);
              const color = (idx >= 0 ? COMPARE_COLORS[idx % COMPARE_COLORS.length] : COMPARE_COLORS[0])!;
              return (
                <MonthChip
                  key={mk} mk={mk} selected={selected} color={color}
                  onClick={() => setCompareMonths((p) =>
                    p.includes(mk) ? p.filter((m) => m !== mk) : [...p, mk]
                  )}
                />
              );
            })}
            {compareMonths.length > 0 && (
              <button onClick={() => setCompareMonths([])} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 mr-1">
                <X className="w-3 h-3" /> נקה
              </button>
            )}
          </div>
        )}

        {/* ── Periods: two groups of month chips ── */}
        {viewMode === "periods" && (
          <div className="space-y-2 pt-2 border-t border-gray-100">
            {/* Period A */}
            <div className="flex flex-wrap gap-2 items-start">
              <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded-md shrink-0">
                תקופה א׳
              </span>
              {availableMonths.map((mk) => (
                <MonthChip
                  key={mk} mk={mk}
                  selected={periodA.includes(mk)}
                  color={COMPARE_COLORS[0]!}
                  onClick={() => togglePeriod("A", mk)}
                />
              ))}
              {periodA.length > 0 && (
                <button onClick={() => setPeriodA([])} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500">
                  <X className="w-3 h-3" /> נקה
                </button>
              )}
            </div>
            {/* Period B */}
            <div className="flex flex-wrap gap-2 items-start">
              <span className="text-xs font-semibold text-orange-700 bg-orange-50 px-2 py-1 rounded-md shrink-0">
                תקופה ב׳
              </span>
              {availableMonths.map((mk) => (
                <MonthChip
                  key={mk} mk={mk}
                  selected={periodB.includes(mk)}
                  color={COMPARE_COLORS[1]!}
                  onClick={() => togglePeriod("B", mk)}
                />
              ))}
              {periodB.length > 0 && (
                <button onClick={() => setPeriodB([])} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500">
                  <X className="w-3 h-3" /> נקה
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════ */}
      {/* TABLE: MONTHLY MODE                   */}
      {/* ══════════════════════════════════════ */}
      {viewMode === "monthly" && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-purple-50 flex items-center gap-3 flex-wrap">
            <h3 className="font-bold text-purple-900">📦 {formatMonthLabel(currentMonth)}</h3>
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
                      <th key={`qty-${c.mk}`} className={clsx("px-3 py-2 text-center font-medium", color.text)}>{formatMonthLabel(c.mk)}</th>,
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
                    <td colSpan={4 + activeCompare.length * 2} className="px-4 py-8 text-center text-gray-400">
                      לא נמצאו נתונים לחודש זה
                    </td>
                  </tr>
                ) : currentRows.map((row) => (
                  <tr key={row.product_external_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-800">
                      <a href={`/dashboard/weekly/product?name=${encodeURIComponent(row.product_name)}`}
                        className="hover:text-purple-700 hover:underline" title="ראה מוצר זה בכל החנויות">
                        {row.product_name}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-center font-semibold text-gray-900">{formatNumber(row.qty)}</td>
                    {activeCompare.map((c) => {
                      const cmpRow = c.map.get(row.product_external_id);
                      return [
                        <td key={`qty-${c.mk}`} className="px-3 py-2 text-center text-gray-500">
                          {cmpRow ? formatNumber(cmpRow.qty) : "—"}
                        </td>,
                        <td key={`pct-${c.mk}`} className="px-3 py-2 text-center">
                          {cmpRow ? <PctCell current={row.qty} compare={cmpRow.qty} /> : <span className="text-gray-300 text-xs">—</span>}
                        </td>,
                      ];
                    })}
                    <td className="px-3 py-2 text-center">
                      {row.returns_qty > 0 ? (
                        <span className="text-red-600 text-xs">
                          {formatNumber(row.returns_qty)}<span className="text-gray-400 mr-1">({row.returns_pct.toFixed(1)}%)</span>
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600">₪{formatNumber(Math.round(row.sales))}</td>
                  </tr>
                ))}
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
                          {c.rows.length > 0 ? <PctCell current={totalCurrent} compare={totalCmp} /> : <span className="text-gray-300 text-xs">—</span>}
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
      )}

      {/* ══════════════════════════════════════ */}
      {/* TABLE: PERIODS MODE                   */}
      {/* ══════════════════════════════════════ */}
      {viewMode === "periods" && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-gradient-to-l from-orange-50 to-purple-50 flex items-center gap-3 flex-wrap">
            <h3 className="font-bold text-gray-900">📊 השוואת תקופות</h3>
            <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
              תקופה א׳: {formatPeriodLabel(periodA)}
            </span>
            <span className="text-xs text-gray-400">מול</span>
            <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-medium">
              תקופה ב׳: {formatPeriodLabel(periodB)}
            </span>
          </div>

          {(periodA.length === 0 || periodB.length === 0) ? (
            <div className="p-8 text-center text-gray-400">
              <GitCompare className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p>בחר חודשים לשתי התקופות כדי להשוות</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-right font-medium">מוצר</th>
                    <th className="px-3 py-2 text-center font-medium text-purple-700 bg-purple-50">
                      תקופה א׳
                      <div className="font-normal text-purple-500">{formatPeriodLabel(periodA)}</div>
                    </th>
                    <th className="px-3 py-2 text-center font-medium text-orange-700 bg-orange-50">
                      תקופה ב׳
                      <div className="font-normal text-orange-500">{formatPeriodLabel(periodB)}</div>
                    </th>
                    <th className="px-3 py-2 text-center font-medium">שינוי %</th>
                    <th className="px-3 py-2 text-center font-medium">מכירות ₪ (א׳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {periodsData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                        לא נמצאו נתונים לתקופות אלו
                      </td>
                    </tr>
                  ) : periodsData.map((row) => (
                    <tr key={row.product_external_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-800">
                        <a href={`/dashboard/weekly/product?name=${encodeURIComponent(row.product_name)}`}
                          className="hover:text-purple-700 hover:underline">
                          {row.product_name}
                        </a>
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-gray-900 bg-purple-50/30">
                        {formatNumber(row.qtyA)}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-500 bg-orange-50/30">
                        {row.qtyB > 0 ? formatNumber(row.qtyB) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {row.qtyB > 0
                          ? <PctCell current={row.qtyA} compare={row.qtyB} />
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600 text-xs">
                        {row.salesA > 0 ? `₪${formatNumber(Math.round(row.salesA))}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {periodsData.length > 0 && (
                  <tfoot className="bg-gray-50 border-t font-medium text-sm">
                    <tr>
                      <td className="px-4 py-2 text-gray-700">סה״כ</td>
                      <td className="px-3 py-2 text-center text-purple-900 bg-purple-50/30">
                        {formatNumber(periodsData.reduce((s, r) => s + r.qtyA, 0))}
                      </td>
                      <td className="px-3 py-2 text-center text-orange-900 bg-orange-50/30">
                        {formatNumber(periodsData.reduce((s, r) => s + r.qtyB, 0))}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <PctCell
                          current={periodsData.reduce((s, r) => s + r.qtyA, 0)}
                          compare={periodsData.reduce((s, r) => s + r.qtyB, 0)}
                        />
                      </td>
                      <td className="px-3 py-2 text-center text-gray-700 text-xs">
                        ₪{formatNumber(Math.round(periodsData.reduce((s, r) => s + r.salesA, 0)))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
