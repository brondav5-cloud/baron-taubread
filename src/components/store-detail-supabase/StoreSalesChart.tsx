"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatNumber } from "@/lib/calculations";
import type { StoreChartData } from "@/hooks/useStoreDetailSupabase";

// ============================================
// TYPES
// ============================================

interface StoreSalesChartProps {
  data: StoreChartData[];
}

// ============================================
// COMPONENT
// ============================================

export function StoreSalesChart({ data }: StoreSalesChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-6 text-center text-gray-400">
        אין נתונים להצגה בגרף
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-4">
      <h3 className="font-bold text-gray-900 mb-4 px-2">
        📊 מכירות חודשיות (12 חודשים אחרונים)
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              tickFormatter={(v: number) => formatNumber(v)}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatNumber(value),
                name,
              ]}
              contentStyle={{ direction: "rtl", fontSize: 13 }}
            />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Bar
              dataKey="gross"
              name="ברוטו"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="qty"
              name="נטו"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="returns"
              name="החזרות"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
