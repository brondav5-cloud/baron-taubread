"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatNumber } from "@/lib/calculations";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { PRODUCT_DONUT_COLORS, type TopStore } from "@/hooks/useProductDetail";

interface ProductStoresDonutProps {
  stores: TopStore[];
}

export function ProductStoresDonut({ stores }: ProductStoresDonutProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>🥧 חלוקת חנויות (TOP 10)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="w-48 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stores}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="productQty"
                  nameKey="name"
                >
                  {stores.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        PRODUCT_DONUT_COLORS[
                          index % PRODUCT_DONUT_COLORS.length
                        ]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatNumber(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {stores.map((store, i) => (
              <div
                key={store.id}
                className="flex items-center justify-between border-r-4 pr-3 py-1"
                style={{ borderColor: PRODUCT_DONUT_COLORS[i] }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: PRODUCT_DONUT_COLORS[i] }}
                  />
                  <span className="font-medium">{store.name}</span>
                  <span className="text-xs text-gray-500">({store.city})</span>
                </div>
                <div className="text-left">
                  <span className="font-bold">
                    {formatNumber(store.productQty)}
                  </span>
                  <span className="text-gray-500 text-sm mr-2">
                    ({store.productPct.toFixed(1)}%)
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
