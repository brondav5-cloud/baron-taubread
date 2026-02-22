"use client";

import { TrendingUp, TrendingDown, Users, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui";
import type { ComparisonStore } from "@/hooks/useComparisonSupabase";

interface ComparisonSummaryProps {
  stores: ComparisonStore[];
  periodLabels?: {
    yearly?: string;
    halfYear?: string;
    quarter?: string;
    twoMonths?: string;
  } | null;
}

export function ComparisonSummary({
  stores,
  periodLabels,
}: ComparisonSummaryProps) {
  if (stores.length === 0) return null;

  const metrics = calculateSummaryMetrics(stores);

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary-500" />
          <h3 className="font-bold text-gray-900">סיכום מהיר</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Stores */}
          <SummaryCard
            icon={<Users className="w-5 h-5 text-blue-500" />}
            label="סה״כ חנויות"
            value={stores.length.toString()}
            bgColor="bg-blue-50"
          />

          {/* Average 12v12 */}
          <SummaryCard
            icon={
              metrics.avg12v12 >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )
            }
            label={
              periodLabels?.yearly
                ? `ממוצע ${periodLabels.yearly}`
                : "ממוצע 12v12"
            }
            value={`${metrics.avg12v12 >= 0 ? "+" : ""}${metrics.avg12v12.toFixed(1)}%`}
            bgColor={metrics.avg12v12 >= 0 ? "bg-green-50" : "bg-red-50"}
          />

          {/* Growing Stores */}
          <SummaryCard
            icon={<TrendingUp className="w-5 h-5 text-green-500" />}
            label="בצמיחה"
            value={metrics.growingCount.toString()}
            subValue={`(${((metrics.growingCount / stores.length) * 100).toFixed(0)}%)`}
            bgColor="bg-green-50"
          />

          {/* Declining Stores */}
          <SummaryCard
            icon={<TrendingDown className="w-5 h-5 text-red-500" />}
            label="בירידה"
            value={metrics.decliningCount.toString()}
            subValue={`(${((metrics.decliningCount / stores.length) * 100).toFixed(0)}%)`}
            bgColor="bg-red-50"
          />
        </div>

        {/* Range */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-center gap-8 text-sm">
            <span className="text-gray-500">
              טווח:
              <span className="font-bold text-red-600 mx-1">
                {metrics.min.toFixed(1)}%
              </span>
              עד
              <span className="font-bold text-green-600 mx-1">
                +{metrics.max.toFixed(1)}%
              </span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCard({
  icon,
  label,
  subLabel,
  value,
  subValue,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  subLabel?: string;
  value: string;
  subValue?: string;
  bgColor: string;
}) {
  return (
    <div className={`${bgColor} rounded-xl p-3 text-center`}>
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {subLabel && (
        <div className="text-[10px] text-gray-500 mb-0.5">{subLabel}</div>
      )}
      <div className="text-xl font-bold text-gray-900">
        {value}
        {subValue && (
          <span className="text-xs font-normal text-gray-500 mr-1">
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
}

function calculateSummaryMetrics(stores: ComparisonStore[]) {
  const values = stores.map((s) => s.metric_12v12);
  const sum = values.reduce((a, b) => a + b, 0);
  const avg12v12 = sum / stores.length;
  const growingCount = stores.filter((s) => s.metric_12v12 >= 0).length;
  const decliningCount = stores.length - growingCount;
  const min = Math.min(...values);
  const max = Math.max(...values);

  return { avg12v12, growingCount, decliningCount, min, max };
}
