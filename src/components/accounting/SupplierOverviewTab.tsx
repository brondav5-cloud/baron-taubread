"use client";

import { clsx } from "clsx";
import { Zap } from "lucide-react";

const MONTH_LABELS = [
  "ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני",
  "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳",
];

function fmtFull(n: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency", currency: "ILS", maximumFractionDigits: 0,
  }).format(n);
}

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

export interface YearSummary {
  year: number;
  total: number;
  count: number;
}

interface Props {
  yearTotal: number;
  avgMonth: number;
  activeMonths: number;
  maxMonthValue: number;
  maxMonthIndex: number;
  trendPct: number | null;
  selectedYear: number;
  currentYearSummary: YearSummary | undefined;
  yearSummary: YearSummary[];
  years: number[];
  totalCompanyExpenses: number;
  insights: string[];
  onYearChange: (yr: number) => void;
}

export function SupplierOverviewTab({
  yearTotal, avgMonth, activeMonths, maxMonthValue, maxMonthIndex,
  trendPct, selectedYear, currentYearSummary, yearSummary, years,
  totalCompanyExpenses, insights, onYearChange,
}: Props) {
  const expensePct =
    totalCompanyExpenses > 0 && yearTotal > 0
      ? (yearTotal / totalCompanyExpenses) * 100
      : null;

  const kpis = [
    {
      label: "סה״כ שנה",
      value: fmtFull(yearTotal),
      sub: `${currentYearSummary?.count ?? 0} תנועות`,
      color: "text-gray-900",
    },
    {
      label: "ממוצע חודשי",
      value: fmtFull(avgMonth),
      sub: `${activeMonths} חודשים פעילים`,
      color: "text-gray-900",
    },
    {
      label: "חודש שיא",
      value: maxMonthValue > 0 ? fmtFull(maxMonthValue) : "—",
      sub: maxMonthValue > 0 ? (MONTH_LABELS[maxMonthIndex] ?? "") : "אין נתון",
      color: "text-gray-900",
    },
    {
      label: "שינוי שנתי",
      value: trendPct !== null ? `${trendPct > 0 ? "+" : ""}${trendPct.toFixed(1)}%` : "—",
      sub: trendPct !== null ? `vs ${selectedYear - 1}` : "אין נתון קודם",
      color:
        trendPct !== null
          ? trendPct > 5 ? "text-red-600" : trendPct < -5 ? "text-emerald-600" : "text-gray-900"
          : "text-gray-900",
    },
    {
      label: "% מהוצאות",
      value: expensePct !== null ? `${expensePct.toFixed(1)}%` : "—",
      sub:
        expensePct !== null
          ? expensePct >= 10 ? "תלות גבוהה" : "מסך הוצאות"
          : "מחשב...",
      color:
        expensePct !== null
          ? expensePct >= 20 ? "text-red-600" : expensePct >= 10 ? "text-orange-600" : "text-gray-900"
          : "text-gray-900",
    },
  ];

  return (
    <div className="space-y-5">
      {/* KPI cards — 5 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-white border border-gray-200 rounded-2xl p-3 text-center"
          >
            <p className="text-xs text-gray-500 mb-0.5">{k.label}</p>
            <p className={clsx("text-lg font-bold tabular-nums leading-tight", k.color)}>
              {k.value}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Smart insights */}
      {insights.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-600 shrink-0" />
            <h3 className="text-xs font-bold text-amber-800">תובנות</h3>
          </div>
          <ul className="space-y-1">
            {insights.map((insight, i) => (
              <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                <span className="text-amber-400 mt-0.5 shrink-0">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Multi-year comparison */}
      {years.length > 1 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <h3 className="text-xs font-bold text-gray-700 mb-3">השוואה שנתית</h3>
          <div className="flex items-end gap-3 h-20">
            {yearSummary.map(({ year: yr, total }) => {
              const maxVal = Math.max(...yearSummary.map((y) => Math.abs(y.total)), 1);
              const height = (Math.abs(total) / maxVal) * 100;
              return (
                <div
                  key={yr}
                  className="flex-1 flex flex-col items-center gap-1 cursor-pointer"
                  onClick={() => onYearChange(yr)}
                >
                  <span className="text-[9px] text-gray-500 tabular-nums">{fmt(total)}</span>
                  <div
                    className={clsx(
                      "w-full rounded-t-sm transition-all",
                      yr === selectedYear ? "bg-indigo-700" : "bg-indigo-200 hover:bg-indigo-300",
                    )}
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <span
                    className={clsx(
                      "text-[10px] font-semibold",
                      yr === selectedYear ? "text-indigo-800" : "text-gray-400",
                    )}
                  >
                    {yr}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
