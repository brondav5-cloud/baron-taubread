"use client";

import { clsx } from "clsx";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";

const MONTH_LABELS = [
  "ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני",
  "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳",
];

function fmtFull(n: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency", currency: "ILS", maximumFractionDigits: 0,
  }).format(n);
}

interface ChartDataItem {
  label: string;
  value: number;
}

export interface AccountBreakdownItem {
  id: string;
  name: string | null;
  total: number;
  count: number;
}

export interface MonthCount {
  total: number;
  count: number;
}

interface Props {
  chartData: ChartDataItem[];
  monthCounts: MonthCount[];
  yearTotal: number;
  currentYearCount: number;
  selectedYear: number;
  expandedMonth: number | null;
  accountsBreakdown: AccountBreakdownItem[];
  onExpandMonth: (m: number | null) => void;
}

export function SupplierChartsTab({
  chartData, monthCounts, yearTotal, currentYearCount,
  selectedYear, expandedMonth, accountsBreakdown, onExpandMonth,
}: Props) {
  return (
    <div className="space-y-5">
      {/* Monthly bar chart */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-700">
            ציר הוצאות חודשי — {selectedYear}
          </h3>
          {expandedMonth !== null && (
            <button
              onClick={() => onExpandMonth(null)}
              className="text-[10px] text-indigo-600 hover:underline"
            >
              הצג כל החודשים
            </button>
          )}
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              formatter={(v: number) => [fmtFull(v), "הוצאה"]}
              contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <Bar
              dataKey="value"
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={(_, index) => onExpandMonth(expandedMonth === index ? null : index)}
            >
              {chartData.map((item, i) => (
                <Cell
                  key={i}
                  fill={
                    expandedMonth === i
                      ? "#3730a3"
                      : (item.value ?? 0) > 0
                      ? "#6366f1"
                      : "#e5e7eb"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-gray-400 text-center mt-1">
          לחץ על עמודה לסינון תנועות
        </p>
      </div>

      {/* Month-by-month breakdown table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-xs font-bold text-gray-700">
            פילוח לפי חודשים — {selectedYear}
          </h3>
        </div>
        <table className="text-[11px] w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-right py-2 px-4 font-semibold text-gray-600">חודש</th>
              <th className="text-right py-2 px-4 font-semibold text-gray-600">תנועות</th>
              <th className="text-right py-2 px-4 font-semibold text-gray-600">סה״כ</th>
              <th className="text-right py-2 px-4 font-semibold text-gray-600">% מהשנה</th>
              <th className="py-2 px-4 w-8" />
            </tr>
          </thead>
          <tbody>
            {MONTH_LABELS.map((label, i) => {
              const mc = monthCounts[i] ?? { total: 0, count: 0 };
              const isExpanded = expandedMonth === i;
              const pct = yearTotal > 0 ? (mc.total / yearTotal) * 100 : 0;
              return (
                <tr
                  key={i}
                  onClick={() => mc.count > 0 && onExpandMonth(isExpanded ? null : i)}
                  className={clsx(
                    "border-b border-gray-50 transition-colors",
                    mc.count > 0 ? "cursor-pointer" : "opacity-35",
                    isExpanded ? "bg-indigo-50" : mc.count > 0 ? "hover:bg-gray-50/60" : "",
                  )}
                >
                  <td className="py-2 px-4 font-medium text-gray-700">{label}</td>
                  <td className="py-2 px-4 text-gray-500">{mc.count > 0 ? mc.count : "—"}</td>
                  <td
                    className={clsx(
                      "py-2 px-4 tabular-nums font-semibold",
                      mc.total > 0 ? "text-gray-800" : "text-gray-300",
                    )}
                  >
                    {mc.total > 0 ? fmtFull(mc.total) : "—"}
                  </td>
                  <td className="py-2 px-4">
                    {mc.total > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[80px]">
                          <div
                            className="bg-indigo-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500">{pct.toFixed(0)}%</span>
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-4 text-gray-400">
                    {mc.count > 0 &&
                      (isExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-indigo-900 text-white">
              <td className="py-2.5 px-4 font-bold">סה״כ {selectedYear}</td>
              <td className="py-2.5 px-4">{currentYearCount}</td>
              <td className="py-2.5 px-4 tabular-nums font-bold">{fmtFull(yearTotal)}</td>
              <td className="py-2.5 px-4 text-indigo-300">100%</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Account breakdown (which GL accounts this supplier appears in) */}
      {accountsBreakdown.length > 1 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <h3 className="text-xs font-bold text-gray-700 mb-3">
            פיזור לפי חשבון חשבונאי — {selectedYear}
          </h3>
          <div className="space-y-2">
            {accountsBreakdown.map((acc) => {
              const pct = yearTotal > 0 ? (acc.total / yearTotal) * 100 : 0;
              return (
                <div key={acc.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">
                      {acc.name ?? acc.id}
                    </p>
                    <p className="text-[10px] text-gray-400">{acc.count} תנועות</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-24 bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-indigo-400 h-1.5 rounded-full"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 w-8 text-left">
                      {pct.toFixed(0)}%
                    </span>
                    <span className="text-xs font-semibold text-gray-700 tabular-nums w-20 text-left">
                      {fmtFull(acc.total)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
