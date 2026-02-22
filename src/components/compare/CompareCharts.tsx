"use client";

import { useState } from "react";
import { BarChart3, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import {
  CHART_COLORS,
  type ComparisonDataPoint,
} from "@/hooks/useComparisonSupabase";
import type { ComparisonStore } from "@/hooks/useComparisonSupabase";

interface CompareChartsProps {
  stores: ComparisonStore[];
  comparisonData: ComparisonDataPoint[];
  radarData: ComparisonDataPoint[];
}

const THRESHOLD_HIDE_CHARTS = 16;

export function CompareCharts({
  stores,
  comparisonData,
  radarData,
}: CompareChartsProps) {
  const [forceShow, setForceShow] = useState(false);

  if (stores.length < 2) return null;

  const shouldHide = stores.length >= THRESHOLD_HIDE_CHARTS && !forceShow;

  if (shouldHide) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center">
            <AlertTriangle className="w-10 h-10 text-orange-400 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-2">הגרפים מוסתרים</h3>
            <p className="text-gray-500 text-sm mb-4">
              עם {stores.length} חנויות הגרפים לא קריאים.
              <br />
              השתמש בטבלה למטה או הצג בכל זאת.
            </p>
            <button
              onClick={() => setForceShow(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
              הצג גרפים בכל זאת
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Collapse button for forced show */}
      {stores.length >= THRESHOLD_HIDE_CHARTS && forceShow && (
        <div className="flex justify-end">
          <button
            onClick={() => setForceShow(false)}
            className="inline-flex items-center gap-1 px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronUp className="w-4 h-4" />
            הסתר גרפים
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle icon={<BarChart3 className="w-5 h-5" />}>
              השוואת מדדים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" />
                  <YAxis tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={(value: number) => `${value.toFixed(1)}%`}
                  />
                  {stores.length <= 10 && <Legend />}
                  {stores.map((store, index) => (
                    <Bar
                      key={store.id}
                      dataKey={`store${index}`}
                      name={store.name}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>פרופיל ביצועים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  {stores.map((store, index) => (
                    <Radar
                      key={store.id}
                      name={store.name}
                      dataKey={`store${index}`}
                      stroke={CHART_COLORS[index % CHART_COLORS.length]}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      fillOpacity={0.3}
                    />
                  ))}
                  {stores.length <= 10 && <Legend />}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
