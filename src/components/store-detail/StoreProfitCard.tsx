"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  AlertCircle,
  Calculator,
  Truck,
  Settings,
} from "lucide-react";

import type { StoreWithStatus } from "@/types/data";
import { formatCurrency } from "@/lib/calculations";
import { useProfitabilityData } from "@/hooks/useProfitabilityData";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";

// ============================================
// TYPES
// ============================================

interface StoreProfitCardProps {
  store: StoreWithStatus;
}

interface ProfitData {
  hasData: boolean;
  driverGroupName: string | null;
  revenue: number;
  estimatedCost: number;
  grossProfit: number;
  operatingProfit: number;
  netProfit: number;
  profitMargin: number;
}

// ============================================
// PROFIT CALCULATION
// ============================================

function calculateStoreProfit(
  store: StoreWithStatus,
  hasCosts: boolean,
  getDriverGroup: (driverName: string) => { id: string; name: string } | null,
): ProfitData {
  const driverGroup = getDriverGroup(store.driver);

  if (!hasCosts) {
    return {
      hasData: false,
      driverGroupName: driverGroup?.name ?? null,
      revenue: store.sales_2025 || 0,
      estimatedCost: 0,
      grossProfit: 0,
      operatingProfit: 0,
      netProfit: 0,
      profitMargin: 0,
    };
  }

  const revenue = store.sales_2025 || 0;

  // חישוב משוער - בהמשך יהיה מדויק יותר עם נתוני מוצרים
  // כרגע משתמשים בהערכה של 65% עלות מההכנסות
  const avgCostRatio = 0.65;
  const estimatedCost = revenue * avgCostRatio;

  const grossProfit = revenue * 0.35; // 35% רווח גולמי
  const operatingProfit = revenue * 0.25; // 25% רווח תפעולי
  const netProfit = revenue * 0.18; // 18% רווח נקי
  const profitMargin = 18;

  return {
    hasData: true,
    driverGroupName: driverGroup?.name ?? null,
    revenue,
    estimatedCost,
    grossProfit,
    operatingProfit,
    netProfit,
    profitMargin,
  };
}

// ============================================
// COMPONENT
// ============================================

export function StoreProfitCard({ store }: StoreProfitCardProps) {
  const { hasCosts, ctx } = useProfitabilityData();
  const profit = useMemo(
    () => calculateStoreProfit(store, hasCosts, ctx.getDriverGroup),
    [store, hasCosts, ctx],
  );

  // אם אין עלויות מוגדרות - הצג הודעה
  if (!profit.hasData) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 rounded-xl">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800 mb-1">
                רווחיות לא זמינה
              </h3>
              <p className="text-sm text-amber-700 mb-3">
                כדי לראות נתוני רווחיות, יש להגדיר עלויות מוצרים בהגדרות
              </p>
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/settings/costs"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  הגדר עלויות
                </Link>
                {profit.driverGroupName && (
                  <span className="flex items-center gap-1.5 text-sm text-amber-700">
                    <Truck className="w-4 h-4" />
                    קבוצה: {profit.driverGroupName}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle icon={<TrendingUp className="w-5 h-5 text-green-500" />}>
            רווחיות משוערת
          </CardTitle>
          {profit.driverGroupName && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
              <Truck className="w-3.5 h-3.5" />
              {profit.driverGroupName}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* כרטיסי רווח */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* הכנסות */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
            <p className="text-sm text-gray-600 mb-1">הכנסות 2025</p>
            <p className="text-xl font-bold text-blue-600">
              {formatCurrency(profit.revenue)}
            </p>
          </div>

          {/* רווח גולמי */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
            <p className="text-sm text-gray-600 mb-1">רווח גולמי</p>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(profit.grossProfit)}
            </p>
            <p className="text-xs text-green-500">~35%</p>
          </div>

          {/* רווח תפעולי */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-100">
            <p className="text-sm text-gray-600 mb-1">רווח תפעולי</p>
            <p className="text-xl font-bold text-purple-600">
              {formatCurrency(profit.operatingProfit)}
            </p>
            <p className="text-xs text-purple-500">~25%</p>
          </div>

          {/* רווח נקי */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
            <p className="text-sm text-gray-600 mb-1">רווח נקי</p>
            <p className="text-xl font-bold text-amber-600">
              {formatCurrency(profit.netProfit)}
            </p>
            <p className="text-xs text-amber-500">~{profit.profitMargin}%</p>
          </div>
        </div>

        {/* הערה */}
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-600 text-sm rounded-lg">
          <Calculator className="w-4 h-4 flex-shrink-0" />
          <span>
            החישוב מבוסס על עלויות משוערות. לחישוב מדויק יש להזין עלויות בפועל.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
