"use client";

import { clsx } from "clsx";
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface CategoryStats {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  avgHandlingDays: number;
  previousMonthTasks?: number;
}

interface CategoryBreakdownProps {
  data: CategoryStats[];
}

export function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  const sortedData = [...data].sort((a, b) => b.totalTasks - a.totalTasks);

  const getTrend = (current: number, previous?: number) => {
    if (previous === undefined || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    if (change > 10)
      return { icon: TrendingUp, color: "text-red-500", label: "עלייה" };
    if (change < -10)
      return { icon: TrendingDown, color: "text-green-500", label: "ירידה" };
    return { icon: Minus, color: "text-gray-400", label: "יציב" };
  };

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-card p-8 text-center text-gray-500">
        אין נתונים לתצוגה
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900">פירוט לפי קטגוריה</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">
                קטגוריה
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">
                משימות
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">
                הושלמו
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">
                באיחור
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">
                זמן ממוצע
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">
                מגמה
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedData.map((row) => {
              const completionRate =
                row.totalTasks > 0
                  ? Math.round((row.completedTasks / row.totalTasks) * 100)
                  : 0;
              const trend = getTrend(row.totalTasks, row.previousMonthTasks);
              const TrendIcon = trend?.icon;

              return (
                <tr key={row.categoryId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{row.categoryIcon}</span>
                      <span className="font-medium text-gray-900">
                        {row.categoryName}
                      </span>
                    </div>
                  </td>
                  <td className="text-center px-4 py-3">
                    <span className="font-bold text-gray-900">
                      {row.totalTasks}
                    </span>
                  </td>
                  <td className="text-center px-4 py-3">
                    <div className="flex flex-col items-center">
                      <span className="font-medium text-green-600">
                        {row.completedTasks}
                      </span>
                      <span className="text-xs text-gray-400">
                        {completionRate}%
                      </span>
                    </div>
                  </td>
                  <td className="text-center px-4 py-3">
                    {row.overdueTasks > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        {row.overdueTasks}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="text-center px-4 py-3">
                    <span
                      className={clsx(
                        "font-medium",
                        row.avgHandlingDays > 2
                          ? "text-amber-600"
                          : "text-gray-600",
                      )}
                    >
                      {row.avgHandlingDays.toFixed(1)} ימים
                    </span>
                  </td>
                  <td className="text-center px-4 py-3">
                    {TrendIcon ? (
                      <div className="flex items-center justify-center gap-1">
                        <TrendIcon className={clsx("w-4 h-4", trend.color)} />
                        <span className={clsx("text-xs", trend.color)}>
                          {trend.label}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
