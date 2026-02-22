"use client";

import { TrendingUp, Filter, Settings } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { PageHeader } from "@/components/ui";
import type { ProfitType } from "@/hooks/useProfitabilityPage";
import { PROFIT_TYPE_LABELS } from "@/hooks/useProfitabilityPage";

interface Props {
  profitType: ProfitType;
  onProfitTypeChange: (type: ProfitType) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  activeFiltersCount: number;
  hasCosts: boolean;
  periodSubtitle?: string;
}

const PROFIT_TYPES: ProfitType[] = ["gross", "operating", "net"];

export function ProfitabilityHeader({
  profitType,
  onProfitTypeChange,
  showFilters,
  onToggleFilters,
  activeFiltersCount,
  hasCosts,
  periodSubtitle,
}: Props) {
  const subtitle = periodSubtitle
    ? `רווחיות לפי חנויות, ערים וקטגוריות • ${periodSubtitle}`
    : "רווחיות לפי חנויות, ערים וקטגוריות";
  return (
    <div className="space-y-4">
      <PageHeader
        title="ניתוח רווחיות"
        subtitle={subtitle}
        icon={<TrendingUp className="w-6 h-6 text-green-500" />}
      />

      {/* Status + Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Status */}
        {hasCosts ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl text-sm">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            חישוב מבוסס עלויות אמיתיות
          </div>
        ) : (
          <Link
            href="/dashboard/settings/costs"
            className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-sm hover:bg-amber-100 transition-colors"
          >
            <Settings className="w-4 h-4" />
            נתונים משוערים - הגדר עלויות
          </Link>
        )}

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Profit Type */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            {PROFIT_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => onProfitTypeChange(type)}
                className={clsx(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  profitType === type
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900",
                )}
              >
                {PROFIT_TYPE_LABELS[type]}
              </button>
            ))}
          </div>

          {/* Filter Toggle */}
          <button
            onClick={onToggleFilters}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
              showFilters
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            )}
          >
            <Filter className="w-4 h-4" />
            סינון
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
