"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Package, TrendingDown, TrendingUp, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { clsx } from "clsx";
import {
  useProductAnalysis,
  useAvailableProducts,
} from "@/hooks/useProductAnalysis";
import { TrendCell } from "@/components/weekly/WeeklyStoreRow";
import { useWeeklyComparison } from "@/hooks/useWeeklyComparison";

// ============================================================
// INNER PAGE (uses useSearchParams — must be inside Suspense)
// ============================================================

function ProductAnalysisInner() {
  const router       = useSearchParams();
  const nav          = useRouter();
  const weekly       = useWeeklyComparison();

  const initName       = router.get("name") ?? "";
  const initNormalized = router.get("normalized") ?? "";
  const initWeek       = router.get("week") ?? "";

  const [selectedWeek,    setSelectedWeek]    = useState(initWeek || weekly.selectedWeek);
  const [productSearch,   setProductSearch]   = useState(initName);
  // Use normalized name if provided (more precise match), else will be set when user picks
  const [selectedProduct, setSelectedProduct] = useState(initNormalized);

  // Sync with available weeks once loaded
  useEffect(() => {
    if (!selectedWeek && weekly.availableWeeks.length > 0) {
      setSelectedWeek(weekly.availableWeeks[0]!);
    }
  }, [weekly.availableWeeks, selectedWeek]);

  const { products }  = useAvailableProducts(selectedWeek);
  const { stores, isLoading, error } = useProductAnalysis(selectedWeek, selectedProduct);

  const filteredProducts = useMemo(() =>
    products.filter((p) =>
      !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()),
    ),
  [products, productSearch]);

  const fmtDate = (d: string) => {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  const summary = useMemo(() => ({
    total:  stores.length,
    up:     stores.filter((s) => s.vsLastWeek.direction === "up").length,
    down:   stores.filter((s) => s.vsLastWeek.direction === "down").length,
    totalQty: stores.reduce((s, r) => s + r.grossQty, 0),
    totalRet: stores.reduce((s, r) => s + r.returnsQty, 0),
  }), [stores]);

  // Table sort: by quantity (default desc) or by store name
  type SortKey = "quantity" | "store";
  const [sortKey, setSortKey] = useState<SortKey>("quantity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sortedStores = useMemo(() => {
    const list = [...stores];
    if (sortKey === "quantity") {
      list.sort((a, b) => (sortDir === "desc" ? b.grossQty - a.grossQty : a.grossQty - b.grossQty));
    } else {
      list.sort((a, b) => {
        const cmp = (a.storeName || "").localeCompare(b.storeName || "", "he");
        return sortDir === "desc" ? -cmp : cmp;
      });
    }
    return list;
  }, [stores, sortKey, sortDir]);

  const cycleQuantitySort = () => {
    if (sortKey !== "quantity") {
      setSortKey("quantity");
      setSortDir("desc");
    } else {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    }
  };

  const cycleStoreSort = () => {
    if (sortKey !== "store") {
      setSortKey("store");
      setSortDir("asc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div>
        <button
          onClick={() => nav.push("/dashboard/weekly")}
          className="text-sm text-purple-600 hover:text-purple-800 mb-2 flex items-center gap-1"
        >
          ← חזרה להשוואה שבועית
        </button>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="w-7 h-7 text-purple-600" />
          ניתוח מוצר לפי חנויות
        </h1>
        <p className="text-gray-500 mt-1">בחר שבוע ומוצר לראות את הביצועים בכל החנויות</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-start">
        {/* Week */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">שבוע:</label>
          <select
            value={selectedWeek}
            onChange={(e) => { setSelectedWeek(e.target.value); setSelectedProduct(""); }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-500"
          >
            {weekly.availableWeeks.map((w) => (
              <option key={w} value={w}>{fmtDate(w)}</option>
            ))}
          </select>
        </div>

        {/* Product search + dropdown */}
        <div className="flex flex-col gap-1 flex-1 min-w-48 max-w-xs">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="חפש מוצר..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full pl-3 pr-9 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
            />
          </div>
          {productSearch && filteredProducts.length > 0 && !selectedProduct && (
            <div className="absolute z-10 mt-8 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto w-72">
              {filteredProducts.slice(0, 20).map((p) => (
                <button
                  key={p.nameNormalized}
                  onClick={() => { setSelectedProduct(p.nameNormalized); setProductSearch(p.name); }}
                  className="w-full text-right px-3 py-2 text-sm hover:bg-purple-50 hover:text-purple-700"
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedProduct && (
          <button
            onClick={() => { setSelectedProduct(""); setProductSearch(""); }}
            className="text-xs text-gray-400 hover:text-red-500 underline self-center"
          >
            נקה בחירה
          </button>
        )}
      </div>

      {/* Product list (when no product selected) */}
      {!selectedProduct && selectedWeek && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-3 border-b bg-gray-50 text-sm font-medium text-gray-700">
            בחר מוצר מהרשימה ({filteredProducts.length} מוצרים בשבוע זה)
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-3">
            {filteredProducts.map((p) => (
              <button
                key={p.nameNormalized}
                onClick={() => { setSelectedProduct(p.nameNormalized); setProductSearch(p.name); }}
                className="text-right px-3 py-2 text-sm bg-gray-50 hover:bg-purple-50 hover:text-purple-700 rounded-lg border border-gray-200 transition-colors"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {selectedProduct && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div>
          ) : (
            <>
              {/* Summary — cubes clickable to sort table */}
              <div className="grid grid-cols-4 gap-3">
                <StatCard
                  label="חנויות"
                  value={summary.total}
                  color="gray"
                  onClick={cycleStoreSort}
                  title="מיין לפי שם חנות"
                />
                <StatCard
                  label="בעלייה"
                  value={summary.up}
                  color="green"
                  Icon={TrendingUp}
                  onClick={() => { setSortKey("quantity"); setSortDir("desc"); }}
                  title="מיין לפי כמות (הרבה→מעט)"
                />
                <StatCard
                  label="בירידה"
                  value={summary.down}
                  color="red"
                  Icon={TrendingDown}
                  onClick={() => { setSortKey("quantity"); setSortDir("desc"); }}
                  title="מיין לפי כמות (הרבה→מעט)"
                />
                <StatCard
                  label="סה״כ יח׳"
                  value={summary.totalQty}
                  color="purple"
                  onClick={cycleQuantitySort}
                  title="מיין לפי כמות — לחיצה מחליפה כיוון"
                />
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b bg-purple-50 flex items-center justify-between">
                  <h3 className="font-bold text-purple-900">
                    {productSearch || selectedProduct}
                    <span className="text-sm font-normal text-purple-600 mr-2">— {fmtDate(selectedWeek)}</span>
                  </h3>
                  {summary.totalRet > 0 && (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                      ↩ {summary.totalRet.toLocaleString("he-IL")} החזרות
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500">
                      <tr>
                        <th className="text-right px-4 py-2 font-medium">חנות</th>
                        <th className="text-center px-3 py-2 font-medium">
                          <button
                            type="button"
                            onClick={cycleQuantitySort}
                            className="inline-flex items-center gap-1 hover:text-purple-600 hover:underline focus:outline-none focus:ring-2 focus:ring-purple-400 rounded"
                            title={sortKey === "quantity" ? (sortDir === "desc" ? "מיין מהרבה למעט (לחץ להפוך)" : "מיין ממעט להרבה (לחץ להפוך)") : "מיין לפי כמות"}
                          >
                            כמות
                            {sortKey === "quantity" ? (sortDir === "desc" ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />) : <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />}
                          </button>
                        </th>
                        <th className="text-center px-3 py-2 font-medium">שב׳ קודם</th>
                        <th className="text-center px-3 py-2 font-medium">ממוצע 3</th>
                        <th className="text-center px-3 py-2 font-medium">שנה שעב׳</th>
                        <th className="text-center px-3 py-2 font-medium">Top-10</th>
                        <th className="text-center px-3 py-2 font-medium">החזרות</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sortedStores.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                            אין נתונים לשבוע ולמוצר זה
                          </td>
                        </tr>
                      ) : sortedStores.map((s) => (
                        <tr key={s.storeExternalId} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium text-gray-800">
                            <button
                              onClick={() => nav.push(`/dashboard/stores/${s.storeExternalId}`)}
                              className="hover:text-purple-700 hover:underline text-right"
                            >
                              {s.storeName}
                            </button>
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-gray-900">
                            {s.grossQty.toLocaleString("he-IL")}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <TrendCell trend={s.vsLastWeek} reference={s.lastWeekQty} />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <TrendCell trend={s.vs3WeekAvg} reference={s.avg3wQty} />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <TrendCell trend={s.vsLastYear} reference={s.lastYearQty} />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <TrendCell trend={s.vsBenchmark} reference={s.top10Benchmark} formatRef={(v) => `${Math.round(v)}`} />
                          </td>
                          <td className="px-3 py-2 text-center">
                            {s.returnsQty > 0 ? (
                              <span className={clsx(
                                "text-xs font-medium px-1.5 py-0.5 rounded",
                                s.returnsRate > 15 ? "bg-red-100 text-red-700"
                                : s.returnsRate > 7  ? "bg-orange-100 text-orange-700"
                                :                      "bg-gray-100 text-gray-600",
                              )}>
                                {s.returnsQty} ({s.returnsRate.toFixed(0)}%)
                              </span>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  label, value, color, Icon, onClick, title,
}: {
  label: string; value: number;
  color: "gray" | "green" | "red" | "purple";
  Icon?: React.ElementType;
  onClick?: () => void;
  title?: string;
}) {
  const bg   = { gray: "bg-gray-50", green: "bg-green-50", red: "bg-red-50", purple: "bg-purple-50" }[color];
  const text = { gray: "text-gray-900", green: "text-green-700", red: "text-red-700", purple: "text-purple-700" }[color];
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={title}
      className={clsx(
        `${bg} rounded-xl p-3 text-center border border-gray-100 w-full`,
        onClick && "cursor-pointer hover:ring-2 hover:ring-purple-300 transition-shadow focus:outline-none focus:ring-2 focus:ring-purple-400",
      )}
    >
      <p className={`text-2xl font-bold ${text}`}>{value.toLocaleString("he-IL")}</p>
      <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
        {Icon && <Icon className={`w-3 h-3 ${text}`} />}
        {label}
      </p>
    </Wrapper>
  );
}

// ============================================================
// PAGE EXPORT — wrapped in Suspense (useSearchParams requirement)
// ============================================================

export default function ProductAnalysisPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">טוען...</div>}>
      <ProductAnalysisInner />
    </Suspense>
  );
}
