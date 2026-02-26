"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Download, ChevronDown, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import type {
  YearlyPnl, DbCustomGroup, DbAccount, MonthlyPnl,
} from "@/types/accounting";
import { PARENT_SECTION_LABELS, PARENT_SECTION_ORDER } from "@/types/accounting";
import { loadXlsx } from "@/lib/loadXlsx";

interface Props {
  yearlyPnl: YearlyPnl | null;
  prevYearlyPnl: YearlyPnl | null;
  customGroups: DbCustomGroup[];
  accounts: DbAccount[];
  getEffectiveGroup: (accountId: string, txGroupCode: string) => DbCustomGroup | null;
  year: number;
  onGroupClick?: (groupId: string, month?: number) => void;
  onAmountClick?: (accountId: string, month?: number) => void;
}

type ViewMode = "yearly" | "compare";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const MONTH_SHORT = ["ינו","פבר","מרץ","אפר","מאי","יוני","יולי","אוג","ספט","אוק","נוב","דצמ"];

function fmt(val: number): string {
  if (val === 0) return "";
  const abs = Math.abs(val);
  if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000)    return `${(val / 1_000).toFixed(0)}K`;
  if (abs >= 1_000)     return `${(val / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 }).format(val);
}

function fmtFull(val: number): string {
  return new Intl.NumberFormat("he-IL", {
    style: "currency", currency: "ILS", maximumFractionDigits: 0,
  }).format(val);
}

function pctOfRev(val: number, rev: number): string {
  if (rev === 0) return "—";
  return `${Math.abs((val / rev) * 100).toFixed(1)}%`;
}

function getCellColor(value: number, prevValue: number | null, isExpense: boolean): string {
  if (prevValue === null || prevValue === 0) return "text-gray-900";
  const changePct = ((value - prevValue) / Math.abs(prevValue)) * 100;
  if (isExpense) {
    if (changePct > 20) return "text-red-600 font-semibold";
    if (changePct > 10) return "text-red-500";
    if (changePct < -10) return "text-green-600";
  } else {
    if (changePct > 10) return "text-green-600";
    if (changePct < -10) return "text-red-600 font-semibold";
    if (changePct < -5) return "text-red-500";
  }
  return "text-gray-900";
}

// ── Tooltip types ─────────────────────────────────────────────

interface TooltipData {
  x: number;
  y: number;
  name: string;
  monthLabel: string;
  value: number;
  prevValue: number | null;
  pctOfRevenue: number | null;
  isExpense: boolean;
  accountId?: string;
  month?: number;
}

function CellTooltip({ data }: { data: TooltipData }) {
  const changePct = data.prevValue && data.prevValue !== 0
    ? ((data.value - data.prevValue) / Math.abs(data.prevValue)) * 100
    : null;

  return (
    <div
      className="fixed z-[9999] pointer-events-none bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-xs min-w-[200px]"
      style={{ left: data.x, top: data.y, transform: "translateX(-50%)" }}
      dir="rtl"
    >
      <p className="font-bold text-gray-900 mb-2 border-b border-gray-100 pb-1.5">{data.name}</p>
      <p className="text-gray-500 mb-2 text-[11px]">{data.monthLabel}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">סכום:</span>
          <span className="font-semibold text-gray-900 tabular-nums">{fmtFull(data.value)}</span>
        </div>
        {data.pctOfRevenue !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">% מהכנסות:</span>
            <span className="text-gray-700 tabular-nums">{data.pctOfRevenue.toFixed(1)}%</span>
          </div>
        )}
        {data.prevValue !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">שנה קודמת:</span>
            <span className="text-gray-600 tabular-nums">{fmtFull(data.prevValue)}</span>
          </div>
        )}
        {changePct !== null && (
          <div className="flex justify-between gap-4 border-t border-gray-100 pt-1 mt-1">
            <span className="text-gray-500">שינוי:</span>
            <span className={clsx(
              "font-bold tabular-nums",
              data.isExpense
                ? (changePct > 0 ? "text-red-600" : "text-green-600")
                : (changePct > 0 ? "text-green-600" : "text-red-600"),
            )}>
              {changePct > 0 ? "▲" : "▼"} {Math.abs(changePct).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
      {data.accountId && (
        <p className="text-[10px] text-primary-500 border-t border-gray-100 pt-1.5 mt-1.5 text-center">
          לחץ לפירוט תנועות
        </p>
      )}
    </div>
  );
}

// ── Section color configs ─────────────────────────────────────

const SECTION_STYLES: Record<string, { bg: string; text: string; border: string; stickyBg: string }> = {
  cost_of_goods: { bg: "bg-red-50/60",    text: "text-red-800",    border: "border-red-100",    stickyBg: "bg-red-50" },
  operating:     { bg: "bg-orange-50/60", text: "text-orange-800", border: "border-orange-100", stickyBg: "bg-orange-50" },
  admin:         { bg: "bg-purple-50/60", text: "text-purple-800", border: "border-purple-100", stickyBg: "bg-purple-50" },
  finance:       { bg: "bg-blue-50/60",   text: "text-blue-800",   border: "border-blue-100",   stickyBg: "bg-blue-50" },
  other:         { bg: "bg-gray-50/60",   text: "text-gray-700",   border: "border-gray-100",   stickyBg: "bg-gray-50" },
};

// ── Main Component ────────────────────────────────────────────

export default function PnlTableTab({
  yearlyPnl, prevYearlyPnl, customGroups, accounts, getEffectiveGroup,
  year, onGroupClick, onAmountClick,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("yearly");
  const [compareA, setCompareA] = useState(1);
  const [compareB, setCompareB] = useState(Math.min(new Date().getMonth() + 1, 12));
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["cost_of_goods", "operating", "admin", "finance"])
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showPct, setShowPct] = useState(false);
  const [showPrevYear, setShowPrevYear] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleSection = (sec: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sec)) next.delete(sec); else next.add(sec);
      return next;
    });
  };

  const toggleGroup = (gId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(gId)) next.delete(gId); else next.add(gId);
      return next;
    });
  };

  // Precompute accounts per group (memoized)
  const accountsByGroup = useMemo(() => {
    if (!yearlyPnl) return new Map<string, DbAccount[]>();
    const map = new Map<string, DbAccount[]>();
    for (const account of accounts) {
      if (account.account_type !== "expense") continue;
      const total = yearlyPnl.total.byAccount.get(account.id) ?? 0;
      if (total <= 0) continue;
      const group = getEffectiveGroup(account.id, account.latest_group_code ?? "");
      if (!group) continue;
      const list = map.get(group.id) ?? [];
      list.push(account);
      map.set(group.id, list);
    }
    // Sort each group's accounts by total desc
    map.forEach((accs, gId) => {
      accs.sort((a, b) =>
        (yearlyPnl.total.byAccount.get(b.id) ?? 0) - (yearlyPnl.total.byAccount.get(a.id) ?? 0)
      );
      map.set(gId, accs);
    });
    return map;
  }, [yearlyPnl, accounts, getEffectiveGroup]);

  const groupsBySection = useMemo(() => {
    const map = new Map<string, DbCustomGroup[]>();
    for (const g of customGroups) {
      const list = map.get(g.parent_section) ?? [];
      list.push(g);
      map.set(g.parent_section, list);
    }
    return map;
  }, [customGroups]);

  const showTooltip = useCallback((
    e: React.MouseEvent,
    data: Omit<TooltipData, "x" | "y">,
  ) => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ ...data, x: rect.left + rect.width / 2, y: rect.bottom + 8 });
  }, []);

  const hideTooltip = useCallback(() => {
    tooltipTimer.current = setTimeout(() => setTooltip(null), 80);
  }, []);

  // Hide tooltip on scroll
  useEffect(() => {
    const hide = () => setTooltip(null);
    window.addEventListener("scroll", hide, true);
    return () => window.removeEventListener("scroll", hide, true);
  }, []);

  // ── Excel Export ──────────────────────────────────────────

  const handleExport = useCallback(async () => {
    if (!yearlyPnl) return;
    const XLSX = await loadXlsx();
    const wb = XLSX.utils.book_new();
    const headers = ["סעיף", ...MONTH_SHORT, 'סה"כ', "% מהכנסות"];
    const rows: (string | number)[][] = [headers];

    const addRow = (label: string, getFn: (m: MonthlyPnl) => number) => {
      const rev = yearlyPnl.total.revenue;
      const totalVal = getFn(yearlyPnl.total);
      rows.push([
        label,
        ...yearlyPnl.months.map(m => {
          const v = getFn(m);
          return v !== 0 ? Math.round(v) : 0;
        }),
        Math.round(totalVal),
        rev > 0 ? `${((Math.abs(totalVal) / rev) * 100).toFixed(1)}%` : "—",
      ]);
    };

    addRow("הכנסות נטו", m => m.revenue);
    for (const sec of PARENT_SECTION_ORDER) {
      addRow(`(-) ${PARENT_SECTION_LABELS[sec]}`, m => m.bySection[sec]);
      const groups = (groupsBySection.get(sec) ?? []).filter(
        g => (yearlyPnl.total.byGroup.get(g.id) ?? 0) > 0
      );
      for (const g of groups) {
        addRow(`  ▸ ${g.name}`, m => m.byGroup.get(g.id) ?? 0);
      }
      if (sec === "cost_of_goods") addRow("= רווח גולמי", m => m.grossProfit);
      if (sec === "admin") addRow("= רווח תפעולי", m => m.operatingProfit);
    }
    addRow("= רווח נקי", m => m.netProfit);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 35 }, ...Array(14).fill({ wch: 11 })];
    ws["!dir"] = "RTL";
    XLSX.utils.book_append_sheet(wb, ws, `רו"ה ${year}`);
    XLSX.writeFile(wb, `רווח-והפסד-${year}.xlsx`);
  }, [yearlyPnl, year, groupsBySection]);

  if (!yearlyPnl) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
        <div className="text-5xl">📊</div>
        <p className="text-base font-medium text-gray-500">אין נתונים לשנת {year}</p>
        <p className="text-sm">העלה קובץ כרטסת בטאב &quot;קבצים&quot;</p>
      </div>
    );
  }

  const revTotal = yearlyPnl.total.revenue;

  const MONTH_LONG = MONTHS.map((m) =>
    new Date(2000, m - 1).toLocaleString("he-IL", { month: "long" }),
  );

  const getVal = (fn: (m: MonthlyPnl) => number, month: number) =>
    fn(yearlyPnl.months[month - 1]!);
  const getTot = (fn: (m: MonthlyPnl) => number) => fn(yearlyPnl.total);
  const getPrevVal = (fn: (m: MonthlyPnl) => number, month: number) =>
    prevYearlyPnl ? fn(prevYearlyPnl.months[month - 1]!) : null;

  // ── Compare view ──────────────────────────────────────────

  if (viewMode === "compare") {
    const mA = yearlyPnl.months[compareA - 1]!;
    const mB = yearlyPnl.months[compareB - 1]!;

    const rows: Array<{
      label: string; indent?: boolean; section?: boolean; subtotal?: boolean; final?: boolean;
      isExpense?: boolean; getA: (m: MonthlyPnl) => number; getB: (m: MonthlyPnl) => number;
    }> = [
      { label: "הכנסות", section: true, getA: m => m.revenue, getB: m => m.revenue },
    ];

    for (const sec of PARENT_SECTION_ORDER) {
      rows.push({ label: `(-) ${PARENT_SECTION_LABELS[sec]}`, section: true, isExpense: true, getA: m => m.bySection[sec], getB: m => m.bySection[sec] });
      const groups = (groupsBySection.get(sec) ?? []).filter(
        g => (yearlyPnl.total.byGroup.get(g.id) ?? 0) !== 0
      );
      for (const g of groups) {
        rows.push({
          label: g.name, indent: true, isExpense: true,
          getA: m => m.byGroup.get(g.id) ?? 0,
          getB: m => m.byGroup.get(g.id) ?? 0,
        });
      }
      if (sec === "cost_of_goods") rows.push({ label: "= רווח גולמי", subtotal: true, getA: m => m.grossProfit, getB: m => m.grossProfit });
      if (sec === "admin") rows.push({ label: "= רווח תפעולי", subtotal: true, getA: m => m.operatingProfit, getB: m => m.operatingProfit });
    }
    rows.push({ label: "= רווח נקי", final: true, getA: m => m.netProfit, getB: m => m.netProfit });

    return (
      <div className="space-y-4" dir="rtl">
        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex bg-gray-100 rounded-xl p-0.5">
            {(["yearly", "compare"] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={clsx("px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                  viewMode === m ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}>
                {m === "yearly" ? "📊 שנתי" : "📅 השוואת חודשים"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <select value={compareA} onChange={e => setCompareA(+e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-sm font-medium focus:ring-2 focus:ring-primary-300">
              {MONTHS.map(m => <option key={m} value={m}>{MONTH_LONG[m-1]}</option>)}
            </select>
            <span className="text-gray-400 font-bold">מול</span>
            <select value={compareB} onChange={e => setCompareB(+e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-sm font-medium focus:ring-2 focus:ring-primary-300">
              {MONTHS.map(m => <option key={m} value={m}>{MONTH_LONG[m-1]}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto" dir="rtl">
            <table className="w-full text-xs border-collapse" style={{ minWidth: "520px" }}>
              <thead>
                <tr className="bg-gradient-to-l from-slate-700 to-slate-800 text-white">
                  <th className="sticky right-0 z-20 bg-slate-800 text-right py-3 px-4 font-bold text-sm min-w-[220px] shadow-[inset_-1px_0_0_#475569]">סעיף</th>
                  <th className="text-center py-3 px-4 font-bold min-w-[130px] bg-blue-900/40">{MONTH_LONG[compareA-1]}</th>
                  <th className="text-center py-3 px-4 font-bold min-w-[130px] bg-violet-900/40">{MONTH_LONG[compareB-1]}</th>
                  <th className="text-center py-3 px-4 font-semibold min-w-[110px]">הפרש</th>
                  <th className="text-center py-3 px-4 font-semibold min-w-[80px]">% שינוי</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const vA = row.getA(mA), vB = row.getB(mB);
                  const diff = vB - vA;
                  const pct = vA !== 0 ? ((vB - vA) / Math.abs(vA)) * 100 : null;
                  const isGood = row.isExpense ? diff < 0 : diff > 0;
                  const isBad = row.isExpense ? diff > 0 : diff < 0;
                  const stickyBg = row.final ? "bg-slate-800" : row.subtotal ? "bg-gray-50" : "bg-white";
                  return (
                    <tr key={i} className={clsx("border-b border-gray-50",
                      row.final && "bg-slate-800",
                      row.subtotal && !row.final && "bg-gray-50",
                    )}>
                      <td className={clsx("py-2.5 px-4 sticky right-0 z-10 shadow-[inset_-1px_0_0_#e5e7eb]", stickyBg,
                        row.indent ? "text-gray-500 text-[11px]" :
                        row.final ? "font-bold text-white text-sm" :
                        row.subtotal ? "font-bold text-gray-800" :
                        row.section ? "font-semibold text-gray-700" : "text-gray-500",
                      )}>
                        {row.label}
                      </td>
                      {[vA, vB].map((v, j) => (
                        <td key={j} className={clsx("py-2.5 px-4 text-center tabular-nums",
                          j === 0 ? "bg-blue-50/40" : "bg-violet-50/40",
                          row.final || row.subtotal ? "font-bold" : "",
                          row.final ? (v >= 0 ? "text-emerald-400" : "text-red-400") :
                          row.isExpense ? "text-red-700" : "text-gray-800",
                        )}>
                          {v !== 0 ? fmtFull(v) : "—"}
                        </td>
                      ))}
                      <td className={clsx("py-2.5 px-4 text-center tabular-nums font-medium",
                        isGood ? "text-emerald-600" : isBad ? "text-red-600" : "text-gray-400",
                      )}>
                        {diff !== 0 ? `${diff > 0 ? "+" : ""}${fmtFull(diff)}` : "—"}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {pct !== null && Math.abs(pct) < 1000 ? (
                          <span className={clsx("inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold",
                            isGood ? "bg-emerald-100 text-emerald-700" :
                            isBad ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600",
                          )}>
                            {pct > 0 ? "▲" : "▼"}{Math.abs(pct).toFixed(0)}%
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ── Yearly view ───────────────────────────────────────────

  return (
    <div className="space-y-4" dir="rtl">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-gray-100 rounded-xl p-0.5">
            {(["yearly", "compare"] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={clsx("px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                  viewMode === m ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}>
                {m === "yearly" ? "📊 שנתי" : "📅 השוואת חודשים"}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-600 select-none">
            <input type="checkbox" checked={showPct} onChange={e => setShowPct(e.target.checked)}
              className="rounded text-primary-600 focus:ring-primary-400" />
            הצג % מהכנסות
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-600 select-none">
            <input type="checkbox" checked={showPrevYear} onChange={e => setShowPrevYear(e.target.checked)}
              className="rounded text-primary-600 focus:ring-primary-400"
              disabled={!prevYearlyPnl} />
            <span className={!prevYearlyPnl ? "text-gray-400" : ""}>
              הצג שנה קודמת {!prevYearlyPnl && "(אין נתונים)"}
            </span>
          </label>
        </div>

        <button
          onClick={() => void handleExport()}
          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          ייצוא Excel
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto" dir="rtl">
          <table className="text-[11px] border-collapse" style={{ minWidth: "900px" }}>
            <thead>
              <tr className="bg-gradient-to-l from-slate-700 to-slate-800 text-white">
                <th className="sticky right-0 z-20 bg-slate-800 text-right py-3 px-4 font-bold text-sm min-w-[220px] shadow-[inset_-1px_0_0_#475569]">
                  סעיף
                </th>
                {MONTHS.map(m => (
                  <th key={m} className="text-center py-3 px-1 font-semibold min-w-[58px] border-b-2 border-slate-600">
                    {MONTH_SHORT[m - 1]}
                  </th>
                ))}
                <th className="text-center py-3 px-3 font-bold min-w-[90px] bg-slate-900 border-b-2 border-slate-600">
                  סה&quot;כ
                </th>
                <th className="text-center py-3 px-2 font-semibold min-w-[52px] text-slate-300 border-b-2 border-slate-600">
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {/* ── Revenue ── */}
              <tr className="bg-gradient-to-l from-emerald-50 to-teal-50 border-b-2 border-emerald-200">
                <td className="py-3 px-4 font-bold text-emerald-800 text-sm sticky right-0 bg-gradient-to-l from-emerald-50 to-teal-50 z-10 shadow-[inset_-1px_0_0_#a7f3d0]">
                  הכנסות
                </td>
                {MONTHS.map(m => {
                  const v = getVal(md => md.revenue, m);
                  const pv = getPrevVal(md => md.revenue, m);
                  return (
                    <td key={m}
                      className={clsx("py-3 px-1.5 text-center tabular-nums font-semibold cursor-pointer hover:bg-emerald-100 transition-colors relative",
                        getCellColor(v, showPrevYear && pv !== null ? pv : null, false),
                        v === 0 && "text-gray-200",
                      )}
                      onMouseEnter={e => showTooltip(e, {
                        name: "הכנסות",
                        monthLabel: `${MONTH_LONG[m-1]} ${year}`,
                        value: v,
                        prevValue: pv,
                        pctOfRevenue: null,
                        isExpense: false,
                      })}
                      onMouseLeave={hideTooltip}
                      onClick={() => onAmountClick?.("revenue", m)}
                    >
                      {v !== 0 ? fmt(v) : <span className="text-gray-200">—</span>}
                      {showPrevYear && pv !== null && pv !== 0 && (
                        <div className="text-[9px] text-gray-400 leading-none mt-0.5">{fmt(pv)}</div>
                      )}
                    </td>
                  );
                })}
                <td className="py-3 px-3 text-center tabular-nums font-bold text-emerald-800 bg-emerald-100">
                  {getTot(md => md.revenue) !== 0 ? fmtFull(getTot(md => md.revenue)) : "—"}
                </td>
                <td className="py-3 px-2 text-center text-[10px] text-emerald-600 font-semibold bg-emerald-50">
                  100%
                </td>
              </tr>

              {/* ── Expense Sections ── */}
              {PARENT_SECTION_ORDER.map(section => {
                const groups = (groupsBySection.get(section) ?? []).filter(
                  g => (yearlyPnl.total.byGroup.get(g.id) ?? 0) !== 0
                );
                const sectionTotal = yearlyPnl.total.bySection[section];
                if (sectionTotal === 0 && groups.length === 0) return null;
                const isExpanded = expandedSections.has(section);
                const ss = SECTION_STYLES[section] ?? SECTION_STYLES["other"]!;

                return (
                  <tbody key={section}>
                    {/* Section header row */}
                    <tr className={clsx("border-b cursor-pointer hover:brightness-95 transition-all", ss.bg, ss.border)}
                      onClick={() => toggleSection(section)}>
                      <td className={clsx("py-2.5 px-4 font-semibold text-[12px] sticky right-0 z-10 shadow-[inset_-1px_0_0_#e5e7eb]", ss.text, ss.stickyBg)}>
                        <div className="flex items-center gap-1.5">
                          {isExpanded
                            ? <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                            : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                          <span>(-) {PARENT_SECTION_LABELS[section]}</span>
                        </div>
                      </td>
                      {MONTHS.map(m => {
                        const v = getVal(md => md.bySection[section], m);
                        const pv = getPrevVal(md => md.bySection[section], m);
                        return (
                          <td key={m} className={clsx("py-2.5 px-1.5 text-center tabular-nums font-medium", ss.text)}>
                            {v !== 0 ? fmt(v) : <span className="text-gray-200 opacity-50">—</span>}
                            {showPrevYear && pv !== null && pv !== 0 && (
                              <div className="text-[9px] opacity-60 leading-none mt-0.5">{fmt(pv)}</div>
                            )}
                          </td>
                        );
                      })}
                      <td className={clsx("py-2.5 px-3 text-center tabular-nums font-bold", ss.text, ss.stickyBg)}>
                        {sectionTotal !== 0 ? fmtFull(sectionTotal) : "—"}
                      </td>
                      <td className={clsx("py-2.5 px-2 text-center text-[10px] font-semibold", ss.text)}>
                        {pctOfRev(Math.abs(sectionTotal), revTotal)}
                      </td>
                    </tr>

                    {/* Group rows */}
                    {isExpanded && groups.map(g => {
                      const groupAccounts = accountsByGroup.get(g.id) ?? [];
                      const isGroupExpanded = expandedGroups.has(g.id);
                      const groupTotal = yearlyPnl.total.byGroup.get(g.id) ?? 0;

                      return (
                        <tbody key={g.id}>
                          {/* Group row */}
                          <tr className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                            <td
                              className="py-2 px-4 text-gray-600 sticky right-0 bg-white z-10 shadow-[inset_-1px_0_0_#f3f4f6]"
                              style={{ paddingRight: "28px" }}
                            >
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleGroup(g.id)}
                                  className="flex items-center gap-1.5 hover:text-gray-900 transition-colors"
                                >
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: g.color }} />
                                  <span className="text-[11px] font-medium">{g.name}</span>
                                  {groupAccounts.length > 0 && (
                                    isGroupExpanded
                                      ? <ChevronDown className="w-3 h-3 text-gray-400" />
                                      : <ChevronRight className="w-3 h-3 text-gray-400" />
                                  )}
                                  {groupAccounts.length > 0 && (
                                    <span className="text-[9px] text-gray-400 bg-gray-100 px-1 rounded-full">
                                      {groupAccounts.length}
                                    </span>
                                  )}
                                </button>
                              </div>
                            </td>
                            {MONTHS.map(m => {
                              const v = getVal(md => md.byGroup.get(g.id) ?? 0, m);
                              const pv = getPrevVal(md => md.byGroup.get(g.id) ?? 0, m);
                              return (
                                <td key={m}
                                  className={clsx("py-2 px-1.5 text-center tabular-nums cursor-pointer hover:bg-blue-50 transition-colors",
                                    getCellColor(v, showPrevYear && pv !== null ? pv : null, true),
                                  )}
                                  onMouseEnter={e => showTooltip(e, {
                                    name: g.name,
                                    monthLabel: `${MONTH_LONG[m-1]} ${year}`,
                                    value: v,
                                    prevValue: pv,
                                    pctOfRevenue: revTotal > 0 ? (v / revTotal) * 100 : null,
                                    isExpense: true,
                                  })}
                                  onMouseLeave={hideTooltip}
                                  onClick={e => { e.stopPropagation(); onGroupClick?.(g.id, m); }}
                                >
                                  {v !== 0 ? fmt(v) : <span className="text-gray-100">—</span>}
                                  {showPrevYear && pv !== null && pv !== 0 && (
                                    <div className="text-[9px] text-gray-400 leading-none mt-0.5">{fmt(pv)}</div>
                                  )}
                                </td>
                              );
                            })}
                            <td className="py-2 px-3 text-center tabular-nums font-semibold text-red-700 bg-gray-50">
                              {groupTotal !== 0 ? fmtFull(groupTotal) : "—"}
                            </td>
                            <td className="py-2 px-2 text-center text-[10px] text-gray-400 bg-gray-50">
                              {pctOfRev(Math.abs(groupTotal), revTotal)}
                            </td>
                          </tr>

                          {/* Account rows (level 3) */}
                          {isGroupExpanded && groupAccounts.map(acct => {
                            const aTotal = yearlyPnl.total.byAccount.get(acct.id) ?? 0;
                            return (
                              <tr key={acct.id}
                                className="border-b border-gray-50/50 hover:bg-gray-50/60 transition-colors"
                              >
                                <td
                                  className="py-1.5 text-gray-500 sticky right-0 bg-white z-10 shadow-[inset_-1px_0_0_#f3f4f6] text-[11px]"
                                  style={{ paddingRight: "48px", paddingLeft: "8px" }}
                                >
                                  <span className="font-mono text-[10px] text-gray-400 ml-1">{acct.code}</span>
                                  <span>{acct.name}</span>
                                </td>
                                {MONTHS.map(m => {
                                  const v = getVal(md => md.byAccount.get(acct.id) ?? 0, m);
                                  const pv = getPrevVal(md => md.byAccount.get(acct.id) ?? 0, m);
                                  return (
                                    <td key={m}
                                      className={clsx("py-1.5 px-1.5 text-center tabular-nums text-[10px] cursor-pointer hover:bg-blue-50 transition-colors",
                                        v > 0 ? getCellColor(v, showPrevYear && pv !== null ? pv : null, true) : "text-gray-300",
                                      )}
                                      onMouseEnter={e => showTooltip(e, {
                                        name: `${acct.code} ${acct.name}`,
                                        monthLabel: `${MONTH_LONG[m-1]} ${year}`,
                                        value: v,
                                        prevValue: pv,
                                        pctOfRevenue: revTotal > 0 ? (v / revTotal) * 100 : null,
                                        isExpense: true,
                                        accountId: acct.id,
                                        month: m,
                                      })}
                                      onMouseLeave={hideTooltip}
                                      onClick={() => { if (v > 0) onAmountClick?.(acct.id, m); }}
                                    >
                                      {v > 0 ? fmt(v) : <span className="text-gray-100">—</span>}
                                    </td>
                                  );
                                })}
                                <td className="py-1.5 px-3 text-center tabular-nums text-[10px] text-red-600 font-medium bg-gray-50">
                                  {aTotal > 0 ? fmtFull(aTotal) : "—"}
                                </td>
                                <td className="py-1.5 px-2 text-center text-[9px] text-gray-400 bg-gray-50">
                                  {pctOfRev(Math.abs(aTotal), revTotal)}
                                </td>
                              </tr>
                            );
                          })}

                          {/* % row (showPct) */}
                          {showPct && (
                            <tr className="border-b border-dashed border-gray-100 bg-gray-50/40">
                              <td className="py-1 px-4 text-[10px] text-gray-400 italic sticky right-0 bg-gray-50/40 z-10 shadow-[inset_-1px_0_0_#f3f4f6]"
                                style={{ paddingRight: "32px" }}>
                                % מהכנסות
                              </td>
                              {MONTHS.map(m => {
                                const v = getVal(md => md.byGroup.get(g.id) ?? 0, m);
                                const rev = getVal(md => md.revenue, m);
                                return (
                                  <td key={m} className="py-1 px-1.5 text-center text-[10px] text-gray-400 tabular-nums">
                                    {rev > 0 && v > 0 ? `${((v / rev) * 100).toFixed(1)}%` : "—"}
                                  </td>
                                );
                              })}
                              <td className="py-1 px-3 text-center text-[10px] text-gray-400 tabular-nums bg-gray-50">
                                {pctOfRev(Math.abs(groupTotal), revTotal)}
                              </td>
                              <td className="bg-gray-50" />
                            </tr>
                          )}
                        </tbody>
                      );
                    })}

                    {/* Gross profit subtotal */}
                    {section === "cost_of_goods" && (
                      <tr className="border-b-2 border-emerald-300 bg-gradient-to-l from-emerald-50 to-teal-50">
                        <td className="py-3 px-4 font-bold text-emerald-800 text-sm sticky right-0 bg-gradient-to-l from-emerald-50 to-teal-50 z-10 shadow-[inset_-1px_0_0_#a7f3d0]">
                          = רווח גולמי
                        </td>
                        {MONTHS.map(m => {
                          const v = getVal(md => md.grossProfit, m);
                          const pv = getPrevVal(md => md.grossProfit, m);
                          return (
                            <td key={m} className={clsx("py-3 px-1.5 text-center tabular-nums font-bold",
                              v >= 0 ? "text-emerald-700" : "text-red-600")}>
                              {v !== 0 ? fmt(v) : <span className="text-gray-200">—</span>}
                              {showPrevYear && pv !== null && pv !== 0 && (
                                <div className="text-[9px] opacity-60 leading-none mt-0.5">{fmt(pv)}</div>
                              )}
                            </td>
                          );
                        })}
                        <td className={clsx("py-3 px-3 text-center tabular-nums font-bold text-sm bg-emerald-100",
                          getTot(md => md.grossProfit) >= 0 ? "text-emerald-800" : "text-red-700")}>
                          {fmtFull(getTot(md => md.grossProfit))}
                        </td>
                        <td className="py-3 px-2 text-center text-[10px] font-bold text-emerald-700 bg-emerald-50">
                          {pctOfRev(getTot(md => md.grossProfit), revTotal)}
                        </td>
                      </tr>
                    )}

                    {/* Operating profit subtotal */}
                    {section === "admin" && (
                      <tr className="border-b-2 border-blue-300 bg-gradient-to-l from-blue-50 to-indigo-50">
                        <td className="py-3 px-4 font-bold text-blue-800 text-sm sticky right-0 bg-gradient-to-l from-blue-50 to-indigo-50 z-10 shadow-[inset_-1px_0_0_#bfdbfe]">
                          = רווח תפעולי
                        </td>
                        {MONTHS.map(m => {
                          const v = getVal(md => md.operatingProfit, m);
                          const pv = getPrevVal(md => md.operatingProfit, m);
                          return (
                            <td key={m} className={clsx("py-3 px-1.5 text-center tabular-nums font-bold",
                              v >= 0 ? "text-blue-700" : "text-red-600")}>
                              {v !== 0 ? fmt(v) : <span className="text-gray-200">—</span>}
                              {showPrevYear && pv !== null && pv !== 0 && (
                                <div className="text-[9px] opacity-60 leading-none mt-0.5">{fmt(pv)}</div>
                              )}
                            </td>
                          );
                        })}
                        <td className={clsx("py-3 px-3 text-center tabular-nums font-bold text-sm bg-blue-100",
                          getTot(md => md.operatingProfit) >= 0 ? "text-blue-800" : "text-red-700")}>
                          {fmtFull(getTot(md => md.operatingProfit))}
                        </td>
                        <td className="py-3 px-2 text-center text-[10px] font-bold text-blue-700 bg-blue-50">
                          {pctOfRev(getTot(md => md.operatingProfit), revTotal)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                );
              })}

              {/* ── Net Profit ── */}
              <tr className="bg-gradient-to-l from-slate-800 to-slate-900 border-t-2 border-slate-600">
                <td className="py-4 px-4 font-bold text-white text-sm sticky right-0 bg-gradient-to-l from-slate-800 to-slate-900 z-10 shadow-[inset_-1px_0_0_#475569]">
                  = רווח נקי
                </td>
                {MONTHS.map(m => {
                  const v = getVal(md => md.netProfit, m);
                  const pv = getPrevVal(md => md.netProfit, m);
                  return (
                    <td key={m} className={clsx("py-4 px-1.5 text-center tabular-nums font-bold",
                      v >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {v !== 0 ? fmt(v) : <span className="text-slate-600">—</span>}
                      {showPrevYear && pv !== null && pv !== 0 && (
                        <div className="text-[9px] opacity-60 leading-none mt-0.5">{fmt(pv)}</div>
                      )}
                    </td>
                  );
                })}
                <td className={clsx("py-4 px-3 text-center tabular-nums font-bold text-sm",
                  getTot(md => md.netProfit) >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {fmtFull(getTot(md => md.netProfit))}
                </td>
                <td className={clsx("py-4 px-2 text-center text-[10px] font-bold",
                  getTot(md => md.netProfit) >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {pctOfRev(getTot(md => md.netProfit), revTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-gray-400 px-1 flex-wrap">
        <span className="flex items-center gap-1">
          <ChevronRight className="w-3 h-3" />
          לחץ על שם קבוצה להרחבת חשבונות בודדים
        </span>
        <span className="mx-1">·</span>
        <span>לחץ על ערך חודשי לצפייה בתנועות</span>
        <span className="mx-1">·</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-red-500 rounded-full" /> עלייה בהוצאה
          <span className="w-2 h-2 bg-green-500 rounded-full mr-1" /> ירידה בהוצאה
        </span>
      </div>

      {/* Fixed tooltip */}
      {tooltip && <CellTooltip data={tooltip} />}
    </div>
  );
}
