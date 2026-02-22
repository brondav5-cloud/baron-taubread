"use client";

import { useMemo } from "react";
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

export interface MonthlyData {
  month: string;
  label: string;
  total: number;
  completed: number;
  overdue: number;
}

interface TasksTrendChartProps {
  data: MonthlyData[];
}

export function TasksTrendChart({ data }: TasksTrendChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      pending: item.total - item.completed - item.overdue,
    }));
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-card p-8 text-center text-gray-500">
        אין נתונים לתצוגה
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-card p-4">
      <h3 className="font-bold text-gray-900 mb-4">מגמות לאורך זמן</h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  completed: "הושלמו",
                  overdue: "באיחור",
                  pending: "בטיפול",
                };
                return [value, labels[name] || name];
              }}
            />
            <Legend
              formatter={(value: string) => {
                const labels: Record<string, string> = {
                  completed: "הושלמו",
                  overdue: "באיחור",
                  pending: "בטיפול",
                };
                return labels[value] || value;
              }}
            />
            <Bar
              dataKey="completed"
              stackId="a"
              fill="#22c55e"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="pending"
              stackId="a"
              fill="#f59e0b"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="overdue"
              stackId="a"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
