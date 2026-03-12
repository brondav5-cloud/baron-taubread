"use client";

import { useState, useMemo, useCallback } from "react";
import { Search } from "lucide-react";
import { clsx } from "clsx";
import type { StoreWeekComparison } from "@/hooks/useWeeklyComparison";
import { loadXlsx } from "@/lib/loadXlsx";

// ============================================================
// TYPES
// ============================================================

type SuggestMode = "avg3" | "top10";

interface FlatRow {
  storeId:               number;
  storeName:             string;
  productName:           string;
  productNameNormalized: string;
  grossQty:              number;
  lastWeekQty:           number | null;
  avg3wQty:              number | null;
  top10Benchmark:        number | null;
  isIrregular:           boolean;
}

// ============================================================
// HELPERS
// ============================================================

function suggestedQty(row: FlatRow, mode: SuggestMode): number {
  if (mode === "top10") {
    return Math.round(row.top10Benchmark ?? row.avg3wQty ?? row.lastWeekQty ?? row.grossQty);
  }
  return Math.round(row.avg3wQty ?? row.lastWeekQty ?? row.grossQty);
}

function noteKey(storeId: number, productNameNormalized: string): string {
  return `${storeId}|${productNameNormalized}`;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function OrderModeTable({
  stores,
  selectedWeek,
}: {
  stores: StoreWeekComparison[];
  selectedWeek: string;
}) {
  const [notes,        setNotes]        = useState<Record<string, string>>({});
  const [suggestMode,  setSuggestMode]  = useState<SuggestMode>("avg3");
  const [storeFilter,  setStoreFilter]  = useState("");
  const [isExporting,  setIsExporting]  = useState(false);

  const setNote = useCallback((key: string, value: string) => {
    setNotes((prev) => ({ ...prev, [key]: value }));
  }, []);

  const filteredStores = useMemo(
    () =>
      stores.filter(
        (s) => !storeFilter || s.storeName.toLowerCase().includes(storeFilter.toLowerCase()),
      ),
    [stores, storeFilter],
  );

  // All rows flattened for Excel export
  const allFlatRows = useMemo<FlatRow[]>(
    () =>
      stores.flatMap((store) =>
        store.products.map((p) => ({
          storeId:               store.storeExternalId,
          storeName:             store.storeName,
          productName:           p.productName,
          productNameNormalized: p.productNameNormalized,
          grossQty:              p.grossQty,
          lastWeekQty:           p.lastWeekQty,
          avg3wQty:              p.avgLast3WeeksQty,
          top10Benchmark:        p.top10Benchmark,
          isIrregular:           p.isIrregular,
        })),
      ),
    [stores],
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const XLSX = await loadXlsx();
      const fmtDate = (d: string) => {
        const [y, m, day] = d.split("-");
        return `${day}-${m}-${y}`;
      };
      const sheetData = allFlatRows.map((row) => ({
        "חנות":           row.storeName,
        "מוצר":           row.productName,
        "כמות שבוע זה":   row.grossQty,
        "שב׳ קודם":       row.lastWeekQty ?? "",
        "ממוצע 3":        row.avg3wQty !== null ? Math.round(row.avg3wQty) : "",
        "מוצע להזמין":    suggestedQty(row, suggestMode),
        "הערה":           notes[noteKey(row.storeId, row.productNameNormalized)] ?? "",
        "לא-סדיר":        row.isIrregular ? "✓" : "",
      }));
      const ws = XLSX.utils.json_to_sheet(sheetData);
      ws["!cols"] = [
        { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 12 },
        { wch: 12 }, { wch: 14 }, { wch: 32 }, { wch: 10 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "הזמנות");
      XLSX.writeFile(wb, `הזמנות_${fmtDate(selectedWeek)}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="סינון חנות..."
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="pl-3 pr-9 py-1.5 border border-gray-300 rounded-lg text-sm w-48 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">מוצע להזמין לפי:</span>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs">
            <button
              onClick={() => setSuggestMode("avg3")}
              className={clsx(
                "px-3 py-1.5 font-medium transition-colors",
                suggestMode === "avg3" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50",
              )}
            >
              ממוצע 3
            </button>
            <button
              onClick={() => setSuggestMode("top10")}
              className={clsx(
                "px-3 py-1.5 font-medium transition-colors border-r border-gray-300",
                suggestMode === "top10" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50",
              )}
            >
              Top-10
            </button>
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <span className="text-base leading-none">↓</span>
          {isExporting ? "מייצא..." : "ייצוא לאקסל"}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="text-right px-4 py-3 font-medium">מוצר</th>
              <th className="text-center px-3 py-3 font-medium">כמות שבוע זה</th>
              <th className="text-center px-3 py-3 font-medium">שב׳ קודם</th>
              <th className="text-center px-3 py-3 font-medium">ממוצע 3</th>
              <th className="text-center px-3 py-3 font-medium">מוצע להזמין</th>
              <th className="text-right px-3 py-3 font-medium min-w-[180px]">📝 הערה</th>
            </tr>
          </thead>
          <tbody>
            {filteredStores.map((store) => (
              <StoreGroup
                key={store.storeExternalId}
                store={store}
                notes={notes}
                setNote={setNote}
                suggestMode={suggestMode}
              />
            ))}
            {filteredStores.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  לא נמצאו חנויות
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 text-center">
        {allFlatRows.length} שורות בסך הכל • הייצוא כולל את כל החנויות ללא סינון
      </p>
    </div>
  );
}

// ============================================================
// STORE GROUP (header + product rows)
// ============================================================

function StoreGroup({
  store,
  notes,
  setNote,
  suggestMode,
}: {
  store: StoreWeekComparison;
  notes: Record<string, string>;
  setNote: (key: string, value: string) => void;
  suggestMode: SuggestMode;
}) {
  return (
    <>
      <tr className="bg-blue-50 border-t-2 border-blue-100">
        <td colSpan={6} className="px-4 py-2 font-semibold text-blue-800 text-sm">
          {store.storeName}
          <span className="mr-2 text-xs font-normal text-blue-400">
            {store.products.length} פריטים · סה״כ {store.totalGrossQty.toLocaleString("he-IL")} יח׳
          </span>
        </td>
      </tr>
      {store.products.map((product) => {
        const key   = noteKey(store.storeExternalId, product.productNameNormalized);
        const row: FlatRow = {
          storeId:               store.storeExternalId,
          storeName:             store.storeName,
          productName:           product.productName,
          productNameNormalized: product.productNameNormalized,
          grossQty:              product.grossQty,
          lastWeekQty:           product.lastWeekQty,
          avg3wQty:              product.avgLast3WeeksQty,
          top10Benchmark:        product.top10Benchmark,
          isIrregular:           product.isIrregular,
        };
        const suggested = suggestedQty(row, suggestMode);
        return (
          <tr
            key={key}
            className={clsx(
              "border-t border-gray-100 hover:bg-gray-50 transition-colors",
              product.isIrregular && "opacity-60",
            )}
          >
            <td className="px-4 py-2 text-gray-800">
              <span className={clsx(product.isIrregular && "italic text-gray-500")}>
                {product.isIrregular && (
                  <span className="text-purple-400 ml-1 text-xs">⊘</span>
                )}
                {product.productName}
              </span>
            </td>
            <td className="px-3 py-2 text-center font-medium text-gray-900">
              {product.grossQty.toLocaleString("he-IL")}
            </td>
            <td className="px-3 py-2 text-center text-gray-500">
              {product.lastWeekQty !== null
                ? product.lastWeekQty.toLocaleString("he-IL")
                : <span className="text-gray-300">—</span>}
            </td>
            <td className="px-3 py-2 text-center text-gray-500">
              {product.avgLast3WeeksQty !== null
                ? Math.round(product.avgLast3WeeksQty).toLocaleString("he-IL")
                : <span className="text-gray-300">—</span>}
            </td>
            <td className="px-3 py-2 text-center">
              <span className="inline-block bg-blue-50 text-blue-800 font-semibold px-2 py-0.5 rounded min-w-[2.5rem] text-sm">
                {suggested.toLocaleString("he-IL")}
              </span>
            </td>
            <td className="px-3 py-2">
              <input
                type="text"
                value={notes[key] ?? ""}
                onChange={(e) => setNote(key, e.target.value)}
                placeholder="הערה..."
                className="w-full border-0 border-b border-gray-200 focus:border-blue-400 focus:outline-none text-sm py-0.5 bg-transparent text-right"
                dir="rtl"
              />
            </td>
          </tr>
        );
      })}
    </>
  );
}
