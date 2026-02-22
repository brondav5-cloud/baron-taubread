"use client";

import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Store,
  Percent,
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/calculations";

interface OverviewProps {
  totalStores: number;
  totalSales: number;
  totalQty: number;
  totalProfit: number;
  avgMargin: number;
  profitableStores: number;
  profitTypeLabel: string;
}

export function ProfitabilityOverview({
  totalStores,
  totalSales,
  totalQty,
  totalProfit,
  avgMargin,
  profitableStores,
  profitTypeLabel,
}: OverviewProps) {
  const profitablePercent =
    totalStores > 0 ? Math.round((profitableStores / totalStores) * 100) : 0;

  const cards = [
    {
      label: "סה״כ מחזור",
      value: formatCurrency(totalSales),
      icon: DollarSign,
      color: "bg-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      label: `רווח ${profitTypeLabel}`,
      value: formatCurrency(totalProfit),
      icon: totalProfit >= 0 ? TrendingUp : TrendingDown,
      color: totalProfit >= 0 ? "bg-green-500" : "bg-red-500",
      bgColor: totalProfit >= 0 ? "bg-green-50" : "bg-red-50",
    },
    {
      label: "רווחיות ממוצעת",
      value: `${avgMargin.toFixed(1)}%`,
      icon: Percent,
      color: avgMargin >= 20 ? "bg-emerald-500" : "bg-amber-500",
      bgColor: avgMargin >= 20 ? "bg-emerald-50" : "bg-amber-50",
    },
    {
      label: "כמות יחידות",
      value: formatNumber(totalQty),
      icon: Package,
      color: "bg-purple-500",
      bgColor: "bg-purple-50",
    },
    {
      label: "חנויות רווחיות",
      value: `${profitableStores}/${totalStores}`,
      subValue: `${profitablePercent}%`,
      icon: Store,
      color: profitablePercent >= 70 ? "bg-green-500" : "bg-orange-500",
      bgColor: profitablePercent >= 70 ? "bg-green-50" : "bg-orange-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`${card.bgColor} rounded-2xl p-4 transition-transform hover:scale-[1.02]`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`${card.color} p-2 rounded-xl`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{card.value}</p>
          {card.subValue && (
            <p className="text-sm font-medium text-gray-600 mb-1">
              {card.subValue}
            </p>
          )}
          <p className="text-sm text-gray-600">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
