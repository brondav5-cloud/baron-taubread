"use client";

import { useState } from "react";
import { Search, Download, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { loadXlsx } from "@/lib/loadXlsx";
import type { DbTransaction } from "@/types/accounting";

const MONTH_LABELS = [
  "ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני",
  "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳",
];

function fmtFull(n: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency", currency: "ILS", maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

interface Props {
  yearTxs: DbTransaction[];   // filtered to selected year (+ expanded month if set)
  exportTxs: DbTransaction[]; // full year, for export
  expandedMonth: number | null;
  displayName: string;
  selectedYear: number;
}

export function SupplierTransactionsTab({
  yearTxs, exportTxs, expandedMonth, displayName, selectedYear,
}: Props) {
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const filtered = search.trim()
    ? yearTxs.filter((t) => {
        const q = search.trim().toLowerCase();
        return (
          (t.description ?? "").toLowerCase().includes(q) ||
          (t.account_id ?? "").toLowerCase().includes(q) ||
          (t.original_account_name ?? "").toLowerCase().includes(q)
        );
      })
    : yearTxs;

  const handleExport = async () => {
    setExporting(true);
    try {
      const XLSX = await loadXlsx();
      const rows = exportTxs.map((tx) => ({
        "תאריך": tx.transaction_date,
        "תיאור": tx.description ?? "",
        "חשבון": tx.account_id,
        "שם חשבון": tx.original_account_name ?? "",
        "חובה": tx.debit,
        "זכות": tx.credit,
        "נטו": tx.debit - tx.credit,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "תנועות ספק");
      XLSX.writeFile(wb, `${displayName}_${selectedYear}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
        <h3 className="text-xs font-bold text-gray-700">
          תנועות{expandedMonth !== null ? ` — ${MONTH_LABELS[expandedMonth]}` : ""}{" "}
          ({filtered.length})
        </h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש תיאור..."
              className="pr-8 pl-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-indigo-300 w-36"
            />
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || exportTxs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-40 shrink-0"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Excel
          </button>
        </div>
      </div>

      <div className="overflow-x-auto" dir="rtl">
        <table className="text-[11px] w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-right py-2.5 px-4 font-semibold text-gray-600">תאריך</th>
              <th className="text-right py-2.5 px-4 font-semibold text-gray-600">תיאור</th>
              <th className="text-right py-2.5 px-4 font-semibold text-gray-600">חשבון</th>
              <th className="text-right py-2.5 px-4 font-semibold text-gray-600">חובה</th>
              <th className="text-right py-2.5 px-4 font-semibold text-gray-600">זכות</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-gray-400">
                  לא נמצאו תנועות
                </td>
              </tr>
            ) : (
              filtered.slice(0, 200).map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors"
                >
                  <td className="py-2 px-4 tabular-nums text-gray-500">
                    {fmtDate(tx.transaction_date)}
                  </td>
                  <td className="py-2 px-4 text-gray-800 max-w-[220px] truncate">
                    {tx.description ?? "—"}
                  </td>
                  <td className="py-2 px-4 text-gray-500 max-w-[140px] truncate">
                    {tx.original_account_name ?? tx.account_id}
                  </td>
                  <td
                    className={clsx(
                      "py-2 px-4 tabular-nums",
                      tx.debit > 0 ? "text-red-600" : "text-gray-300",
                    )}
                  >
                    {tx.debit > 0 ? fmtFull(tx.debit) : "—"}
                  </td>
                  <td
                    className={clsx(
                      "py-2 px-4 tabular-nums",
                      tx.credit > 0 ? "text-emerald-600" : "text-gray-300",
                    )}
                  >
                    {tx.credit > 0 ? fmtFull(tx.credit) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {filtered.length > 200 && (
          <p className="text-[10px] text-gray-400 text-center py-2">
            מוצגות 200 מתוך {filtered.length} תנועות — השתמש בחיפוש לסינון
          </p>
        )}
      </div>
    </div>
  );
}
