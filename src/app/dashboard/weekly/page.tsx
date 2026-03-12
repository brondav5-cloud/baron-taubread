"use client";

import { useState, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  AlertTriangle,
  Upload,
  Search,
} from "lucide-react";
import { clsx } from "clsx";
import {
  useWeeklyComparison,
  type StoreWeekComparison,
  type ProductWeekComparison,
  type TrendResult,
} from "@/hooks/useWeeklyComparison";

// ============================================================
// MAIN PAGE
// ============================================================

export default function WeeklyPage() {
  const weekly = useWeeklyComparison();
  const [expandedStores, setExpandedStores] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTrend, setFilterTrend] = useState<"all" | "down" | "up" | "stable">("all");

  const toggleStore = (id: number) => {
    setExpandedStores((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll   = () => setExpandedStores(new Set(weekly.stores.map((s) => s.storeExternalId)));
  const collapseAll = () => setExpandedStores(new Set());

  // Filter stores by search + trend
  const filteredStores = useMemo(() => {
    return weekly.stores.filter((store) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!store.storeName.toLowerCase().includes(q)) return false;
      }
      if (filterTrend !== "all") {
        if (store.overallTrend.direction !== filterTrend) return false;
      }
      return true;
    });
  }, [weekly.stores, searchQuery, filterTrend]);

  // Summary counts
  const summary = useMemo(() => {
    const up     = weekly.stores.filter((s) => s.overallTrend.direction === "up").length;
    const down   = weekly.stores.filter((s) => s.overallTrend.direction === "down").length;
    const stable = weekly.stores.filter((s) => s.overallTrend.direction === "stable").length;
    return { up, down, stable, total: weekly.stores.length };
  }, [weekly.stores]);

  const formatDate = (d: string) => {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  if (weekly.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  if (weekly.availableWeeks.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <PageHeader />
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">אין נתונים עדיין</h3>
          <p className="text-gray-500 mb-6">
            יש להעלות קובץ פירוט מוצרים לפני שניתן לראות את ניתוח המגמות
          </p>
          <a
            href="/dashboard/upload"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
          >
            <Upload className="w-4 h-4" />
            העלה קובץ פירוט מוצרים
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <PageHeader />

      {/* Controls bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-center justify-between">
        {/* Week selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">שבוע:</label>
          <select
            value={weekly.selectedWeek}
            onChange={(e) => weekly.selectWeek(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            {weekly.availableWeeks.map((w) => (
              <option key={w} value={w}>
                {formatDate(w)}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="חיפוש חנות..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Trend filter */}
        <div className="flex gap-1">
          {(["all", "down", "up", "stable"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterTrend(t)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                filterTrend === t
                  ? t === "down"
                    ? "bg-red-100 text-red-700 ring-1 ring-red-300"
                    : t === "up"
                      ? "bg-green-100 text-green-700 ring-1 ring-green-300"
                      : "bg-gray-200 text-gray-700 ring-1 ring-gray-400"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100",
              )}
            >
              {t === "all" ? "הכל" : t === "down" ? "↓ ירידה" : t === "up" ? "↑ עלייה" : "→ יציב"}
            </button>
          ))}
        </div>

        {/* Show excluded */}
        <button
          onClick={() => weekly.setShowExcluded(!weekly.showExcluded)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
        >
          {weekly.showExcluded ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {weekly.showExcluded ? "הסתר מוחרגים" : "הצג מוחרגים"}
        </button>

        {/* Expand/collapse */}
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="text-xs text-purple-600 hover:text-purple-800 underline"
          >
            פתח הכל
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={collapseAll}
            className="text-xs text-purple-600 hover:text-purple-800 underline"
          >
            סגור הכל
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3">
        <SummaryCard label="סה״כ חנויות" value={summary.total} color="gray" />
        <SummaryCard label="בעלייה" value={summary.up} color="green" icon="up" />
        <SummaryCard label="ביציבות" value={summary.stable} color="yellow" icon="stable" />
        <SummaryCard label="בירידה" value={summary.down} color="red" icon="down" />
      </div>

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg px-4 py-2 text-xs text-gray-500 flex flex-wrap gap-4">
        <span className="font-medium text-gray-700">מדדים:</span>
        <span><span className="font-mono text-gray-700">שב׳ קודם</span> — לעומת שבוע שעבר</span>
        <span><span className="font-mono text-gray-700">ממוצע 3</span> — ממוצע 3 שבועות אחרונים</span>
        <span><span className="font-mono text-gray-700">שנה שעב׳</span> — אותו שבוע שנה שעברה</span>
        <span><span className="font-mono text-gray-700">Top-10</span> — ממוצע 10 האספקות הגדולות (12 חודש)</span>
      </div>

      {/* Stores list */}
      {weekly.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{weekly.error}</span>
        </div>
      )}

      <div className="space-y-2">
        {filteredStores.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            לא נמצאו חנויות התואמות את הסינון
          </div>
        ) : (
          filteredStores.map((store) => (
            <StoreRow
              key={store.storeExternalId}
              store={store}
              isExpanded={expandedStores.has(store.storeExternalId)}
              onToggle={() => toggleStore(store.storeExternalId)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// PAGE HEADER
// ============================================================

function PageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <BarChart3 className="w-7 h-7 text-purple-600" />
        השוואה שבועית
      </h1>
      <p className="text-gray-500 mt-1">
        מגמות אספקה לפי חנות ומוצר — ביחס לשבוע קודם, ממוצע 3 שבועות, שנה שעברה ו-Top-10
      </p>
    </div>
  );
}

// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: "gray" | "green" | "yellow" | "red";
  icon?: "up" | "stable" | "down";
}) {
  const bg = { gray: "bg-gray-50", green: "bg-green-50", yellow: "bg-yellow-50", red: "bg-red-50" }[color];
  const text = { gray: "text-gray-900", green: "text-green-700", yellow: "text-yellow-700", red: "text-red-700" }[color];

  return (
    <div className={`${bg} rounded-xl p-3 text-center border border-gray-100`}>
      <p className={`text-2xl font-bold ${text}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
        {icon === "up" && <TrendingUp className="w-3 h-3 text-green-600" />}
        {icon === "down" && <TrendingDown className="w-3 h-3 text-red-600" />}
        {icon === "stable" && <Minus className="w-3 h-3 text-yellow-600" />}
        {label}
      </p>
    </div>
  );
}

// ============================================================
// STORE ROW
// ============================================================

function StoreRow({
  store,
  isExpanded,
  onToggle,
}: {
  store: StoreWeekComparison;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const trendBg =
    store.overallTrend.direction === "down"
      ? "border-red-200 bg-red-50/30"
      : store.overallTrend.direction === "up"
        ? "border-green-200 bg-green-50/30"
        : "border-gray-200 bg-white";

  return (
    <div className={`rounded-xl border ${trendBg} overflow-hidden`}>
      {/* Store header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-black/5 transition-colors text-right"
      >
        <div className="text-gray-400">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>

        <div className="flex-1 flex items-center gap-3 flex-wrap">
          <span className="font-medium text-gray-900">{store.storeName}</span>
          <TrendBadge trend={store.overallTrend} />
        </div>

        <div className="flex items-center gap-6 text-sm text-gray-500 shrink-0">
          <span>
            <span className="font-semibold text-gray-800">{store.totalGrossQty.toLocaleString("he-IL")}</span>
            <span className="text-xs mr-1">יח׳</span>
          </span>
          {store.totalReturnsQty > 0 && (
            <span className="text-red-500 text-xs">
              ↩ {store.totalReturnsQty.toLocaleString("he-IL")}
            </span>
          )}
          <span className="text-xs text-gray-400">
            {store.products.length} פריטים
          </span>
        </div>
      </button>

      {/* Product table */}
      {isExpanded && (
        <div className="border-t border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="text-right px-4 py-2 font-medium">מוצר</th>
                <th className="text-center px-3 py-2 font-medium">כמות</th>
                <th className="text-center px-3 py-2 font-medium">שב׳ קודם</th>
                <th className="text-center px-3 py-2 font-medium">ממוצע 3</th>
                <th className="text-center px-3 py-2 font-medium">שנה שעב׳</th>
                <th className="text-center px-3 py-2 font-medium">Top-10</th>
                <th className="text-center px-3 py-2 font-medium">החזרות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {store.products.map((product) => (
                <ProductRow key={product.productNameNormalized} product={product} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PRODUCT ROW
// ============================================================

function ProductRow({ product }: { product: ProductWeekComparison }) {
  const isBelowBenchmark =
    product.vsBenchmark.direction === "down" &&
    product.top10Benchmark !== null &&
    (product.vsBenchmark.pctChange ?? 0) < -10;

  return (
    <tr className={clsx("hover:bg-gray-50", isBelowBenchmark && "bg-orange-50/50")}>
      <td className="px-4 py-2 text-gray-800">
        <div className="flex items-center gap-1.5">
          {isBelowBenchmark && (
            <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" title="מתחת לממוצע Top-10" />
          )}
          <span>{product.productName}</span>
        </div>
      </td>
      <td className="px-3 py-2 text-center font-medium text-gray-900">
        {product.grossQty.toLocaleString("he-IL")}
      </td>
      <td className="px-3 py-2 text-center">
        <TrendCell trend={product.vsLastWeek} reference={product.lastWeekQty} />
      </td>
      <td className="px-3 py-2 text-center">
        <TrendCell trend={product.vs3WeekAvg} reference={product.avgLast3WeeksQty} />
      </td>
      <td className="px-3 py-2 text-center">
        <TrendCell trend={product.vsLastYear} reference={product.lastYearQty} />
      </td>
      <td className="px-3 py-2 text-center">
        <TrendCell
          trend={product.vsBenchmark}
          reference={product.top10Benchmark}
          formatRef={(v) => `${Math.round(v)}`}
        />
      </td>
      <td className="px-3 py-2 text-center">
        {product.returnsQty > 0 ? (
          <span
            className={clsx(
              "text-xs font-medium px-1.5 py-0.5 rounded",
              product.returnsRate > 15
                ? "bg-red-100 text-red-700"
                : product.returnsRate > 7
                  ? "bg-orange-100 text-orange-700"
                  : "bg-gray-100 text-gray-600",
            )}
          >
            {product.returnsQty} ({product.returnsRate.toFixed(0)}%)
          </span>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>
    </tr>
  );
}

// ============================================================
// TREND CELL
// ============================================================

function TrendCell({
  trend,
  reference,
  formatRef,
}: {
  trend: TrendResult;
  reference: number | null;
  formatRef?: (v: number) => string;
}) {
  if (trend.direction === "nodata" || reference === null) {
    return <span className="text-gray-300 text-xs">—</span>;
  }

  const pct     = trend.pctChange;
  const pctStr  = pct !== null ? `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%` : "";
  const refStr  = reference !== null ? (formatRef ? formatRef(reference) : reference.toLocaleString("he-IL")) : "";

  const colorClass =
    trend.direction === "up"
      ? "text-green-600"
      : trend.direction === "down"
        ? "text-red-600"
        : "text-gray-500";

  const Icon =
    trend.direction === "up"
      ? TrendingUp
      : trend.direction === "down"
        ? TrendingDown
        : Minus;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className={`flex items-center gap-0.5 ${colorClass}`}>
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{pctStr}</span>
      </div>
      <span className="text-xs text-gray-400">{refStr}</span>
    </div>
  );
}

// ============================================================
// TREND BADGE
// ============================================================

function TrendBadge({ trend }: { trend: TrendResult }) {
  if (trend.direction === "nodata") return null;

  const cfg = {
    up:     { bg: "bg-green-100 text-green-700", label: "עלייה",  Icon: TrendingUp },
    down:   { bg: "bg-red-100 text-red-700",     label: "ירידה",  Icon: TrendingDown },
    stable: { bg: "bg-gray-100 text-gray-600",   label: "יציב",   Icon: Minus },
    nodata: { bg: "",                             label: "",       Icon: Minus },
  }[trend.direction];

  const pctStr =
    trend.pctChange !== null
      ? ` ${trend.pctChange > 0 ? "+" : ""}${trend.pctChange.toFixed(0)}%`
      : "";

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg}`}>
      <cfg.Icon className="w-3 h-3" />
      {cfg.label}{pctStr}
    </span>
  );
}
