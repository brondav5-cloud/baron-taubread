"use client";

import { useMemo } from "react";
import { BarChart3, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { monthLabel, fmtSignedCurrency, pct } from "./format";
import { computePnlPeriodKpis, pnlDisplayMonths } from "./layout-utils";
import type { PnlStatementView } from "./types";

interface Props {
  view: PnlStatementView;
  compareMonths: string[];
}

function Card({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: "green" | "red" | "blue" | "orange";
}) {
  const styles = {
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
    orange: "bg-orange-50 text-orange-700",
  }[tone];

  return (
    <div className={`rounded-2xl p-4 ${styles}`}>
      <p className="text-xs font-medium mb-1">{title}</p>
      <p className="text-2xl font-bold">{fmtSignedCurrency(value)}</p>
    </div>
  );
}

export default function PnlSummaryCards({ view, compareMonths }: Props) {
  const displayMonths = pnlDisplayMonths(compareMonths, view.months);
  const p = useMemo(
    () => computePnlPeriodKpis(view, displayMonths),
    [view, displayMonths],
  );
  const expenseAll =
    p.costOfGoodsTotal + p.operatingExpensesTotal + p.financeAndOtherTotal;
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 px-0.5">
        סיכומי כרטיסים לפי:{" "}
        <span className="font-medium text-gray-700">
          {displayMonths.map(monthLabel).join(" · ")}
        </span>
      </p>
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <Card title="סה״כ הכנסות" value={p.revenueTotal} tone="green" />
      <Card title="עלות המכר" value={p.costOfGoodsTotal} tone="red" />
      <Card title="רווח גולמי" value={p.grossProfit} tone={p.grossProfit >= 0 ? "blue" : "orange"} />
      <Card title="הוצאות תפעול+הנהלה" value={p.operatingExpensesTotal} tone="red" />
      <Card title="רווח תפעולי" value={p.operatingProfit} tone={p.operatingProfit >= 0 ? "blue" : "orange"} />
      <Card title="רווח נקי" value={p.netProfit} tone={p.netProfit >= 0 ? "blue" : "orange"} />

      <div className="md:col-span-3 xl:col-span-6 rounded-2xl border border-gray-200 bg-white px-4 py-3 flex items-center gap-6 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-green-500" /> רווח גולמי: {pct(p.grossProfit, p.revenueTotal)}</span>
        <span className="inline-flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5 text-blue-500" /> רווח תפעולי: {pct(p.operatingProfit, p.revenueTotal)}</span>
        <span className="inline-flex items-center gap-1.5"><Minus className="w-3.5 h-3.5 text-indigo-500" /> רווח נקי: {pct(p.netProfit, p.revenueTotal)}</span>
        <span className="inline-flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5 text-red-500" /> יחס הוצאות: {pct(expenseAll, p.revenueTotal)}</span>
      </div>
    </div>
    </div>
  );
}
