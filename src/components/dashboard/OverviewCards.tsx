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
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Active Stores */}
      <Link
        href="/dashboard/stores"
        className="bg-green-500 text-white rounded-2xl p-4 hover:bg-green-600 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <p className="text-3xl font-bold">{totalStores}</p>
            <p className="text-sm opacity-90">חנויות פעילות</p>
            <p className="text-xs opacity-75">מוצגות בנתונים</p>
          </div>
        </div>
      </Link>

      {/* Total Quantity */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-xl">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {formatNumber(totals.qtyCurrent)}
            </p>
            <p className="text-sm text-gray-600">
              {hasData
                ? `סה"כ כמות (${totals.previousYearPeriodLabel ?? totals.previousYear} - ${totals.currentYearPeriodLabel ?? totals.currentYear})`
                : "סה\"כ כמות"}
            </p>
            <p
              className={clsx(
                "text-xs font-medium",
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
        className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-100 hover:shadow-md transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-xl">
            <Package className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
            <p className="text-sm text-gray-600">מוצרים פעילים</p>
            <p className="text-xs text-gray-400">מתוך קטלוג</p>
          </div>
        </div>
      </Link>

      {/* Alerts */}
      <Link
        href="/dashboard/treatment"
        className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl p-4 border border-red-100 hover:shadow-md transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{alertCount}</p>
            <p className="text-sm text-gray-600">התראות</p>
            <p className="text-xs text-gray-400">דורשות טיפול</p>
          </div>
        </div>
      </Link>

      {/* Reactive Status */}
      <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-4 border border-yellow-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-100 rounded-xl">
            <BarChart3 className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">0</p>
            <p className="text-sm text-gray-600">סטטוס מגיבי</p>
            <p className="text-xs text-gray-400">חנויות</p>
          </div>
        </div>
      </div>
    </div>
  );
}
