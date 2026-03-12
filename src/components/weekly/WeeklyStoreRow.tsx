"use client";

import { AlertTriangle, ChevronDown, ChevronRight, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { clsx } from "clsx";
import type { StoreWeekComparison, ProductWeekComparison, TrendResult } from "@/hooks/useWeeklyComparison";

// ============================================================
// STORE ROW
// ============================================================

export function StoreRow({
  store,
  isExpanded,
  onToggle,
  selectedWeek,
  onToggleIrregular,
}: {
  store: StoreWeekComparison;
  isExpanded: boolean;
  onToggle: () => void;
  selectedWeek?: string;
  onToggleIrregular?: (productNameNormalized: string) => Promise<void>;
}) {
  const trendBg =
    store.overallTrend.direction === "down"
      ? "border-red-200 bg-red-50/30"
      : store.overallTrend.direction === "up"
        ? "border-green-200 bg-green-50/30"
        : "border-gray-200 bg-white";

  return (
    <div className={`rounded-xl border ${trendBg} overflow-hidden`}>
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
          <span className="text-xs text-gray-400">{store.products.length} פריטים</span>
        </div>
      </button>

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
                <ProductRow
                  key={product.productNameNormalized}
                  product={product}
                  selectedWeek={selectedWeek}
                  onToggleIrregular={onToggleIrregular}
                />
              ))}
            </tbody>
            <StoreTotalsRow products={store.products} totalGrossQty={store.totalGrossQty} totalReturnsQty={store.totalReturnsQty} />
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// STORE TOTALS ROW (tfoot)
// ============================================================

function StoreTotalsRow({
  products,
  totalGrossQty,
  totalReturnsQty,
}: {
  products: ProductWeekComparison[];
  totalGrossQty: number;
  totalReturnsQty: number;
}) {
  const hasLastWeek  = products.some((p) => p.lastWeekQty !== null);
  const hasAvg3w     = products.some((p) => p.avgLast3WeeksQty !== null);
  const hasLastYear  = products.some((p) => p.lastYearQty !== null);

  const sumLastWeek  = hasLastWeek  ? products.reduce((s, p) => s + (p.lastWeekQty     ?? 0), 0) : null;
  const sumAvg3w     = hasAvg3w     ? products.reduce((s, p) => s + (p.avgLast3WeeksQty ?? 0), 0) : null;
  const sumLastYear  = hasLastYear  ? products.reduce((s, p) => s + (p.lastYearQty     ?? 0), 0) : null;
  const returnsRate  = totalGrossQty > 0 ? (totalReturnsQty / totalGrossQty) * 100 : 0;

  const fmtNum = (v: number | null) =>
    v !== null ? Math.round(v).toLocaleString("he-IL") : <span className="text-gray-300">—</span>;

  return (
    <tfoot>
      <tr className="border-t-2 border-gray-300 bg-gray-100/70 text-xs font-semibold text-gray-700">
        <td className="px-4 py-2">סה״כ</td>
        <td className="px-3 py-2 text-center">{totalGrossQty.toLocaleString("he-IL")}</td>
        <td className="px-3 py-2 text-center text-gray-500">{fmtNum(sumLastWeek)}</td>
        <td className="px-3 py-2 text-center text-gray-500">{fmtNum(sumAvg3w)}</td>
        <td className="px-3 py-2 text-center text-gray-500">{fmtNum(sumLastYear)}</td>
        <td className="px-3 py-2 text-center text-gray-300">—</td>
        <td className="px-3 py-2 text-center">
          {totalReturnsQty > 0 ? (
            <span className="text-red-600">
              {totalReturnsQty.toLocaleString("he-IL")}
              {" "}({returnsRate.toFixed(0)}%)
            </span>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </td>
      </tr>
    </tfoot>
  );
}

// ============================================================
// PRODUCT ROW
// ============================================================

function ProductRow({
  product,
  selectedWeek,
  onToggleIrregular,
}: {
  product: ProductWeekComparison;
  selectedWeek?: string;
  onToggleIrregular?: (productNameNormalized: string) => Promise<void>;
}) {
  const isBelowBenchmark =
    product.vsBenchmark.direction === "down" &&
    product.top10Benchmark !== null &&
    (product.vsBenchmark.pctChange ?? 0) < -10;

  const productUrl = selectedWeek
    ? `/dashboard/weekly/product?name=${encodeURIComponent(product.productName)}&week=${selectedWeek}&normalized=${encodeURIComponent(product.productNameNormalized)}`
    : null;

  return (
    <tr className={clsx(
      "hover:bg-gray-50",
      isBelowBenchmark && !product.isIrregular && "bg-orange-50/50",
      product.isIrregular && "opacity-60 bg-gray-50/60",
    )}>
      <td className="px-4 py-2 text-gray-800">
        <div className="flex items-center gap-1.5">
          {isBelowBenchmark && !product.isIrregular && (
            <span title="מתחת לממוצע Top-10">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
            </span>
          )}
          {product.isIrregular && (
            <span title="מוצר לא-סדיר — לא נכנס לחישוב מגמת החנות" className="text-purple-400 text-sm flex-shrink-0">
              ⊘
            </span>
          )}
          {productUrl ? (
            <a
              href={productUrl}
              className={clsx("hover:text-purple-700 hover:underline", product.isIrregular && "italic text-gray-500")}
            >
              {product.productName}
            </a>
          ) : (
            <span className={clsx(product.isIrregular && "italic text-gray-500")}>{product.productName}</span>
          )}
          {onToggleIrregular && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleIrregular(product.productNameNormalized); }}
              title={product.isIrregular ? "הסר מסימון לא-סדיר" : "סמן כמוצר לא-סדיר"}
              className={clsx(
                "mr-1 px-0.5 rounded hover:bg-gray-200 transition-colors text-sm leading-none",
                product.isIrregular ? "text-purple-500" : "text-gray-300 hover:text-gray-500",
              )}
            >
              ⊘
            </button>
          )}
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

export function TrendCell({
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

  const pct    = trend.pctChange;
  const pctStr = pct !== null ? `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%` : "";
  const refStr = reference !== null
    ? (formatRef ? formatRef(reference) : reference.toLocaleString("he-IL"))
    : "";

  const colorClass =
    trend.direction === "up"
      ? "text-green-600"
      : trend.direction === "down"
        ? "text-red-600"
        : "text-gray-500";

  const Icon =
    trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus;

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

export function TrendBadge({ trend }: { trend: TrendResult }) {
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
