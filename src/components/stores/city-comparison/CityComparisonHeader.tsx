import { MapPin, Package, TrendingUp, TrendingDown } from "lucide-react";
import { formatNumber, formatPercent } from "@/lib/calculations";
import { RankingCard } from "./RankingCard";
import type { Rankings, StatusCounts } from "./types";

interface CityComparisonHeaderProps {
  cityName: string;
  rankings: Rankings;
  statusCounts: StatusCounts;
}

export function CityComparisonHeader({
  cityName,
  rankings,
  statusCounts,
}: CityComparisonHeaderProps) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl">
            <MapPin className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              השוואה לחנויות ב{cityName}
            </h3>
            <p className="text-sm text-gray-500">{rankings.total} חנויות</p>
          </div>
        </div>

        {/* Status Summary */}
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
            עליה חדה: {statusCounts.rising}
          </span>
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
            יציב: {statusCounts.stable}
          </span>
          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
            ירידה: {statusCounts.declining}
          </span>
        </div>
      </div>

      {/* Ranking Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RankingCard
          title="דירוג כמות פריטים"
          icon={<Package className="w-4 h-4" />}
          rank={rankings.qty.rank}
          total={rankings.total}
          value={formatNumber(rankings.qty.value)}
          cityAverage={formatNumber(Math.round(rankings.qty.cityAverage))}
          percentile={rankings.qty.percentile}
          color="text-blue-600"
        />
        <RankingCard
          title="דירוג טווח קצר"
          icon={<TrendingUp className="w-4 h-4" />}
          rank={rankings.short.rank}
          total={rankings.total}
          value={formatPercent(rankings.short.value)}
          cityAverage={formatPercent(rankings.short.cityAverage)}
          percentile={rankings.short.percentile}
          color="text-orange-600"
        />
        <RankingCard
          title="דירוג טווח ארוך"
          icon={<TrendingDown className="w-4 h-4" />}
          rank={rankings.long.rank}
          total={rankings.total}
          value={formatPercent(rankings.long.value)}
          cityAverage={formatPercent(rankings.long.cityAverage)}
          percentile={rankings.long.percentile}
          color="text-green-600"
        />
      </div>
    </>
  );
}
