// ============================================
// STORE DELIVERY SUMMARY COMPONENT
// סיכום אספקות לחנות
// ============================================

"use client";

import { Truck, Calendar, DollarSign } from "lucide-react";
import type { StoreDeliverySummary as DeliverySummaryType } from "@/types/deliveries";

interface StoreDeliverySummaryProps {
  summary: DeliverySummaryType | undefined;
  isLoading?: boolean;
}

export function StoreDeliverySummary({
  summary,
  isLoading = false,
}: StoreDeliverySummaryProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 text-gray-500">
          <Truck className="w-5 h-5" />
          <span>אין נתוני אספקות לחנות זו</span>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          העלה קובץ תעודות משלוח בדף ההעלאה כדי לראות נתונים
        </p>
      </div>
    );
  }

  const formatNumber = (num: number) => num.toLocaleString("he-IL");
  const formatCurrency = (num: number) =>
    `₪${num.toLocaleString("he-IL", { maximumFractionDigits: 0 })}`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Truck className="w-5 h-5 text-green-600" />
        <h3 className="font-bold text-gray-900">נתוני אספקות</h3>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Total Deliveries */}
        <StatCard
          icon={<Calendar className="w-4 h-4 text-blue-600" />}
          label="סה״כ אספקות"
          value={formatNumber(summary.totalDeliveries)}
          subValue={`${summary.avgDeliveriesPerMonth.toFixed(1)} בממוצע לחודש`}
        />

        {/* Total Value */}
        <StatCard
          icon={<DollarSign className="w-4 h-4 text-green-600" />}
          label="סה״כ ערך"
          value={formatCurrency(summary.totalValue)}
          subValue={`${formatCurrency(summary.avgValuePerMonth)} ממוצע לחודש`}
        />

        {/* Last Month */}
        <StatCard
          icon={<Truck className="w-4 h-4 text-purple-600" />}
          label="חודש אחרון"
          value={formatNumber(summary.lastMonthDeliveries)}
          subValue={formatCurrency(summary.lastMonthValue)}
        />
      </div>

      {/* Avg per delivery */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">ערך ממוצע לאספקה:</span>
          <span className="font-bold text-gray-900">
            {formatCurrency(summary.avgValuePerDelivery)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// STAT CARD COMPONENT
// ============================================

function StatCard({
  icon,
  label,
  value,
  subValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      {subValue && <p className="text-xs text-gray-500 mt-1">{subValue}</p>}
    </div>
  );
}
