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
import type { ProductChartData } from "@/hooks/useProductDetail";

interface ProductSalesChartProps {
  data: ProductChartData[];
}

export function ProductSalesChart({ data }: ProductSalesChartProps) {
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
              <Bar dataKey="qty" name="כמות" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
