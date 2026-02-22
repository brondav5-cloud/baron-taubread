"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { clsx } from "clsx";

interface ChangeIndicatorProps {
  current: number;
  compare: number;
}

export function ChangeIndicator({ current, compare }: ChangeIndicatorProps) {
  if (compare === 0) return <span className="text-gray-400">-</span>;

  const change = ((current - compare) / compare) * 100;
  const isPositive = change > 0;
  const isNeutral = Math.abs(change) < 1;

  if (isNeutral) {
    return (
      <span className="inline-flex items-center text-gray-500 text-xs">
        <Minus className="w-3 h-3 ml-0.5" />
        {Math.abs(change).toFixed(1)}%
      </span>
    );
  }

  return (
    <span
      className={clsx(
        "inline-flex items-center text-xs font-medium",
        isPositive ? "text-green-600" : "text-red-600",
      )}
    >
      {isPositive ? (
        <TrendingUp className="w-3 h-3 ml-0.5" />
      ) : (
        <TrendingDown className="w-3 h-3 ml-0.5" />
      )}
      {isPositive ? "+" : ""}
      {change.toFixed(1)}%
    </span>
  );
}
