"use client";

import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, Sector,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { clsx } from "clsx";
import type { YearlyPnl, DbCustomGroup, ClassificationMode } from "@/types/accounting";
import { PARENT_SECTION_LABELS } from "@/types/accounting";

interface Props {
  yearlyPnl: YearlyPnl | null;
  prevYearlyPnl: YearlyPnl | null;
  customGroups: DbCustomGroup[];
  year: number;
  classificationMode: ClassificationMode;
  onGroupClick?: (groupId: string) => void;
}

const MONTH_SHORT = ["ינו","פבר","מרץ","אפר","מאי","יוני","יולי","אוג","ספט","אוק","נוב","דצמ"];

function fmtM(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1_000_000) return `₪${(val / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `₪${(val / 1_000).toFixed(0)}K`;
  if (abs >= 1_000) return `₪${(val / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(val);
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

function SummaryCard({
  label,
  value,
  pct,
  prevValue,
  isPositiveGood = true,
}: {
  label: string;
  value: number;
  pct: number | null;
  prevValue?: number;
  isPositiveGood?: boolean;
}) {
  const isPositive = value >= 0;
  const pctUp = pct !== null && pct > 0;
  const pctDown = pct !== null && pct < 0;
  const isGood = isPositiveGood ? pctUp : pctDown;
  const isBad = isPositiveGood ? pctDown : pctUp;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-sm transition-shadow">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p
        className={clsx(
          "text-2xl font-bold mt-1 tabular-nums",
          isPositive ? "text-gray-900" : "text-red-600",
        )}
      >
        {fmtM(value)}
      </p>
      {pct !== null && (
        <div className="flex items-center gap-1 mt-2">
          <span
            className={clsx(
              "inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-md",
              isGood && "bg-green-100 text-green-700",
              isBad && "bg-red-100 text-red-700",
              !isGood && !isBad && "bg-gray-100 text-gray-600",
            )}
          >
            {pctUp ? <TrendingUp className="w-3 h-3" /> : pctDown ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
          </span>
          {prevValue !== undefined && (
            <span className="text-xs text-gray-400">מ-{fmtM(prevValue)}</span>
          )}
        </div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: {active?: boolean; payload?: Array<{name:string;value:number;color:string}>; label?: string}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs" dir="rtl">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-bold text-gray-900">{fmtM(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const renderActiveShape = (props: {
  cx: number; cy: number; innerRadius: number; outerRadius: number;
  startAngle: number; endAngle: number; fill: string;
  payload: { name: string }; value: number; percent: number;
}) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value, percent } = props;
  return (
    <g>
      <text x={cx} y={cy - 12} textAnchor="middle" fill="#111" fontSize={13} fontWeight="bold">
        {payload.name}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#374151" fontSize={12}>
        {fmtM(value)}
      </text>
      <text x={cx} y={cy + 28} textAnchor="middle" fill="#6B7280" fontSize={11}>
        {(percent * 100).toFixed(1)}%
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 10} outerRadius={outerRadius + 14}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  );
};

export default function DashboardTab({
  yearlyPnl,
  prevYearlyPnl,
  customGroups,
  year,
  classificationMode,
  onGroupClick,
}: Props) {
  const [activePieIndex, setActivePieIndex] = useState(0);

  const curr = yearlyPnl?.total;
  const prev = prevYearlyPnl?.total;

  // Line chart data
  const lineData = useMemo(() => {
    if (!yearlyPnl) return [];
    return yearlyPnl.months.map((md, i) => ({
      month: MONTH_SHORT[i] ?? "",
      הכנסות: md.revenue,
      הוצאות: md.bySection.cost_of_goods + md.bySection.operating + md.bySection.admin + md.bySection.finance + md.bySection.other,
      "רווח נקי": md.netProfit,
      // Prev year
      ...(prevYearlyPnl ? {
        "הכנסות שנה קודמת": prevYearlyPnl.months[i]?.revenue ?? 0,
      } : {}),
    }));
  }, [yearlyPnl, prevYearlyPnl]);

  // Donut chart data
  const donutData = useMemo(() => {
    if (!yearlyPnl) return [];
    const result: Array<{ name: string; value: number; color: string; groupId: string }> = [];
    for (const g of customGroups) {
      const val = yearlyPnl.total.byGroup.get(g.id) ?? 0;
      if (val > 0) {
        result.push({ name: g.name, value: val, color: g.color, groupId: g.id });
      }
    }
    // Sort by value descending
    return result.sort((a, b) => b.value - a.value);
  }, [yearlyPnl, customGroups]);

  if (!yearlyPnl || !curr) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-sm">אין נתונים לשנת {year}. העלה קובץ כרטסת בטאב &quot;קבצים&quot;</p>
      </div>
    );
  }

  const totalExpenses = curr.bySection.cost_of_goods + curr.bySection.operating + curr.bySection.admin + curr.bySection.finance + curr.bySection.other;

  return (
    <div className="space-y-6" dir="rtl">
      {classificationMode === "original" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs text-amber-700 font-medium">
          מצב תצוגה: סיווג מקורי — כל תנועה מוצגת לפי הסיווג מהקובץ המקורי שלה
        </div>
      )}

      {/* 4 summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="הכנסות נטו"
          value={curr.revenue}
          pct={pctChange(curr.revenue, prev?.revenue ?? 0)}
          prevValue={prev?.revenue}
        />
        <SummaryCard
          label="רווח גולמי"
          value={curr.grossProfit}
          pct={pctChange(curr.grossProfit, prev?.grossProfit ?? 0)}
          prevValue={prev?.grossProfit}
        />
        <SummaryCard
          label="רווח תפעולי"
          value={curr.operatingProfit}
          pct={pctChange(curr.operatingProfit, prev?.operatingProfit ?? 0)}
          prevValue={prev?.operatingProfit}
        />
        <SummaryCard
          label="רווח נקי"
          value={curr.netProfit}
          pct={pctChange(curr.netProfit, prev?.netProfit ?? 0)}
          prevValue={prev?.netProfit}
        />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Line chart */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">טרנד חודשי — {year}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={lineData} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} />
              <YAxis
                tickFormatter={(v: number) => `₪${(v / 1000).toFixed(0)}K`}
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="הכנסות" stroke="#10B981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="הוצאות" stroke="#EF4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="רווח נקי" stroke="#3B82F6" strokeWidth={2} dot={false} strokeDasharray="5 5" />
              {prevYearlyPnl && (
                <Line type="monotone" dataKey="הכנסות שנה קודמת" stroke="#10B981" strokeWidth={1.5} dot={false} strokeDasharray="3 6" opacity={0.5} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Donut */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">חלוקת הוצאות</h3>
          {donutData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              אין נתוני הוצאות
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    activeIndex={activePieIndex}
                    activeShape={renderActiveShape as unknown as React.ReactElement}
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    dataKey="value"
                    onMouseEnter={(_, index) => setActivePieIndex(index)}
                    onClick={(entry: { groupId: string }) => onGroupClick?.(entry.groupId)}
                    style={{ cursor: "pointer" }}
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="space-y-1.5 mt-2">
                {donutData.map((entry) => (
                  <button
                    key={entry.groupId}
                    onClick={() => onGroupClick?.(entry.groupId)}
                    className="w-full flex items-center justify-between text-xs hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
                      <span className="text-gray-700 truncate max-w-[120px]">{entry.name}</span>
                    </div>
                    <div className="text-left">
                      <span className="font-medium text-gray-900">{fmtM(entry.value)}</span>
                      <span className="text-gray-400 mr-1">
                        {totalExpenses > 0 ? ` ${((entry.value / totalExpenses) * 100).toFixed(0)}%` : ""}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Section totals bar */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">סיכום לפי סעיפים</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(["cost_of_goods", "operating", "admin", "finance", "other"] as const).map((sec) => {
            const val = curr.bySection[sec];
            if (val === 0 && sec !== "cost_of_goods") return null;
            const pct = curr.revenue > 0 ? (val / curr.revenue) * 100 : 0;
            return (
              <div key={sec} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-500 font-medium">{PARENT_SECTION_LABELS[sec]}</p>
                <p className="text-sm font-bold text-gray-900 mt-1">{fmtM(val)}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{pct.toFixed(1)}% מהכנסות</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
