"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatNumber } from "@/lib/calculations";
import { Card, CardContent } from "@/components/ui";
import type { ChartDataPoint } from "@/hooks/useDashboardSupabase";

interface MonthlySalesChartProps {
  data: ChartDataPoint[];
}

export function MonthlySalesChart({ data }: MonthlySalesChartProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v: number) => formatNumber(v)} />
              <Bar dataKey="gross" name="ברוטו" fill="#3b82f6" />
              <Bar dataKey="qty" name="נטו" fill="#22c55e" />
              <Bar dataKey="returns" name="חזרות" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
