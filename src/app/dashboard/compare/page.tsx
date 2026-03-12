"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  useStoreCrossComparison,
  type StoreInfo,
} from "@/hooks/useStoreCrossComparison";
import { formatNumber } from "@/lib/calculations";
import { clsx } from "clsx";

function formatMonthLabel(mk: string): string {
  if (!mk) return "";
  const [y, m] = mk.split("-");
  const names = ["","ינואר","פברואר","מרץ","אפריל","מאי","יוני",
                  "יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
  return `${names[parseInt(m ?? "0", 10)] ?? m} ${y}`;
}

// ── Store selector pill ──────────────────────────────────────────────
function StorePill({
  store,
  selected,
  onToggle,
}: {
  store: StoreInfo;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={clsx(
        "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
        selected
          ? "bg-purple-600 text-white border-purple-600"
          : "bg-white text-gray-600 border-gray-300 hover:border-purple-400",
      )}
    >
      {store.name}
    </button>
  );
}

// ── Main page ────────────────────────────────────────────────────────
export default function ComparePage() {
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;

  const [selectedMonth,    setSelectedMonth]    = useState("");
  const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([]);
  const [showReturns,      setShowReturns]      = useState(false);
  const [search,           setSearch]           = useState("");

  const { pivotRows, availableMonths, stores, isLoading, error } =
    useStoreCrossComparison(companyId, selectedMonth, selectedStoreIds);

  const activeMonth = selectedMonth || availableMonths[0] || "";

  // Stores to show as columns (selected, or all if none selected)
  const activeStores = useMemo(
    () =>
      selectedStoreIds.length > 0
        ? stores.filter((s) => selectedStoreIds.includes(s.external_id))
        : stores,
    [stores, selectedStoreIds],
  );

  // Filter rows by search
  const filteredRows = useMemo(
    () =>
      pivotRows.filter((r) =>
        search ? r.product_name.includes(search) : true,
      ),
    [pivotRows, search],
  );

  const toggleStore = (id: number) =>
    setSelectedStoreIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">השוואת חנויות</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            פריטים בשורות · חנויות בעמודות · לפי חודש
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-3">
        {/* Month selector */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">חודש:</label>
            <select
              value={activeMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-500"
            >
              {availableMonths.map((mk) => (
                <option key={mk} value={mk}>{formatMonthLabel(mk)}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">חיפוש מוצר:</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="שם מוצר..."
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 w-40"
            />
          </div>

          <button
            onClick={() => setShowReturns(!showReturns)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              showReturns
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
          >
            {showReturns ? "הסתר חזרות" : "הצג חזרות"}
          </button>

          {selectedStoreIds.length > 0 && (
            <button
              onClick={() => setSelectedStoreIds([])}
              className="text-xs text-purple-600 underline"
            >
              נקה בחירה ({selectedStoreIds.length})
            </button>
          )}
        </div>

        {/* Store pills */}
        <div className="flex flex-wrap gap-2">
          {stores.map((s) => (
            <StorePill
              key={s.external_id}
              store={s}
              selected={selectedStoreIds.includes(s.external_id)}
              onToggle={() => toggleStore(s.external_id)}
            />
          ))}
        </div>
        {stores.length === 0 && !isLoading && (
          <p className="text-xs text-gray-400">
            טוען חנויות...
          </p>
        )}
      </div>

      {/* Pivot table */}
      {isLoading && (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400 animate-pulse">
          טוען נתונים...
        </div>
      )}
      {error && (
        <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-red-500">{error}</div>
      )}
      {!isLoading && !error && activeStores.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-purple-50 flex items-center justify-between">
            <h3 className="font-bold text-purple-900">
              📊 {formatMonthLabel(activeMonth)}
            </h3>
            <span className="text-xs text-gray-500">
              {filteredRows.length} מוצרים · {activeStores.length} חנויות
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="text-sm border-collapse" style={{ minWidth: `${activeStores.length * 110 + 200}px` }}>
              <thead className="bg-gray-50 text-xs text-gray-500 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-right font-medium sticky right-0 bg-gray-50 border-l border-gray-200 min-w-[180px]">
                    מוצר
                  </th>
                  {activeStores.map((s) => (
                    <th key={s.external_id} className="px-3 py-2 text-center font-medium min-w-[100px]">
                      <a
                        href={`/dashboard/stores/${s.external_id}`}
                        className="hover:text-purple-700 hover:underline"
                      >
                        {s.name}
                      </a>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center font-medium bg-purple-50 min-w-[90px]">
                    סה״כ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={activeStores.length + 2}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      לא נמצאו נתונים
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const rowTotal = activeStores.reduce(
                      (s, st) => s + (row.storeQty[st.external_id] ?? 0),
                      0,
                    );
                    return (
                      <tr key={row.product_id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-800 sticky right-0 bg-white border-l border-gray-100">
                          {row.product_name}
                        </td>
                        {activeStores.map((s) => {
                          const qty     = row.storeQty[s.external_id]     ?? 0;
                          const returns = row.storeReturns[s.external_id] ?? 0;
                          return (
                            <td key={s.external_id} className="px-3 py-2 text-center">
                              {qty > 0 ? (
                                <span className="font-semibold text-gray-800">
                                  {formatNumber(qty)}
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                              {showReturns && returns > 0 && (
                                <span className="block text-xs text-red-500">
                                  -{formatNumber(returns)}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center font-bold text-purple-800 bg-purple-50">
                          {formatNumber(rowTotal)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredRows.length > 0 && (
                <tfoot className="bg-gray-50 border-t font-medium text-sm">
                  <tr>
                    <td className="px-4 py-2 text-gray-700 sticky right-0 bg-gray-50 border-l border-gray-200">
                      סה״כ
                    </td>
                    {activeStores.map((s) => {
                      const colTotal = filteredRows.reduce(
                        (sum, r) => sum + (r.storeQty[s.external_id] ?? 0),
                        0,
                      );
                      return (
                        <td key={s.external_id} className="px-3 py-2 text-center text-gray-900">
                          {formatNumber(colTotal)}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center text-purple-900 font-bold bg-purple-50">
                      {formatNumber(
                        filteredRows.reduce(
                          (s, r) =>
                            s +
                            activeStores.reduce(
                              (ss, st) => ss + (r.storeQty[st.external_id] ?? 0),
                              0,
                            ),
                          0,
                        ),
                      )}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
      {!isLoading && !error && availableMonths.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-gray-500 font-medium">אין נתונים עדיין</p>
          <p className="text-sm text-gray-400 mt-1">יש להעלות קובץ נתוני מכירות</p>
          <a href="/dashboard/upload" className="inline-block mt-4 text-purple-600 text-sm underline hover:text-purple-800">
            עבור להעלאת נתונים
          </a>
        </div>
      )}
    </div>
  );
}
