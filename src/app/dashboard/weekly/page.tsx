"use client";

import { useState, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  EyeOff,
  AlertTriangle,
  Upload,
  Search,
} from "lucide-react";
import { clsx } from "clsx";
import { useWeeklyComparison } from "@/hooks/useWeeklyComparison";
import { StoreRow } from "@/components/weekly/WeeklyStoreRow";
import { OrderModeTable } from "@/components/weekly/OrderModeTable";
import Link from "next/link";

export default function WeeklyPage() {
  const weekly = useWeeklyComparison();
  const [expandedStores, setExpandedStores] = useState<Set<number>>(new Set());
  const [searchQuery,    setSearchQuery]    = useState("");
  const [filterTrend,    setFilterTrend]    = useState<"all" | "down" | "up" | "stable">("all");
  const [orderMode,      setOrderMode]      = useState(false);

  const toggleStore  = (id: number) =>
    setExpandedStores((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const expandAll    = () => setExpandedStores(new Set(weekly.stores.map((s) => s.storeExternalId)));
  const collapseAll  = () => setExpandedStores(new Set());

  const filteredStores = useMemo(() =>
    weekly.stores.filter((s) => {
      if (searchQuery && !s.storeName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterTrend !== "all" && s.overallTrend.direction !== filterTrend) return false;
      return true;
    }),
  [weekly.stores, searchQuery, filterTrend]);

  const summary = useMemo(() => ({
    total:      weekly.stores.length,
    up:         weekly.stores.filter((s) => s.overallTrend.direction === "up").length,
    down:       weekly.stores.filter((s) => s.overallTrend.direction === "down").length,
    stable:     weekly.stores.filter((s) => s.overallTrend.direction === "stable").length,
    totalUnits: weekly.stores.reduce((sum, s) => sum + s.totalGrossQty, 0),
  }), [weekly.stores]);

  const fmtDate = (d: string) => { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };

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
      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeader />
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">אין נתונים עדיין</h3>
          <p className="text-gray-500 mb-6">יש להעלות קובץ פירוט מוצרים לפני שניתן לראות את ניתוח המגמות</p>
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

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">שבוע:</label>
          <select
            value={weekly.selectedWeek}
            onChange={(e) => weekly.selectWeek(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-500"
          >
            {weekly.availableWeeks.map((w) => <option key={w} value={w}>{fmtDate(w)}</option>)}
          </select>
        </div>

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

        <div className="flex gap-1">
          {(["all", "down", "up", "stable"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterTrend(t)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                filterTrend === t
                  ? t === "down" ? "bg-red-100 text-red-700 ring-1 ring-red-300"
                  : t === "up"  ? "bg-green-100 text-green-700 ring-1 ring-green-300"
                  :               "bg-gray-200 text-gray-700 ring-1 ring-gray-400"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100",
              )}
            >
              {t === "all" ? "הכל" : t === "down" ? "↓ ירידה" : t === "up" ? "↑ עלייה" : "→ יציב"}
            </button>
          ))}
        </div>

        <button
          onClick={() => weekly.setShowExcluded(!weekly.showExcluded)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
        >
          {weekly.showExcluded ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {weekly.showExcluded ? "הסתר מוחרגים" : "הצג מוחרגים"}
        </button>

        <div className="flex gap-2">
          <button onClick={expandAll}   className="text-xs text-purple-600 hover:text-purple-800 underline">פתח הכל</button>
          <span className="text-gray-300">|</span>
          <button onClick={collapseAll} className="text-xs text-purple-600 hover:text-purple-800 underline">סגור הכל</button>
        </div>

        <button
          onClick={() => setOrderMode((v) => !v)}
          className={clsx(
            "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
            orderMode
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200",
          )}
        >
          <span className="text-base leading-none">🛒</span>
          {orderMode ? "✕ סגור מצב הזמנה" : "מצב הזמנה"}
        </button>

        <Link
          href={`/dashboard/weekly/product?week=${weekly.selectedWeek}`}
          className="flex items-center gap-1.5 text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 font-medium"
        >
          ניתוח לפי מוצר →
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryCard label="סה״כ יחידות"  value={summary.totalUnits.toLocaleString("he-IL")} color="purple" />
        <SummaryCard label="סה״כ חנויות"  value={summary.total}  color="gray" />
        <SummaryCard label="בעלייה"        value={summary.up}     color="green"  icon="up" />
        <SummaryCard label="ביציבות"       value={summary.stable} color="yellow" icon="stable" />
        <SummaryCard label="בירידה"        value={summary.down}   color="red"    icon="down" />
      </div>

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg px-4 py-2 text-xs text-gray-500 flex flex-wrap gap-4">
        <span className="font-medium text-gray-700">מדדים:</span>
        <span><span className="font-mono text-gray-700">שב׳ קודם</span> — לעומת שבוע שעבר</span>
        <span><span className="font-mono text-gray-700">ממוצע 3</span> — ממוצע 3 שבועות אחרונים</span>
        <span><span className="font-mono text-gray-700">שנה שעב׳</span> — אותו שבוע שנה שעברה</span>
        <span><span className="font-mono text-gray-700">Top-10</span> — ממוצע 10 האספקות הגדולות (12 חודש)</span>
      </div>

      {/* Error */}
      {weekly.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{weekly.error}</span>
        </div>
      )}

      {/* Order Mode or Normal Stores view */}
      {orderMode ? (
        <OrderModeTable stores={weekly.stores} selectedWeek={weekly.selectedWeek} />
      ) : (
        <div className="space-y-2">
          {filteredStores.length === 0 ? (
            <div className="text-center py-12 text-gray-400">לא נמצאו חנויות התואמות את הסינון</div>
          ) : (
            filteredStores.map((store) => (
              <StoreRow
                key={store.storeExternalId}
                store={store}
                isExpanded={expandedStores.has(store.storeExternalId)}
                onToggle={() => toggleStore(store.storeExternalId)}
                selectedWeek={weekly.selectedWeek}
                onToggleIrregular={weekly.toggleIrregular}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

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

function SummaryCard({ label, value, color, icon }: {
  label: string; value: number | string;
  color: "gray" | "green" | "yellow" | "red" | "purple";
  icon?: "up" | "stable" | "down";
}) {
  const bg   = { gray: "bg-gray-50", green: "bg-green-50", yellow: "bg-yellow-50", red: "bg-red-50", purple: "bg-purple-50" }[color];
  const text = { gray: "text-gray-900", green: "text-green-700", yellow: "text-yellow-700", red: "text-red-700", purple: "text-purple-700" }[color];
  return (
    <div className={`${bg} rounded-xl p-3 text-center border border-gray-100`}>
      <p className={`text-2xl font-bold ${text}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
        {icon === "up"     && <TrendingUp   className="w-3 h-3 text-green-600" />}
        {icon === "down"   && <TrendingDown  className="w-3 h-3 text-red-600" />}
        {icon === "stable" && <Minus         className="w-3 h-3 text-yellow-600" />}
        {label}
      </p>
    </div>
  );
}
