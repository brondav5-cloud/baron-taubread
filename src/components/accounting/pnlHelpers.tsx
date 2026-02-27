"use client";

import React from "react";
import { clsx } from "clsx";

export type ViewMode = "yearly" | "compare";

export const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
export const MONTH_SHORT = ["ינו","פבר","מרץ","אפר","מאי","יוני","יולי","אוג","ספט","אוק","נוב","דצמ"];
export const MONTH_LONG = MONTHS.map((m) =>
  new Date(2000, m - 1).toLocaleString("he-IL", { month: "long" }),
);

export function fmt(val: number): string {
  if (val === 0) return "";
  const abs = Math.abs(val);
  if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000)    return `${(val / 1_000).toFixed(0)}K`;
  if (abs >= 1_000)     return `${(val / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 }).format(val);
}

export function fmtFull(val: number): string {
  return new Intl.NumberFormat("he-IL", {
    style: "currency", currency: "ILS", maximumFractionDigits: 0,
  }).format(val);
}

export function pctOfRev(val: number, rev: number): string {
  if (rev === 0) return "—";
  return `${Math.abs((val / rev) * 100).toFixed(1)}%`;
}

export function getCellColor(value: number, prevValue: number | null, isExpense: boolean): string {
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

export interface TooltipData {
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

export function CellTooltip({ data }: { data: TooltipData }) {
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

export const SECTION_STYLES: Record<string, { bg: string; text: string; border: string; stickyBg: string }> = {
  cost_of_goods: { bg: "bg-red-50/60",    text: "text-red-800",    border: "border-red-100",    stickyBg: "bg-red-50" },
  operating:     { bg: "bg-orange-50/60", text: "text-orange-800", border: "border-orange-100", stickyBg: "bg-orange-50" },
  admin:         { bg: "bg-purple-50/60", text: "text-purple-800", border: "border-purple-100", stickyBg: "bg-purple-50" },
  finance:       { bg: "bg-blue-50/60",   text: "text-blue-800",   border: "border-blue-100",   stickyBg: "bg-blue-50" },
  other:         { bg: "bg-gray-50/60",   text: "text-gray-700",   border: "border-gray-100",   stickyBg: "bg-gray-50" },
};

export function ViewModeToggle({ viewMode, onChange }: { viewMode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="flex bg-gray-100 rounded-xl p-0.5">
      {(["yearly", "compare"] as const).map(m => (
        <button key={m} onClick={() => onChange(m)}
          className={clsx("px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors",
            viewMode === m ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}>
          {m === "yearly" ? "📊 שנתי" : "📅 השוואת חודשים"}
        </button>
      ))}
    </div>
  );
}
