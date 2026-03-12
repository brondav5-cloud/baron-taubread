"use client";

import Link from "next/link";
import { Plus, X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { formatPercent } from "@/lib/calculations";
import { CHART_COLORS } from "@/hooks/useComparisonSupabase";
import type { ComparisonStore } from "@/hooks/useComparisonSupabase";

interface SelectedStoresSectionProps {
  stores: ComparisonStore[];
  onRemoveStore: (storeId: string | number) => void;
  onAddStoreClick: () => void;
}

function TrendIcon({ value }: { value: number | null }) {
  if (value === null || value === 0)
    return <Minus className="w-3 h-3 text-gray-400" />;
  if (value > 0) return <TrendingUp className="w-3 h-3 text-emerald-500" />;
  return <TrendingDown className="w-3 h-3 text-red-400" />;
}

function metricColor(value: number | null): string {
  if (value === null || value === 0) return "text-gray-400";
  if (value > 0) return "text-emerald-600";
  return "text-red-500";
}

export function SelectedStoresSection({
  stores,
  onRemoveStore,
  onAddStoreClick,
}: SelectedStoresSectionProps) {
  if (stores.length === 0) return null;

  const sorted = [...stores].sort((a, b) => (b.metric_12v12 ?? 0) - (a.metric_12v12 ?? 0));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>חנויות להשוואה ({stores.length})</CardTitle>
          <button
            onClick={onAddStoreClick}
            className="flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-xl text-sm font-medium hover:bg-primary-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            הוסף חנות
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-right px-4 py-2 font-medium text-gray-500 w-4"></th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">חנות</th>
                <th className="text-center px-3 py-2 font-medium text-gray-500 w-24">שינוי שנתי</th>
                <th className="w-8 px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((store) => {
                const originalIndex = stores.indexOf(store);
                const color = CHART_COLORS[originalIndex % CHART_COLORS.length];
                return (
                  <tr key={store.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/dashboard/stores/${String(store.id)}`}
                        className="font-medium text-gray-800 hover:text-purple-600 transition-colors"
                      >
                        {store.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex items-center gap-1 font-semibold text-xs ${metricColor(store.metric_12v12)}`}>
                        <TrendIcon value={store.metric_12v12} />
                        {formatPercent(store.metric_12v12)}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => onRemoveStore(store.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-all text-gray-400 hover:text-red-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
