"use client";

import { useMemo } from "react";
import type { ComparisonStore, ComparisonDataPoint } from "@/types/comparison";

export function useComparisonCharts(selectedStores: ComparisonStore[]) {
  const comparisonData = useMemo((): ComparisonDataPoint[] => {
    if (selectedStores.length === 0) return [];
    return [
      {
        metric: "12v12",
        ...Object.fromEntries(
          selectedStores.map((s, i) => [`store${i}`, s.metric_12v12]),
        ),
      },
      {
        metric: "6v6",
        ...Object.fromEntries(
          selectedStores.map((s, i) => [`store${i}`, s.metric_6v6]),
        ),
      },
      {
        metric: "3v3",
        ...Object.fromEntries(
          selectedStores.map((s, i) => [`store${i}`, s.metric_3v3]),
        ),
      },
      {
        metric: "2v2",
        ...Object.fromEntries(
          selectedStores.map((s, i) => [`store${i}`, s.metric_2v2]),
        ),
      },
    ];
  }, [selectedStores]);

  const radarData = useMemo((): ComparisonDataPoint[] => {
    if (selectedStores.length === 0) return [];
    const normalize = (value: number, min: number, max: number) =>
      Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
    const metrics = ["12v12", "6v6", "2v2", "שיא", "החזרות"];
    return metrics.map((metric) => {
      const row: ComparisonDataPoint = { metric };
      selectedStores.forEach((store, i) => {
        switch (metric) {
          case "12v12":
            row[`store${i}`] = normalize(store.metric_12v12, -50, 50);
            break;
          case "6v6":
            row[`store${i}`] = normalize(store.metric_6v6, -50, 50);
            break;
          case "2v2":
            row[`store${i}`] = normalize(store.metric_2v2, -50, 50);
            break;
          case "שיא":
            row[`store${i}`] = normalize(-store.metric_peak_distance, -100, 0);
            break;
          case "החזרות":
            row[`store${i}`] = normalize(-store.returns_pct_last6, -40, 0);
            break;
        }
      });
      return row;
    });
  }, [selectedStores]);

  return { comparisonData, radarData };
}
