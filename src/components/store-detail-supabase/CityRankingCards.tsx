"use client";

import { Trophy, TrendingUp, Zap } from "lucide-react";
import { clsx } from "clsx";
import { formatNumber, formatPercent } from "@/lib/calculations";
import type { CityRankings } from "@/hooks/useStoreCityComparison";

// ============================================
// SINGLE CARD
// ============================================

function RankingCard({
  title,
  icon,
  rank,
  total,
  value,
  avg,
  color,
}: {
  title: string;
  icon: React.ReactNode;
  rank: number;
  total: number;
  value: string;
  avg: string;
  color: string;
}) {
  const pct = total > 0 ? Math.round((1 - (rank - 1) / total) * 100) : 0;
  return (
    <div className={clsx("rounded-xl p-4 border", color)}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium">{title}</span>
      </div>
      <p className="text-3xl font-bold">
        {rank}/{total}
      </p>
      <div className="mt-2 text-xs space-y-0.5">
        <p>
          אתה: <span className="font-medium">{value}</span>
        </p>
        <p>
          ממוצע עיר: <span className="font-medium">{avg}</span>
        </p>
        <p>
          פרצנטיל: <span className="font-bold">{pct}%</span>
        </p>
      </div>
    </div>
  );
}

// ============================================
// CARDS ROW
// ============================================

interface CityRankingCardsProps {
  rankings: CityRankings;
}

export function CityRankingCards({ rankings }: CityRankingCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <RankingCard
        title="כמות (שנתי)"
        icon={<Trophy className="w-4 h-4 text-yellow-600" />}
        rank={rankings.qty.rank}
        total={rankings.qty.total}
        value={formatNumber(rankings.qty.value)}
        avg={formatNumber(Math.round(rankings.qty.cityAverage))}
        color="bg-yellow-50 border-yellow-200"
      />
      <RankingCard
        title="מגמה ארוכה (12v12)"
        icon={<TrendingUp className="w-4 h-4 text-blue-600" />}
        rank={rankings.metric12v12.rank}
        total={rankings.metric12v12.total}
        value={formatPercent(rankings.metric12v12.value)}
        avg={formatPercent(rankings.metric12v12.cityAverage)}
        color="bg-blue-50 border-blue-200"
      />
      <RankingCard
        title="מגמה קצרה (2v2)"
        icon={<Zap className="w-4 h-4 text-purple-600" />}
        rank={rankings.metric2v2.rank}
        total={rankings.metric2v2.total}
        value={formatPercent(rankings.metric2v2.value)}
        avg={formatPercent(rankings.metric2v2.cityAverage)}
        color="bg-purple-50 border-purple-200"
      />
    </div>
  );
}
