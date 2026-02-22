import { clsx } from "clsx";
import type { RankingCardProps } from "./types";

export function RankingCard({
  title,
  icon,
  rank,
  total,
  value,
  cityAverage,
  percentile,
  color,
}: RankingCardProps) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 text-gray-600 mb-3">
        {icon}
        <span className="text-sm font-medium">{title}</span>
      </div>

      <div className={clsx("text-4xl font-bold mb-1", color)}>#{rank}</div>
      <p className="text-xs text-gray-500 mb-3">מתוך {total} חנויות בעיר</p>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">הערך שלך:</span>
          <span className="font-medium">{value}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">ממוצע עיר:</span>
          <span className="font-medium">{cityAverage}</span>
        </div>
      </div>

      {/* Percentile Bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>אחוזון</span>
          <span>{percentile}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={clsx(
              "h-full rounded-full transition-all",
              color.replace("text-", "bg-"),
            )}
            style={{ width: `${percentile}%` }}
          />
        </div>
      </div>
    </div>
  );
}
