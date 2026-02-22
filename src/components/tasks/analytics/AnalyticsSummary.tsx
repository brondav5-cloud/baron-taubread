"use client";

import { CheckCircle, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { clsx } from "clsx";

interface AnalyticsSummaryProps {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  avgHandlingDays: number;
  comparisonPercent?: number; // השוואה לחודש קודם
}

export function AnalyticsSummary({
  totalTasks,
  completedTasks,
  overdueTasks,
  avgHandlingDays,
  comparisonPercent,
}: AnalyticsSummaryProps) {
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const cards = [
    {
      title: 'סה"כ משימות',
      value: totalTasks,
      icon: TrendingUp,
      color: "blue",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "הושלמו",
      value: completedTasks,
      subtitle: `${completionRate}%`,
      icon: CheckCircle,
      color: "green",
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      title: "באיחור",
      value: overdueTasks,
      icon: AlertTriangle,
      color: "red",
      bgColor: "bg-red-50",
      iconColor: "text-red-600",
      alert: overdueTasks > 0,
    },
    {
      title: "זמן טיפול ממוצע",
      value: avgHandlingDays.toFixed(1),
      subtitle: "ימים",
      icon: Clock,
      color: "amber",
      bgColor: "bg-amber-50",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={clsx(
              "bg-white rounded-2xl shadow-card p-4",
              card.alert && "ring-2 ring-red-200",
            )}
          >
            <div className="flex items-start justify-between mb-2">
              <div className={clsx("p-2 rounded-xl", card.bgColor)}>
                <Icon className={clsx("w-5 h-5", card.iconColor)} />
              </div>
              {comparisonPercent !== undefined &&
                card.title === 'סה"כ משימות' && (
                  <span
                    className={clsx(
                      "text-xs font-medium px-2 py-1 rounded-full",
                      comparisonPercent >= 0
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700",
                    )}
                  >
                    {comparisonPercent >= 0 ? "+" : ""}
                    {comparisonPercent}%
                  </span>
                )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <div className="flex items-center gap-1">
              <p className="text-sm text-gray-500">{card.title}</p>
              {card.subtitle && (
                <span className="text-sm text-gray-400">({card.subtitle})</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
