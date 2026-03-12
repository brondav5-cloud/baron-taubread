"use client";

import { useState, useMemo, useCallback } from "react";
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
import { useStoresAndProducts } from "@/context/StoresAndProductsContext";
import { StoreRow } from "@/components/weekly/WeeklyStoreRow";
import { OrderModeTable } from "@/components/weekly/OrderModeTable";
import { WeeklyHeatmap } from "@/components/weekly/WeeklyHeatmap";
import Link from "next/link";

interface StoreFilters {
  agent:   string;
  driver:  string;
  network: string;
  city:    string;
}
const EMPTY_FILTERS: StoreFilters = { agent: "", driver: "", network: "", city: "" };

export default function WeeklyPage() {
  const weekly = useWeeklyComparison();
  const { stores: dbStores } = useStoresAndProducts();

  const [expandedStores, setExpandedStores] = useState<Set<number>>(new Set());
  const [searchQuery,    setSearchQuery]    = useState("");
  const [filterTrend,    setFilterTrend]    = useState<"all" | "down" | "up" | "stable">("all");
  const [orderMode,      setOrderMode]      = useState(false);
  const [heatmapMode,    setHeatmapMode]    = useState(false);
  const [showFilters,    setShowFilters]    = useState(false);
  const [storeFilters,   setStoreFilters]   = useState<StoreFilters>(EMPTY_FILTERS);

  // Lookup: external_id → store metadata
  const storeMetaMap = useMemo(
    () => new Map(dbStores.map((s) => [s.external_id, s])),
    [dbStores],
  );

  const toggleStore = useCallback((id: number) =>
    setExpandedStores((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }),
    [],
  );
  const expandAll   = useCallback(() => setExpandedStores(new Set(weekly.stores.map((s) => s.storeExternalId))), [weekly.stores]);
  const collapseAll = useCallback(() => setExpandedStores(new Set()), []);

  // All unique products in current weekly data (for irregular multi-select)
  const allProducts = useMemo(() => {
    const map = new Map<string, string>(); // normalized → display name
    weekly.stores.forEach((s) =>
      s.products.forEach((p) => {
        if (!map.has(p.productNameNormalized)) map.set(p.productNameNormalized, p.productName);
      }),
    );
    return Array.from(map.entries())
      .map(([normalized, name]) => ({ normalized, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "he"));
  }, [weekly.stores]);

  // Build filter options from stores that actually appear in weekly data
  const filterOptions = useMemo(() => {
    const agents   = new Set<string>();
    const drivers  = new Set<string>();
    const networks = new Set<string>();
    const cities   = new Set<string>();
    weekly.stores.forEach((s) => {
      const meta = storeMetaMap.get(s.storeExternalId);
      if (meta?.agent)   agents.add(meta.agent);
      if (meta?.driver)  drivers.add(meta.driver);
      if (meta?.network) networks.add(meta.network);
      if (meta?.city)    cities.add(meta.city);
    });
    const sort = (set: Set<string>) => Array.from(set).sort((a, b) => a.localeCompare(b, "he"));
    return { agents: sort(agents), drivers: sort(drivers), networks: sort(networks), cities: sort(cities) };
  }, [weekly.stores, storeMetaMap]);

  const activeFiltersCount = useMemo(
    () => Object.values(storeFilters).filter(Boolean).length,
    [storeFilters],
  );

  const filteredStores = useMemo(
    () =>
      weekly.stores.filter((s) => {
        if (searchQuery && !s.storeName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (filterTrend !== "all" && s.overallTrend.direction !== filterTrend) return false;
        const meta = storeMetaMap.get(s.storeExternalId);
        if (storeFilters.agent   && meta?.agent   !== storeFilters.agent)   return false;
        if (storeFilters.driver  && meta?.driver  !== storeFilters.driver)  return false;
        if (storeFilters.network && meta?.network !== storeFilters.network) return false;
        if (storeFilters.city    && meta?.city    !== storeFilters.city)    return false;
        return true;
      }),
    [weekly.stores, searchQuery, filterTrend, storeFilters, storeMetaMap],
  );

  const summary = useMemo(() => ({
    total:      weekly.stores.length,
    up:         weekly.stores.filter((s) => s.overallTrend.direction === "up").length,
    down:       weekly.stores.filter((s) => s.overallTrend.direction === "down").length,
    stable:     weekly.stores.filter((s) => s.overallTrend.direction === "stable").length,
    totalUnits: weekly.stores.reduce((sum, s) => sum + s.totalGrossQty, 0),
  }), [weekly.stores]);

  // Collect anomalies across all stores
  const anomalies = useMemo(() => {
    const list: { storeName: string; productName: string; qty: number; zScore: number; dir: string }[] = [];
    for (const store of weekly.stores) {
      for (const p of store.products) {
        if (p.isAnomaly && p.anomalyZScore !== null) {
          list.push({
            storeName:   store.storeName,
            productName: p.productName,
            qty:         p.grossQty,
            zScore:      p.anomalyZScore,
            dir:         p.vsLastWeek.direction,
          });
        }
      }
    }
    return list.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
  }, [weekly.stores]);

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

      {/* ─── Controls ─── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">

        {/* Row 1: week selector + weeksCount + search + trend filters */}
        <div className="flex flex-wrap gap-3 items-center">

          {/* Week dropdown + holiday toggle */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">שבוע:</label>
            <select
              value={weekly.selectedWeek}
              onChange={(e) => weekly.selectWeek(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-500"
            >
              {weekly.availableWeeks.map((w) => (
                <option key={w} value={w}>
                  {weekly.holidayWeeks.has(w) ? `🎉 ` : ""}{fmtDate(w)}
                  {weekly.holidayWeeks.has(w) ? ` — ${weekly.holidayWeeks.get(w)}` : ""}
                </option>
              ))}
            </select>
            {/* Mark/unmark current week as holiday */}
            <button
              onClick={() => weekly.selectedWeek && weekly.toggleHoliday(weekly.selectedWeek)}
              title={weekly.holidayWeeks.has(weekly.selectedWeek) ? "הסר סימון חג" : "סמן שבוע זה כחג"}
              className={clsx(
                "text-base px-2 py-1 rounded-lg border transition-colors",
                weekly.holidayWeeks.has(weekly.selectedWeek)
                  ? "border-amber-400 bg-amber-50 text-amber-600 hover:bg-amber-100"
                  : "border-gray-200 bg-gray-50 text-gray-400 hover:bg-amber-50 hover:text-amber-500 hover:border-amber-300",
              )}
            >
              🎉
            </button>
          </div>

          {/* Weeks count selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 font-medium">טווח:</span>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs">
              {([1, 2, 3, 4] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => weekly.setWeeksCount(n)}
                  title={n === 1 ? "שבוע יחיד" : `ממוצע ${n} שבועות`}
                  className={clsx(
                    "px-2.5 py-1.5 font-medium transition-colors",
                    weekly.weeksCount === n
                      ? "bg-purple-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50",
                  )}
                >
                  {n}שב׳
                </button>
              ))}
            </div>
            {weekly.weeksCount > 1 && (
              <span className="text-xs text-purple-600 font-medium">
                ממוצע לשבוע ({weekly.weeksCount} שבועות)
              </span>
            )}
          </div>

          {/* Store search */}
          <div className="relative flex-1 min-w-[160px] max-w-xs">
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
                    ? t === "down" ? "bg-red-100 text-red-700 ring-1 ring-red-300"
                    : t === "up"   ? "bg-green-100 text-green-700 ring-1 ring-green-300"
                    :                "bg-gray-200 text-gray-700 ring-1 ring-gray-400"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100",
                )}
              >
                {t === "all" ? "הכל" : t === "down" ? "↓ ירידה" : t === "up" ? "↑ עלייה" : "→ יציב"}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: visibility toggles + expand/collapse + order mode + product analysis */}
        <div className="flex flex-wrap gap-3 items-center">

          {/* Excluded products filter — 3-way */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 font-medium ml-1">מוחרגים:</span>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs">
              {(
                [
                  { value: "hide", label: "הסתר", icon: <EyeOff className="w-3 h-3" /> },
                  { value: "show", label: "הכל",  icon: <Eye    className="w-3 h-3" /> },
                  { value: "only", label: "רק מוחרגים", icon: null },
                ] as const
              ).map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => weekly.setExcludedFilter(value)}
                  title={
                    value === "hide" ? "הסתר מוצרים מוחרגים (ברירת מחדל)"
                    : value === "show" ? "הצג את כל המוצרים כולל מוחרגים"
                    : "הצג מוחרגים בלבד — לבדיקת רשימת ההחרגה"
                  }
                  className={clsx(
                    "flex items-center gap-1 px-2.5 py-1.5 font-medium transition-colors",
                    weekly.excludedFilter === value
                      ? value === "only"
                        ? "bg-orange-500 text-white"
                        : "bg-gray-700 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50",
                  )}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Show/hide irregular products (global toggle) */}
          <button
            onClick={() => weekly.setShowIrregular(!weekly.showIrregular)}
            title={weekly.showIrregular ? "הסתר מוצרים לא-סדירים מהתצוגה" : "הצג מוצרים לא-סדירים"}
            className={clsx(
              "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors",
              weekly.showIrregular
                ? "bg-purple-50 text-purple-700 border-purple-300"
                : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100",
            )}
          >
            <span className="text-sm leading-none">⊘</span>
            {weekly.irregularNames.size > 0 && (
              <span className={clsx(
                "rounded-full text-[10px] w-4 h-4 flex items-center justify-center font-bold",
                weekly.showIrregular ? "bg-purple-600 text-white" : "bg-gray-400 text-white",
              )}>
                {weekly.irregularNames.size}
              </span>
            )}
            {weekly.showIrregular ? "לא-סדירים מוצגים" : "לא-סדירים מוסתרים"}
          </button>

          <span className="text-gray-200">|</span>

          {/* Advanced filters toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={clsx(
              "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors",
              showFilters || activeFiltersCount > 0
                ? "bg-purple-50 text-purple-700 border-purple-300"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100",
            )}
          >
            <span className="text-sm leading-none">⚙</span>
            פילטרים
            {activeFiltersCount > 0 && (
              <span className="bg-purple-600 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Expand / collapse */}
          {!orderMode && !heatmapMode && (
            <>
              <span className="text-gray-200">|</span>
              <button onClick={expandAll}   className="text-xs text-purple-600 hover:text-purple-800 underline">פתח הכל</button>
              <span className="text-gray-300">|</span>
              <button onClick={collapseAll} className="text-xs text-purple-600 hover:text-purple-800 underline">סגור הכל</button>
            </>
          )}

          <span className="text-gray-200">|</span>

          {/* Order mode toggle */}
          <button
            onClick={() => { setOrderMode((v) => !v); setHeatmapMode(false); }}
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

          {/* Heatmap toggle */}
          <button
            onClick={() => { setHeatmapMode((v) => !v); setOrderMode(false); }}
            className={clsx(
              "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
              heatmapMode
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200",
            )}
          >
            <span className="text-sm leading-none font-bold">⊞</span>
            {heatmapMode ? "✕ סגור Heatmap" : "Heatmap"}
          </button>

          {/* Product analysis link */}
          <Link
            href={`/dashboard/weekly/product?week=${weekly.selectedWeek}`}
            className="flex items-center gap-1.5 text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 font-medium"
          >
            ניתוח לפי מוצר →
          </Link>

          {/* Active filters summary */}
          {(searchQuery || filterTrend !== "all" || activeFiltersCount > 0) && (
            <span className="text-xs text-gray-400">
              מציג {filteredStores.length} מתוך {weekly.stores.length} חנויות
            </span>
          )}
        </div>

        {/* ─── Advanced filters panel ─── */}
        {showFilters && (
          <div className="border-t border-gray-100 pt-3 mt-1">
            <div className="flex flex-wrap gap-3 items-end">
              {(
                [
                  { key: "agent",   label: "סוכן",  options: filterOptions.agents   },
                  { key: "driver",  label: "נהג",   options: filterOptions.drivers  },
                  { key: "network", label: "רשת",   options: filterOptions.networks },
                  { key: "city",    label: "עיר",   options: filterOptions.cities   },
                ] as const
              ).map(({ key, label, options }) =>
                options.length > 0 ? (
                  <div key={key} className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">{label}</label>
                    <select
                      value={storeFilters[key]}
                      onChange={(e) => setStoreFilters((prev) => ({ ...prev, [key]: e.target.value }))}
                      className={clsx(
                        "border rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-purple-500 min-w-[120px]",
                        storeFilters[key] ? "border-purple-400 bg-purple-50 text-purple-800" : "border-gray-300 text-gray-700",
                      )}
                    >
                      <option value="">הכל</option>
                      {options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ) : null,
              )}

              {activeFiltersCount > 0 && (
                <button
                  onClick={() => setStoreFilters(EMPTY_FILTERS)}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 mb-0.5"
                >
                  <span className="text-sm leading-none">✕</span>
                  נקה פילטרים
                </button>
              )}

              {/* Irregular products multi-select */}
              <IrregularMultiSelect
                allProducts={allProducts}
                irregularNames={weekly.irregularNames}
                onToggle={weekly.toggleIrregular}
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── Summary Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryCard
          label={weekly.weeksCount > 1 ? `יחידות (ממוצע/${weekly.weeksCount}שב׳)` : "סה״כ יחידות"}
          value={summary.totalUnits.toLocaleString("he-IL")}
          color="purple"
        />
        <SummaryCard label="סה״כ חנויות" value={summary.total}  color="gray" />
        <SummaryCard label="בעלייה"       value={summary.up}     color="green"  icon="up" />
        <SummaryCard label="ביציבות"      value={summary.stable} color="yellow" icon="stable" />
        <SummaryCard label="בירידה"       value={summary.down}   color="red"    icon="down" />
      </div>

      {/* ─── Legend ─── */}
      <div className="bg-gray-50 rounded-lg px-4 py-2 text-xs text-gray-500 flex flex-wrap gap-4">
        <span className="font-medium text-gray-700">מדדים:</span>
        {weekly.weeksCount > 1 ? (
          <>
            <span>ממוצע לשבוע על פני {weekly.weeksCount} שבועות אחרונים</span>
            <span>כל מדדי ההשוואה מחושבים לפי תקופות באותו אורך</span>
          </>
        ) : (
          <>
            <span><span className="font-mono text-gray-700">שב׳ קודם</span> — לעומת שבוע שעבר</span>
            <span><span className="font-mono text-gray-700">ממוצע 3</span> — ממוצע 3 שבועות אחרונים</span>
            <span><span className="font-mono text-gray-700">שנה שעב׳</span> — אותו שבוע שנה שעברה</span>
            <span><span className="font-mono text-gray-700">Top-10</span> — ממוצע 10 האספקות הגדולות (12 חודש)</span>
          </>
        )}
        <span><span className="font-mono text-gray-700">N↑/N↓</span> — שבועות ברצף באותו כיוון (streak)</span>
      </div>

      {/* ─── Error ─── */}
      {weekly.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{weekly.error}</span>
        </div>
      )}

      {/* ─── Excluded-only banner ─── */}
      {weekly.excludedFilter === "only" && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-orange-800 text-sm">
          <EyeOff className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>תצוגת מוחרגים בלבד</strong>
            {" "}· מוצגים רק מוצרים שסומנו כמוחרגים. לחזרה לתצוגה רגילה — בחר &quot;הסתר&quot; או &quot;הכל&quot;.
          </span>
        </div>
      )}

      {/* ─── Holiday banner ─── */}
      {weekly.holidayWeeks.has(weekly.selectedWeek) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-amber-800 text-sm">
          <span className="text-lg">🎉</span>
          <span>
            <strong>שבוע חג — {weekly.holidayWeeks.get(weekly.selectedWeek)}</strong>
            {" "}· נתוני שבוע זה עשויים לשקף ביקוש חריג. ניתן להחריג מהחישוב על-ידי הסרת הסימון.
          </span>
        </div>
      )}

      {/* ─── Anomaly Banner ─── */}
      {anomalies.length > 0 && weekly.weeksCount === 1 && (
        <AnomalyBanner anomalies={anomalies} />
      )}

      {/* ─── Main content ─── */}
      {orderMode ? (
        <OrderModeTable
          stores={filteredStores}
          selectedWeek={weekly.selectedWeek}
          weeksCount={weekly.weeksCount}
        />
      ) : heatmapMode ? (
        <WeeklyHeatmap stores={filteredStores} weeksCount={weekly.weeksCount} />
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
                weeksCount={weekly.weeksCount}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Anomaly Banner ───────────────────────────────────────────────────────────

function AnomalyBanner({ anomalies }: {
  anomalies: { storeName: string; productName: string; qty: number; zScore: number; dir: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const spikes = anomalies.filter((a) => a.zScore > 0);
  const drops  = anomalies.filter((a) => a.zScore < 0);

  return (
    <div className="bg-yellow-50 border border-yellow-300 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-3 flex items-center gap-3 text-sm text-yellow-800 hover:bg-yellow-100 transition-colors"
      >
        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-yellow-600" />
        <span className="font-semibold">
          {anomalies.length} חריגות סטטיסטיות זוהו
        </span>
        <span className="text-yellow-600 font-normal">
          {spikes.length > 0 && `${spikes.length} עליות חדות`}
          {spikes.length > 0 && drops.length > 0 && " · "}
          {drops.length > 0  && `${drops.length} ירידות חדות`}
        </span>
        <span className="mr-auto text-yellow-500 text-xs">{expanded ? "▲ סגור" : "▼ פרט"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-3 border-t border-yellow-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
            {anomalies.map((a, i) => (
              <div
                key={i}
                className={clsx(
                  "flex items-center gap-2 text-xs rounded-lg px-3 py-1.5",
                  a.zScore > 0 ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800",
                )}
              >
                <span className="font-bold text-sm">{a.zScore > 0 ? "↑" : "↓"}</span>
                <span className="font-medium">{a.storeName}</span>
                <span className="text-gray-400">·</span>
                <span>{a.productName}</span>
                <span className="mr-auto font-semibold">{a.qty} יח׳</span>
                <span className={clsx("text-xs", a.zScore > 0 ? "text-green-600" : "text-red-600")}>
                  z={a.zScore > 0 ? "+" : ""}{a.zScore}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-yellow-600 mt-2">
            * חריגה = Z-score ≥ 2.5 ביחס ל-10 השבועות הקודמים. ייתכן שגיאת נתונים, אירוע מיוחד, או שינוי אמיתי.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Irregular Products Multi-Select ──────────────────────────────────────────

function IrregularMultiSelect({
  allProducts,
  irregularNames,
  onToggle,
}: {
  allProducts: { normalized: string; name: string }[];
  irregularNames: Set<string>;
  onToggle: (normalized: string) => Promise<void>;
}) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState("");

  const count = irregularNames.size;
  const filtered = allProducts.filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-1 relative">
      <label className="text-xs font-medium text-gray-600">מוצרים לא-סדירים</label>
      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "flex items-center gap-2 border rounded-lg px-2.5 py-1.5 text-xs min-w-[160px] text-right transition-colors",
          count > 0 || open
            ? "border-purple-400 bg-purple-50 text-purple-800"
            : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50",
        )}
      >
        <span className="text-sm leading-none">⊘</span>
        <span className="flex-1 text-right">
          {count === 0 ? "בחר מוצרים לא-סדירים" : `${count} מוצרים מסומנים`}
        </span>
        <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          className="absolute top-full mt-1 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl w-72"
          style={{ maxHeight: 320, display: "flex", flexDirection: "column" }}
        >
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="חפש מוצר..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                className="w-full pr-8 pl-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-400 focus:outline-none"
                dir="rtl"
              />
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 p-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">לא נמצאו מוצרים</p>
            ) : (
              filtered.map((p) => {
                const isIrregular = irregularNames.has(p.normalized);
                return (
                  <button
                    key={p.normalized}
                    onClick={() => onToggle(p.normalized)}
                    className={clsx(
                      "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-right transition-colors",
                      isIrregular
                        ? "bg-purple-50 text-purple-800 hover:bg-purple-100"
                        : "text-gray-700 hover:bg-gray-50",
                    )}
                  >
                    <span
                      className={clsx(
                        "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 text-xs",
                        isIrregular
                          ? "bg-purple-600 border-purple-600 text-white"
                          : "border-gray-300",
                      )}
                    >
                      {isIrregular ? "✓" : ""}
                    </span>
                    <span className={clsx("flex-1 text-right", isIrregular && "font-medium")}>
                      {p.name}
                    </span>
                    {isIrregular && <span className="text-purple-400 text-sm">⊘</span>}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {count > 0 && (
            <div className="p-2 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
              <span>{count} מוצרים מסומנים</span>
              <button
                onClick={() => setOpen(false)}
                className="text-purple-600 hover:text-purple-800 font-medium"
              >
                סגור
              </button>
            </div>
          )}
        </div>
      )}

      {/* Click-outside to close */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
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
        מגמות אספקה לפי חנות ומוצר — ביחס לתקופה קודמת, ממוצע 3 תקופות, שנה שעברה ו-Top-10
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
