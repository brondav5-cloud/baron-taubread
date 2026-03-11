"use client";

import Link from "next/link";
import {
  Store,
  Package,
  AlertTriangle,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { clsx } from "clsx";
import { formatNumber } from "@/lib/calculations";

interface TotalsData {
  qtyCurrent: number;
  qtyPrevious: number;
  salesCurrent: number;
  salesPrevious: number;
  qtyChange: number;
  salesChange: number;
  currentYear: number;
  previousYear: number;
  previousYearPeriodLabel?: string;
  currentYearPeriodLabel?: string;
}

interface OverviewCardsProps {
  totalStores: number;
  totalProducts: number;
  alertCount: number;
  totals: TotalsData;
  hasData?: boolean;
}

export function OverviewCards({
  totalStores,
  totalProducts,
  alertCount,
  totals,
  hasData = true,
}: OverviewCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {/* Active Stores */}
      <Link
        href="/dashboard/stores"
        className="bg-green-500 text-white rounded-2xl p-3 sm:p-4 hover:bg-green-600 transition-colors"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-white/20 rounded-xl shrink-0">
            <Store className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold leading-tight">{totalStores}</p>
            <p className="text-[11px] sm:text-sm opacity-90 leading-tight">חנויות פעילות</p>
            <p className="text-[10px] sm:text-xs opacity-75 hidden sm:block">
              מוצגות בנתונים
            </p>
          </div>
        </div>
      </Link>

      {/* Total Quantity */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-3 sm:p-4 border border-green-100">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-green-100 rounded-xl shrink-0">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
          </div>
          <div className="min-w-0">
            <p className="text-base sm:text-xl lg:text-2xl font-bold text-gray-900 leading-tight">
              {formatNumber(totals.qtyCurrent)}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-600 truncate leading-tight">
              {hasData
                ? `סה"כ כמות`
                : "סה\"כ כמות"}
            </p>
            <p
              className={clsx(
                "text-[10px] sm:text-xs font-medium",
                totals.qtyChange >= 0 ? "text-green-600" : "text-red-600",
              )}
            >
              {totals.qtyChange >= 0 ? "+" : ""}
              {totals.qtyChange.toFixed(1)}% {totals.qtyChange >= 0 ? "↑" : "↓"}
            </p>
          </div>
        </div>
      </div>

      {/* Products */}
      <Link
        href="/dashboard/products"
        className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-3 sm:p-4 border border-orange-100 hover:shadow-md transition-all"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-orange-100 rounded-xl shrink-0">
            <Package className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
          </div>
          <div className="min-w-0">
            <p className="text-base sm:text-xl lg:text-2xl font-bold text-gray-900 leading-tight">
              {totalProducts}
            </p>
            <p className="text-[11px] sm:text-sm text-gray-600 leading-tight">מוצרים פעילים</p>
            <p className="text-[10px] sm:text-xs text-gray-400 hidden sm:block">
              מתוך קטלוג
            </p>
          </div>
        </div>
      </Link>

      {/* Alerts */}
      <Link
        href="/dashboard/treatment"
        className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl p-3 sm:p-4 border border-red-100 hover:shadow-md transition-all"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-red-100 rounded-xl shrink-0">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
          </div>
          <div className="min-w-0">
            <p className="text-base sm:text-xl lg:text-2xl font-bold text-red-600 leading-tight">
              {alertCount}
            </p>
            <p className="text-[11px] sm:text-sm text-gray-600 leading-tight">התראות</p>
            <p className="text-[10px] sm:text-xs text-gray-400 hidden sm:block">
              דורשות טיפול
            </p>
          </div>
        </div>
      </Link>

      {/* Reactive Status */}
      <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-3 sm:p-4 border border-yellow-100">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-yellow-100 rounded-xl shrink-0">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
          </div>
          <div className="min-w-0">
            <p className="text-base sm:text-xl lg:text-2xl font-bold text-gray-900 leading-tight">0</p>
            <p className="text-[11px] sm:text-sm text-gray-600 leading-tight">סטטוס מגיבי</p>
            <p className="text-[10px] sm:text-xs text-gray-400 hidden sm:block">
              חנויות
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
