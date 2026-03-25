"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronRight, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import Link from "next/link";
import type { PnlResponse, PnlCategoryLine } from "@/app/api/finance/pnl/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return "₪" + Math.abs(n).toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const MONTH_NAMES = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

function monthLabel(ym: string): string {
  const [, m] = ym.split("-");
  return MONTH_NAMES[(parseInt(m ?? "1") - 1)] ?? ym;
}

const TYPE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  income:       { bg: "bg-green-50",  text: "text-green-700",  label: "הכנסות" },
  expense:      { bg: "bg-red-50",    text: "text-red-700",    label: "הוצאות" },
  transfer:     { bg: "bg-blue-50",   text: "text-blue-700",   label: "העברות" },
  ignore:       { bg: "bg-gray-50",   text: "text-gray-400",   label: "מתעלם" },
  uncategorized:{ bg: "bg-yellow-50", text: "text-yellow-700", label: "לא מסווג" },
};

// ─── Section component ────────────────────────────────────────────────────────

function PnlSection({ lines, months, type }: { lines: PnlCategoryLine[]; months: string[]; type: string }) {
  const style = TYPE_STYLE[type] ?? TYPE_STYLE["uncategorized"]!;
  const group = lines.filter((l) => l.category_type === type);
  if (group.length === 0) return null;

  const sectionTotal = group.reduce((s, l) => s + l.total, 0);
  const showMonths = months.length > 1;

  return (
    <div className={`rounded-xl overflow-hidden border border-gray-100 shadow-sm ${style.bg}`}>
      {/* Section header */}
      <div className={`flex items-center justify-between px-4 py-3 font-bold ${style.text}`}>
        <span>{style.label}</span>
        <span className="text-lg">{fmt(sectionTotal)}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" dir="rtl">
          {showMonths && (
            <thead className="border-b border-gray-100 bg-white/60">
              <tr>
                <th className="text-right px-4 py-2 font-medium text-gray-500">קטגוריה</th>
                {months.map((ym) => (
                  <th key={ym} className="text-center px-3 py-2 font-medium text-gray-500 whitespace-nowrap">
                    {monthLabel(ym)}
                  </th>
                ))}
                <th className="text-left px-4 py-2 font-medium text-gray-500">סה&quot;כ</th>
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-gray-100/50">
            {group.map((line) => (
              <tr key={line.category_id ?? "__none__"} className="bg-white/40 hover:bg-white/70 transition-colors">
                <td className="px-4 py-2.5 font-medium text-gray-700">{line.category_name}</td>
                {showMonths && months.map((ym) => (
                  <td key={ym} className={`px-3 py-2.5 text-center font-mono text-xs ${
                    (line.monthly[ym] ?? 0) !== 0 ? style.text : "text-gray-300"}`}>
                    {(line.monthly[ym] ?? 0) !== 0 ? fmt(line.monthly[ym] ?? 0) : "—"}
                  </td>
                ))}
                <td className={`px-4 py-2.5 text-left font-mono font-semibold ${style.text}`}>
                  {fmt(line.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PnlPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(0); // 0 = כל השנה
  const [data, setData] = useState<PnlResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = month > 0
        ? `/api/finance/pnl?year=${year}&month=${month}`
        : `/api/finance/pnl?year=${year}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("שגיאה בטעינת הדוח");
      const d: PnlResponse = await res.json();
      setData(d);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/dashboard/finance" className="text-gray-400 hover:text-gray-600">
          <ChevronRight className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">דוח רווח והפסד</h1>
          <p className="text-sm text-gray-500 mt-0.5">סיכום הכנסות והוצאות לפי קטגוריה</p>
        </div>

        {/* Year + Month selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <button onClick={() => setYear((y) => y - 1)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">
              ›
            </button>
            <span className="font-bold text-gray-800 w-14 text-center">{year}</span>
            <button onClick={() => setYear((y) => y + 1)}
              disabled={year >= currentYear}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600 disabled:opacity-30">
              ‹
            </button>
          </div>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value={0}>כל השנה</option>
            {MONTH_NAMES.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-400 py-8 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>טוען...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {data && !loading && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-600">סה&quot;כ הכנסות</span>
              </div>
              <p className="text-3xl font-bold text-green-700">{fmt(data.income_total)}</p>
            </div>
            <div className="bg-red-50 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-5 h-5 text-red-500" />
                <span className="text-sm font-medium text-red-600">סה&quot;כ הוצאות</span>
              </div>
              <p className="text-3xl font-bold text-red-700">{fmt(data.expense_total)}</p>
            </div>
            <div className={`rounded-2xl p-5 ${data.net >= 0 ? "bg-blue-50" : "bg-orange-50"}`}>
              <div className="flex items-center gap-2 mb-2">
                <Minus className={`w-5 h-5 ${data.net >= 0 ? "text-blue-500" : "text-orange-500"}`} />
                <span className={`text-sm font-medium ${data.net >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                  רווח נקי
                </span>
              </div>
              <p className={`text-3xl font-bold ${data.net >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                {data.net < 0 ? "-" : ""}{fmt(data.net)}
              </p>
            </div>
          </div>

          {data.lines.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-center py-16 text-gray-400">
              <p className="font-medium text-lg">אין נתונים לשנה {year}</p>
              <p className="text-sm mt-2">העלה קבצי תנועות בנק והוסף קטגוריות סיווג</p>
              <div className="flex gap-3 justify-center mt-4">
                <Link href="/dashboard/finance" className="text-sm text-blue-600 hover:underline">
                  תנועות בנק
                </Link>
                <span className="text-gray-300">·</span>
                <Link href="/dashboard/finance/categories" className="text-sm text-blue-600 hover:underline">
                  קטגוריות
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {(["income", "expense", "transfer", "uncategorized", "ignore"] as const).map((type) => (
                <PnlSection
                  key={type}
                  lines={data.lines}
                  months={data.months}
                  type={type}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
