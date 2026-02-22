"use client";

import { Search, FileSpreadsheet } from "lucide-react";
import { clsx } from "clsx";
import {
  formatNumber,
  formatPercent,
  getMetricColor,
} from "@/lib/calculations";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import {
  STATUS_DISPLAY_LONG,
  STATUS_DISPLAY_SHORT,
  STATUS_COLORS_LONG,
  STATUS_COLORS_SHORT,
  type ProductWithStatus,
} from "@/types/data";

interface StoreProductsTableProps {
  products: ProductWithStatus[];
  search: string;
  onSearchChange: (value: string) => void;
}

export function StoreProductsTable({
  products,
  search,
  onSearchChange,
}: StoreProductsTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>📦 מוצרים בחנות ({products.length})</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium">
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="חיפוש..."
              className="w-full pr-10 pl-4 py-2 bg-gray-50 rounded-xl text-sm border-0"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-right font-medium">מוצר</th>
                <th className="px-3 py-2 text-center font-medium">סטטוס</th>
                <th className="px-3 py-2 text-center font-medium">
                  שנתי 25←24
                </th>
                <th className="px-3 py-2 text-center font-medium">3 חודשים</th>
                <th className="px-3 py-2 text-center font-medium">6 חודשים</th>
                <th className="px-3 py-2 text-center font-medium">2 חודשים</th>
                <th className="px-3 py-2 text-center font-medium">
                  מרחק מהשיא
                </th>
                <th className="px-3 py-2 text-center font-medium">חזרות %</th>
                <th className="px-3 py-2 text-center font-medium">כמות ↓</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const longColors = STATUS_COLORS_LONG[product.status_long];
                const shortColors = STATUS_COLORS_SHORT[product.status_short];
                return (
                  <tr key={product.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-gray-500">
                        {product.category}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex flex-col gap-1">
                        <span
                          className={clsx(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            longColors.bg,
                            longColors.text,
                          )}
                        >
                          {STATUS_DISPLAY_LONG[product.status_long]}
                        </span>
                        <span
                          className={clsx(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            shortColors.bg,
                            shortColors.text,
                          )}
                        >
                          {STATUS_DISPLAY_SHORT[product.status_short]}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={clsx(
                          "font-bold",
                          getMetricColor(product.metric_12v12),
                        )}
                      >
                        {formatPercent(product.metric_12v12)}
                      </span>
                      <div className="text-xs text-gray-400">
                        {formatNumber(product.qty_2024)}←
                        {formatNumber(product.qty_2025)}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={clsx(
                          "font-bold",
                          getMetricColor(product.metric_3v3),
                        )}
                      >
                        {formatPercent(product.metric_3v3)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={clsx(
                          "font-bold",
                          getMetricColor(product.metric_6v6),
                        )}
                      >
                        {formatPercent(product.metric_6v6)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={clsx(
                          "font-bold",
                          getMetricColor(product.metric_2v2),
                        )}
                      >
                        {formatPercent(product.metric_2v2)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={clsx(
                          "font-bold",
                          getMetricColor(product.metric_peak_distance),
                        )}
                      >
                        {formatPercent(product.metric_peak_distance)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={clsx(
                          "font-medium",
                          product.returns_pct_last6 > 15 ? "text-red-600" : "",
                        )}
                      >
                        {product.returns_pct_last6.toFixed(1)}%→
                        {product.returns_pct_prev6.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center font-bold">
                      {formatNumber(product.qty_2025)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
