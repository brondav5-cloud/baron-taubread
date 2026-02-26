"use client";

import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, Sector, BarChart, Bar,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import type { YearlyPnl, DbCustomGroup, ClassificationMode, DbTransaction, DbAccount, DbAccountClassificationOverride } from "@/types/accounting";

interface Props {
  yearlyPnl: YearlyPnl | null;
  prevYearlyPnl: YearlyPnl | null;
  customGroups: DbCustomGroup[];
  accounts: DbAccount[];
  transactions: DbTransaction[];
  classificationOverrides: DbAccountClassificationOverride[];
  year: number;
  classificationMode: ClassificationMode;
  onGroupClick?: (groupId: string) => void;
  onAccountClick?: (accountId: string) => void;
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

function getGaugeColor(pct: number): string {
  if (pct >= 15) return "#10B981";
  if (pct >= 5) return "#F59E0B";
  return "#EF4444";
}

// ── KPI Card ─────────────────────────────────────────────────

function KpiCard({
  label, value, pct, prevValue, isPositiveGood = true,
  color, selected, onClick, pctOfRevenue,
}: {
  label: string; value: number; pct: number | null; prevValue?: number;
  isPositiveGood?: boolean; color: string; selected?: boolean;
  onClick?: () => void; pctOfRevenue?: number | null;
}) {
  const isPositive = value >= 0;
  const pctUp = pct !== null && pct > 0;
  const pctDown = pct !== null && pct < 0;
  const isGood = isPositiveGood ? pctUp : pctDown;
  const isBad = isPositiveGood ? pctDown : pctUp;

  return (
    <button
      onClick={onClick}
      className={clsx(
        "bg-white border rounded-2xl p-4 text-right w-full transition-all duration-200 hover:shadow-md hover:scale-[1.02]",
        selected ? "border-2 shadow-md ring-2 ring-offset-1" : "border-gray-100 hover:border-gray-200",
      )}
        style={selected ? { borderColor: color, boxShadow: `0 0 0 2px ${color}20` } : {}}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 font-medium truncate">{label}</p>
          <p className={clsx("text-xl font-bold mt-1 tabular-nums truncate", isPositive ? "text-gray-900" : "text-red-600")}>
            {fmtM(value)}
          </p>
          {pctOfRevenue !== null && pctOfRevenue !== undefined && (
            <p className="text-[11px] text-gray-400 mt-0.5">{pctOfRevenue.toFixed(1)}% מהכנסות</p>
          )}
        </div>
        <div className="shrink-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: `${color}20` }}
          >
            <ChevronDown className="w-4 h-4" style={{ color }} />
          </div>
        </div>
      </div>
      {pct !== null && (
        <div className="flex items-center gap-1 mt-2">
          <span className={clsx(
            "inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md",
            isGood && "bg-green-100 text-green-700",
            isBad && "bg-red-100 text-red-700",
            !isGood && !isBad && "bg-gray-100 text-gray-600",
          )}>
            {pctUp ? <TrendingUp className="w-2.5 h-2.5" /> : pctDown ? <TrendingDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
            {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
          </span>
          {prevValue !== undefined && (
            <span className="text-[10px] text-gray-400">מ-{fmtM(prevValue)}</span>
          )}
        </div>
      )}
    </button>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean; payload?: Array<{name:string;value:number;color:string}>; label?: string
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs" dir="rtl">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-bold text-gray-900">{fmtM(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ── Active Pie Shape ──────────────────────────────────────────

const renderActiveShape = (props: {
  cx: number; cy: number; innerRadius: number; outerRadius: number;
  startAngle: number; endAngle: number; fill: string;
  payload: { name: string }; value: number; percent: number;
}) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value, percent } = props;
  return (
    <g>
      <text x={cx} y={cy - 12} textAnchor="middle" fill="#111" fontSize={12} fontWeight="bold">
        {payload.name}
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill="#374151" fontSize={11}>
        {fmtM(value)}
      </text>
      <text x={cx} y={cy + 24} textAnchor="middle" fill="#6B7280" fontSize={10}>
        {(percent * 100).toFixed(1)}%
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 10} outerRadius={outerRadius + 14}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  );
};

// ── Waterfall Tooltip ─────────────────────────────────────────

const WaterfallTooltip = ({ active, payload, label }: {
  active?: boolean; payload?: Array<{name:string;value:number;payload:{amount:number;isResult?:boolean}}>; label?: string
}) => {
  if (!active || !payload?.length) return null;
  const entry = payload.find(p => p.name === "amount");
  if (!entry) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs" dir="rtl">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="font-bold text-gray-900">{fmtM(Math.abs(entry.value))}</p>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────

export default function DashboardTab({
  yearlyPnl, prevYearlyPnl, customGroups, accounts,
  year, classificationMode, onGroupClick, onAccountClick,
}: Props) {
  const [activePieIndex, setActivePieIndex] = useState(0);
  const [selectedKpi, setSelectedKpi] = useState<string | null>(null);
  const [lineToggle, setLineToggle] = useState<"all" | "revenue" | "gross" | "net">("all");

  const curr = yearlyPnl?.total;
  const prev = prevYearlyPnl?.total;

  // ── Line chart data ───────────────────────────────────────
  const lineData = useMemo(() => {
    if (!yearlyPnl) return [];
    return yearlyPnl.months.map((md, i) => ({
      month: MONTH_SHORT[i] ?? "",
      הכנסות: md.revenue,
      "רווח גולמי": md.grossProfit,
      "רווח נקי": md.netProfit,
      "הוצאות כוללות": md.bySection.cost_of_goods + md.bySection.operating + md.bySection.admin + md.bySection.finance + md.bySection.other,
      ...(prevYearlyPnl ? {
        "הכנסות שנה קודמת": prevYearlyPnl.months[i]?.revenue ?? 0,
      } : {}),
    }));
  }, [yearlyPnl, prevYearlyPnl]);

  // ── Donut data ────────────────────────────────────────────
  const donutData = useMemo(() => {
    if (!yearlyPnl) return [];
    return customGroups
      .map(g => ({ name: g.name, value: yearlyPnl.total.byGroup.get(g.id) ?? 0, color: g.color, groupId: g.id }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [yearlyPnl, customGroups]);

  // ── Waterfall data ────────────────────────────────────────
  const waterfallData = useMemo(() => {
    if (!curr) return [];
    const {
      revenue, grossProfit, operatingProfit, netProfit,
      bySection: { cost_of_goods: cogs, operating, admin, finance, other }
    } = curr;

    const data = [
      { name: "הכנסות", base: 0, amount: revenue, fill: "#10B981", isResult: true },
      { name: "עלות המכר", base: grossProfit, amount: cogs, fill: "#EF4444" },
      { name: "רווח גולמי", base: 0, amount: grossProfit, fill: "#34D399", isResult: true },
      { name: "הוצ' תפעול", base: operatingProfit, amount: operating, fill: "#F97316" },
      { name: "הוצ' הנהלה", base: operatingProfit - admin, amount: admin, fill: "#A855F7" },
    ];

    if (finance > 0) {
      data.push({ name: "הוצ' מימון", base: netProfit + other, amount: finance, fill: "#64748B" });
    }
    if (other > 0) {
      data.push({ name: "אחר", base: netProfit, amount: other, fill: "#9CA3AF" });
    }

    data.push({
      name: "רווח נקי",
      base: 0,
      amount: netProfit,
      fill: netProfit >= 0 ? "#3B82F6" : "#EF4444",
      isResult: true,
    });

    return data;
  }, [curr]);

  // ── Top 5 expenses ────────────────────────────────────────
  const top5 = useMemo(() => {
    if (!yearlyPnl) return [];
    const accountById = new Map(accounts.map(a => [a.id, a]));
    const rows: Array<{ id: string; name: string; code: string; curr: number; prev: number | null; pctOfRev: number }> = [];

    yearlyPnl.total.byAccount.forEach((amount, id) => {
      if (amount <= 0) return;
      const account = accountById.get(id);
      if (!account || account.account_type !== "expense") return;
      const prevAmt = prevYearlyPnl?.total.byAccount.get(id) ?? null;
      rows.push({
        id, name: account.name, code: account.code,
        curr: amount,
        prev: prevAmt,
        pctOfRev: yearlyPnl.total.revenue > 0 ? (amount / yearlyPnl.total.revenue) * 100 : 0,
      });
    });

    return rows.sort((a, b) => b.curr - a.curr).slice(0, 5);
  }, [yearlyPnl, prevYearlyPnl, accounts]);

  if (!yearlyPnl || !curr) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-sm">אין נתונים לשנת {year}. העלה קובץ כרטסת בטאב &quot;קבצים&quot;</p>
      </div>
    );
  }

  const totalExpenses = curr.bySection.cost_of_goods + curr.bySection.operating + curr.bySection.admin + curr.bySection.finance + curr.bySection.other;
  const netProfitPct = curr.revenue > 0 ? (curr.netProfit / curr.revenue) * 100 : 0;
  const grossMarginPct = curr.revenue > 0 ? (curr.grossProfit / curr.revenue) * 100 : 0;
  const operatingPct = curr.revenue > 0 ? (curr.operatingProfit / curr.revenue) * 100 : 0;

  const kpiCards = [
    // Row 1 — Profit picture
    { id: "revenue", label: "הכנסות נטו", value: curr.revenue, prev: prev?.revenue, color: "#0D9488", isPositiveGood: true, pctOfRev: null },
    { id: "gross", label: "רווח גולמי", value: curr.grossProfit, prev: prev?.grossProfit, color: "#10B981", isPositiveGood: true, pctOfRev: grossMarginPct },
    { id: "operating", label: "רווח תפעולי", value: curr.operatingProfit, prev: prev?.operatingProfit, color: "#3B82F6", isPositiveGood: true, pctOfRev: operatingPct },
    { id: "net", label: "רווח נקי", value: curr.netProfit, prev: prev?.netProfit, color: "#1D4ED8", isPositiveGood: true, pctOfRev: netProfitPct },
    // Row 2 — Expenses
    { id: "cogs", label: "עלות סחורה", value: curr.bySection.cost_of_goods, prev: prev?.bySection.cost_of_goods, color: "#EF4444", isPositiveGood: false, pctOfRev: curr.revenue > 0 ? (curr.bySection.cost_of_goods / curr.revenue) * 100 : 0 },
    { id: "opex", label: "הוצאות תפעול", value: curr.bySection.operating, prev: prev?.bySection.operating, color: "#F97316", isPositiveGood: false, pctOfRev: curr.revenue > 0 ? (curr.bySection.operating / curr.revenue) * 100 : 0 },
    { id: "admin", label: "הוצאות הנהלה", value: curr.bySection.admin, prev: prev?.bySection.admin, color: "#A855F7", isPositiveGood: false, pctOfRev: curr.revenue > 0 ? (curr.bySection.admin / curr.revenue) * 100 : 0 },
    { id: "finance", label: "הוצאות מימון", value: curr.bySection.finance, prev: prev?.bySection.finance, color: "#6B7280", isPositiveGood: false, pctOfRev: curr.revenue > 0 ? (curr.bySection.finance / curr.revenue) * 100 : 0 },
  ];

  const lineKeys: Record<string, Array<{ key: string; color: string; dash?: string }>> = {
    all: [
      { key: "הכנסות", color: "#10B981" },
      { key: "הוצאות כוללות", color: "#EF4444" },
      { key: "רווח נקי", color: "#3B82F6", dash: "5 5" },
    ],
    revenue: [
      { key: "הכנסות", color: "#10B981" },
      ...(prevYearlyPnl ? [{ key: "הכנסות שנה קודמת", color: "#10B981", dash: "3 6" }] : []),
    ],
    gross: [{ key: "רווח גולמי", color: "#34D399" }],
    net: [{ key: "רווח נקי", color: "#3B82F6" }],
  };

  return (
    <div className="space-y-6" dir="rtl">
      {classificationMode === "original" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs text-amber-700 font-medium">
          מצב תצוגה: סיווג מקורי — כל תנועה מוצגת לפי הסיווג מהקובץ המקורי
        </div>
      )}

      {/* ── 8 KPI Cards ── */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpiCards.slice(0, 4).map(k => (
            <KpiCard key={k.id}
              label={k.label} value={k.value}
              pct={pctChange(k.value, k.prev ?? 0)}
              prevValue={k.prev}
              isPositiveGood={k.isPositiveGood}
              color={k.color}
              selected={selectedKpi === k.id}
              onClick={() => setSelectedKpi(prev => prev === k.id ? null : k.id)}
              pctOfRevenue={k.pctOfRev}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpiCards.slice(4).map(k => (
            <KpiCard key={k.id}
              label={k.label} value={k.value}
              pct={pctChange(k.value, k.prev ?? 0)}
              prevValue={k.prev}
              isPositiveGood={k.isPositiveGood}
              color={k.color}
              selected={selectedKpi === k.id}
              onClick={() => setSelectedKpi(prev => prev === k.id ? null : k.id)}
              pctOfRevenue={k.pctOfRev}
            />
          ))}
        </div>
      </div>

      {/* ── Waterfall + Line Charts Row ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Waterfall */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">גרף מפל — מהכנסות לרווח נקי</h3>
          <p className="text-[11px] text-gray-400 mb-4">כל עמודה מראה את השפעת כל סעיף על הרווח</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={waterfallData} margin={{ top: 5, right: 5, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9CA3AF" }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 9, fill: "#9CA3AF" }} width={45} />
              <Tooltip content={<WaterfallTooltip />} />
              <Bar dataKey="base" stackId="wf" fill="transparent" isAnimationActive={false} />
              <Bar dataKey="amount" stackId="wf" radius={[3, 3, 0, 0]} isAnimationActive>
                {waterfallData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line chart */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-gray-700">טרנד חודשי — {year}</h3>
            <div className="flex gap-1">
              {(["all", "revenue", "gross", "net"] as const).map(t => (
                <button key={t}
                  onClick={() => setLineToggle(t)}
                  className={clsx("px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors border",
                    lineToggle === t ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-500 border-gray-200 hover:border-primary-300"
                  )}>
                  {{ all: "הכל", revenue: "הכנסות", gross: "גולמי", net: "נקי" }[t]}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={lineData} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9CA3AF" }} />
              <YAxis tickFormatter={(v: number) => `₪${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 9, fill: "#9CA3AF" }} width={50} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {(lineKeys[lineToggle] ?? lineKeys.all!).map(l => (
                <Line key={l.key} type="monotone" dataKey={l.key}
                  stroke={l.color} strokeWidth={2} dot={false}
                  strokeDasharray={l.dash}
                  opacity={l.dash ? 0.55 : 1}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Donut + Top5 + Gauge ── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Donut */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">חלוקת הוצאות</h3>
          {donutData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">אין נתוני הוצאות</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    activeIndex={activePieIndex}
                    activeShape={renderActiveShape as unknown as React.ReactElement}
                    data={donutData}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={75}
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
              <div className="space-y-1 mt-2">
                {donutData.slice(0, 6).map(entry => (
                  <button key={entry.groupId}
                    onClick={() => onGroupClick?.(entry.groupId)}
                    className="w-full flex items-center justify-between text-xs hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
                      <span className="text-gray-700 truncate max-w-[120px]">{entry.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-left">
                      <span className="font-medium text-gray-900">{fmtM(entry.value)}</span>
                      <span className="text-gray-400 text-[10px]">
                        {totalExpenses > 0 ? ` ${((entry.value / totalExpenses) * 100).toFixed(0)}%` : ""}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Top 5 */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Top 5 הוצאות גדולות</h3>
          <div className="space-y-2">
            {top5.map((row, i) => {
              const yoy = row.prev ? pctChange(row.curr, row.prev) : null;
              const isAlert = yoy !== null && yoy > 20;
              return (
                <button key={row.id}
                  onClick={() => onAccountClick?.(row.id)}
                  className="w-full text-right hover:bg-gray-50 rounded-xl px-3 py-2 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="text-[11px] text-gray-400 font-bold mt-0.5 shrink-0">{i + 1}.</span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-gray-800 truncate">
                          {row.name}
                          {isAlert && <span className="mr-1 text-[9px] text-red-500">⚠️</span>}
                        </p>
                        <p className="text-[10px] text-gray-400">{row.pctOfRev.toFixed(1)}% מהכנסות</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-left">
                      <p className="text-[11px] font-bold text-gray-900">{fmtM(row.curr)}</p>
                      {yoy !== null && (
                        <p className={clsx("text-[9px] font-semibold",
                          yoy > 0 ? "text-red-500" : "text-green-600")}>
                          {yoy > 0 ? "▲" : "▼"} {Math.abs(yoy).toFixed(0)}%
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {top5.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">אין נתוני הוצאות</p>
            )}
          </div>
        </div>

        {/* Gauge */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-gray-700 mb-2 w-full text-right">מד רווחיות נקייה</h3>
          <div className="relative flex items-end justify-center" style={{ height: 140 }}>
            <ResponsiveContainer width={200} height={130}>
              <PieChart>
                <Pie
                  startAngle={180} endAngle={0}
                  data={[
                    { value: Math.max(0, Math.min(100, netProfitPct)) },
                    { value: Math.max(0, 100 - Math.min(100, netProfitPct)) },
                  ]}
                  cx="50%" cy="100%"
                  innerRadius={60} outerRadius={80}
                  dataKey="value"
                  isAnimationActive
                >
                  <Cell fill={getGaugeColor(netProfitPct)} />
                  <Cell fill="#F3F4F6" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute bottom-2 flex flex-col items-center">
              <span
                className="text-2xl font-bold tabular-nums"
                style={{ color: getGaugeColor(netProfitPct) }}
              >
                {netProfitPct.toFixed(1)}%
              </span>
              <span className="text-[10px] text-gray-400">רווח נקי</span>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded-full" />0–5%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-400 rounded-full" />5–15%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full" />15%+</span>
          </div>
          <div className="mt-4 w-full space-y-2 text-[11px]">
            <div className="flex justify-between text-gray-600">
              <span>רווח גולמי:</span>
              <span className="font-semibold">{grossMarginPct.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>רווח תפעולי:</span>
              <span className="font-semibold">{operatingPct.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
