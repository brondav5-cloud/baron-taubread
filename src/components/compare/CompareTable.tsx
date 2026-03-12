"use client";

import { BarChart3, Table2 } from "lucide-react";
import { clsx } from "clsx";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  MonthSelector,
  type MonthSelection,
} from "@/components/ui";
import type { ComparisonStore } from "@/hooks/useComparisonSupabase";
import { CompareMetricsTable } from "./CompareMetricsTable";
import { CompareDataTable } from "./CompareDataTable";

interface CompareTableProps {
  stores: ComparisonStore[];
  viewMode: "metrics" | "data";
  onViewModeChange: (mode: "metrics" | "data") => void;
  monthSelection: MonthSelection;
  onMonthSelectionChange: (selection: MonthSelection) => void;
  getPeriodLabel: (months: string[]) => string;
  metricsPeriodLabels?: {
    yearly: string;
    halfYear: string;
    quarter: string;
    twoMonths: string;
  } | null;
}

export function CompareTable({
  stores,
  viewMode,
  onViewModeChange,
  monthSelection,
  onMonthSelectionChange,
  getPeriodLabel,
  metricsPeriodLabels,
}: CompareTableProps) {
  if (stores.length < 2) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>השוואת מדדים</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => onViewModeChange("metrics")}
                className={clsx(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  viewMode === "metrics"
                    ? "bg-primary-500 text-white"
                    : "text-gray-600",
                )}
              >
                <BarChart3 className="w-4 h-4" />
                מדדים
              </button>
              <button
                onClick={() => onViewModeChange("data")}
                className={clsx(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  viewMode === "data"
                    ? "bg-primary-500 text-white"
                    : "text-gray-600",
                )}
              >
                <Table2 className="w-4 h-4" />
                נתונים
              </button>
            </div>
            {viewMode === "data" && (
              <MonthSelector
                value={monthSelection}
                onChange={onMonthSelectionChange}
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {viewMode === "metrics" ? (
          <CompareMetricsTable
            stores={stores}
            metricsPeriodLabels={metricsPeriodLabels}
          />
        ) : (
          <CompareDataTable
            stores={stores}
            monthSelection={monthSelection}
            getPeriodLabel={getPeriodLabel}
          />
        )}
      </CardContent>
    </Card>
  );
}
