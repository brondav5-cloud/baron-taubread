"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { clsx } from "clsx";
import { formatNumber } from "@/lib/calculations";
import type { YearlyTotals } from "@/hooks/useStoreDetailSupabase";

// ============================================
// TYPES
// ============================================

interface StoreSummaryCardsProps {
  selectedYear: number;
  currentYearTotals: YearlyTotals | null;
  previousYearTotals: YearlyTotals | null;
}

interface SummaryCardProps {
  label: string;
  value: number;
  previousValue?: number;
  prefix?: string;
  gradient: string;
  borderColor: string;
  textColor: string;
}

// ============================================
// SINGLE CARD
// ============================================

function SummaryCard({
  label,
  value,
  previousValue,
  prefix,
  gradient,
  borderColor,
  textColor,
}: SummaryCardProps) {
  const change =
    previousValue && previousValue > 0
      ? ((value - previousValue) / previousValue) * 100
      : undefined;

  return (
    <div className={clsx("rounded-xl p-4 border", gradient, borderColor)}>
      <p className="text-sm text-gray-600">{label}</p>
      <p className={clsx("text-2xl font-bold", textColor)}>
        {prefix}
        {formatNumber(Math.round(value))}
      </p>
      {change !== undefined && (
        <div
          className={clsx(
            "flex items-center gap-1 mt-1 text-sm",
            change >= 0 ? "text-green-600" : "text-red-600",
          )}
        >
          {change >= 0 ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5" />
          )}
          <span>
            {change >= 0 ? "+" : ""}
            {change.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function StoreSummaryCards({
  selectedYear,
  currentYearTotals,
  previousYearTotals,
}: StoreSummaryCardsProps) {
  if (!currentYearTotals) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard
        label={`כמות ${selectedYear}`}
        value={currentYearTotals.qty}
        previousValue={previousYearTotals?.qty}
        gradient="bg-gradient-to-br from-blue-50 to-indigo-50"
        borderColor="border-blue-100"
        textColor="text-blue-600"
      />
      <SummaryCard
        label={`מכירות ${selectedYear}`}
        value={currentYearTotals.sales}
        previousValue={previousYearTotals?.sales}
        prefix="₪"
        gradient="bg-gradient-to-br from-green-50 to-emerald-50"
        borderColor="border-green-100"
        textColor="text-green-600"
      />
      <SummaryCard
        label={`אספקות ${selectedYear}`}
        value={currentYearTotals.deliveries ?? 0}
        previousValue={previousYearTotals?.deliveries}
        gradient="bg-gradient-to-br from-purple-50 to-violet-50"
        borderColor="border-purple-100"
        textColor="text-purple-600"
      />
      <SummaryCard
        label={`החזרות ${selectedYear}`}
        value={currentYearTotals.returns}
        previousValue={previousYearTotals?.returns}
        gradient="bg-gradient-to-br from-orange-50 to-amber-50"
        borderColor="border-orange-100"
        textColor="text-orange-600"
      />
    </div>
  );
}
