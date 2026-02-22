"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatNumber } from "@/lib/calculations";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { DONUT_COLORS, type TopProduct } from "@/hooks/useStoreDetail";

interface StoreProductsDonutProps {
  products: TopProduct[];
}

export function StoreProductsDonut({ products }: StoreProductsDonutProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>🥧 חלוקת מוצרים (TOP 10)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="w-48 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={products}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="storeQty"
                  nameKey="name"
                >
                  {products.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatNumber(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {products.map((product, i) => (
              <div
                key={product.id}
                className="flex items-center justify-between border-r-4 pr-3 py-1"
                style={{ borderColor: DONUT_COLORS[i] }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: DONUT_COLORS[i] }}
                  />
                  <span className="font-medium">{product.name}</span>
                </div>
                <div className="text-left">
                  <span className="font-bold">
                    {formatNumber(product.storeQty)}
                  </span>
                  <span className="text-gray-500 text-sm mr-2">
                    ({product.storePct.toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
