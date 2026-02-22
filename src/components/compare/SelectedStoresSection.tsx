"use client";

import Link from "next/link";
import { Plus, X } from "lucide-react";
import { clsx } from "clsx";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { formatPercent, getMetricColor } from "@/lib/calculations";
import { CHART_COLORS } from "@/hooks/useComparisonSupabase";
import type { ComparisonStore } from "@/hooks/useComparisonSupabase";

interface SelectedStoresSectionProps {
  stores: ComparisonStore[];
  onRemoveStore: (storeId: string | number) => void;
  onAddStoreClick: () => void;
}

export function SelectedStoresSection({
  stores,
  onRemoveStore,
  onAddStoreClick,
}: SelectedStoresSectionProps) {
  if (stores.length === 0) return null;

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
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {stores.map((store, index) => (
            <div
              key={store.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
              style={{
                borderRight: `4px solid ${CHART_COLORS[index % CHART_COLORS.length]}`,
              }}
            >
              <div>
                <Link
                  href={`/dashboard/stores/${String(store.id)}`}
                  className="font-medium text-gray-900 hover:text-primary-600"
                >
                  {store.name}
                </Link>
                <p
                  className={clsx(
                    "text-sm font-bold",
                    getMetricColor(store.metric_12v12),
                  )}
                >
                  {formatPercent(store.metric_12v12)}
                </p>
              </div>
              <button
                onClick={() => onRemoveStore(store.id)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
