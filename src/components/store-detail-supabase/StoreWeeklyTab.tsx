"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { useStoreWeeklyAnalysis } from "@/hooks/useStoreWeeklyAnalysis";
import { StoreRow } from "@/components/weekly/WeeklyStoreRow";

// ============================================================
// MAIN COMPONENT
// ============================================================

export function StoreWeeklyTab({ storeExternalId }: { storeExternalId: number }) {
  const {
    storeData,
    availableWeeks,
    selectedWeek,
    selectWeek,
    weeksCount,
    setWeeksCount,
    isLoading,
    error,
  } = useStoreWeeklyAnalysis(storeExternalId);

  const fmtDate = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">

          {/* Week selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">שבוע:</label>
            <select
              value={selectedWeek}
              onChange={(e) => selectWeek(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-500"
            >
              {availableWeeks.map((w) => (
                <option key={w} value={w}>{fmtDate(w)}</option>
              ))}
            </select>
          </div>

          {/* Range selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 font-medium">טווח:</span>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs">
              {([1, 2, 3, 4] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setWeeksCount(n)}
                  title={n === 1 ? "שבוע יחיד" : `ממוצע ${n} שבועות`}
                  className={clsx(
                    "px-2.5 py-1.5 font-medium transition-colors",
                    weeksCount === n
                      ? "bg-purple-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50",
                  )}
                >
                  {n}שב׳
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Link to full weekly comparison */}
        <Link
          href={`/dashboard/weekly?week=${selectedWeek}`}
          className="flex items-center gap-1.5 text-xs bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors font-medium"
        >
          פתח בהשוואה הכוללת ←
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="w-7 h-7 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">טוען נתונים שבועיים...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      ) : !storeData ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">
          <p className="font-medium">אין נתונים שבועיים לחנות זו</p>
          <p className="text-sm mt-1">יש להעלות קובץ פירוט מוצרים</p>
        </div>
      ) : (
        <StoreRow
          store={storeData}
          isExpanded={true}
          onToggle={() => {}}
          selectedWeek={selectedWeek}
          weeksCount={weeksCount}
        />
      )}
    </div>
  );
}
