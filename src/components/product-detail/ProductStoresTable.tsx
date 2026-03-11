"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { clsx } from "clsx";
import { formatNumber, getMetricColor, formatPercent } from "@/lib/calculations";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import type { ProductStore } from "@/hooks/useProductDetail";

interface ProductStoresTableProps {
  stores: ProductStore[];
  search: string;
  onSearchChange: (value: string) => void;
  isLoading?: boolean;
  currentYear?: number;
  previousYear?: number;
}

export function ProductStoresTable({
  stores,
  search,
  onSearchChange,
  isLoading = false,
  currentYear = 2026,
  previousYear = 2025,
}: ProductStoresTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            🏪 חנויות שמוכרות את המוצר ({isLoading ? "..." : stores.length})
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="חיפוש חנות..."
              className="w-full pr-10 pl-4 py-2 bg-gray-50 rounded-xl text-sm border-0"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-gray-400">טוען נתוני חנויות...</div>
        ) : stores.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            אין חנויות שמוכרות מוצר זה
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-right font-medium">חנות</th>
                  <th className="px-3 py-2 text-center font-medium">
                    כמות {currentYear}
                  </th>
                  <th className="px-3 py-2 text-center font-medium">
                    כמות {previousYear}
                  </th>
                  <th className="px-3 py-2 text-center font-medium">
                    שנתי {String(previousYear).slice(2)}←{String(currentYear).slice(2)}
                  </th>
                  <th className="px-3 py-2 text-center font-medium">6 חודשים</th>
                  <th className="px-3 py-2 text-center font-medium">3 חודשים</th>
                  <th className="px-3 py-2 text-center font-medium">2 חודשים</th>
                  <th className="px-3 py-2 text-center font-medium">מחזור {currentYear}</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((store) => (
                  <tr
                    key={store.store_external_id}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="px-3 py-2">
                      <Link
                        href={`/dashboard/stores/${store.store_uuid || store.store_external_id}`}
                        className="hover:text-primary-600"
                      >
                        <div className="font-medium">{store.store_name}</div>
                        {store.store_city && (
                          <div className="text-xs text-gray-500">
                            {store.store_city}
                          </div>
                        )}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-center font-bold">
                      {formatNumber(store.qty_current_year)}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-500">
                      {formatNumber(store.qty_previous_year)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={clsx(
                          "font-bold",
                          getMetricColor(store.metric_12v12),
                        )}
                      >
                        {formatPercent(store.metric_12v12)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={clsx(
                          "font-bold",
                          getMetricColor(store.metric_6v6),
                        )}
                      >
                        {formatPercent(store.metric_6v6)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={clsx(
                          "font-bold",
                          getMetricColor(store.metric_3v3),
                        )}
                      >
                        {formatPercent(store.metric_3v3)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={clsx(
                          "font-bold",
                          getMetricColor(store.metric_2v2),
                        )}
                      >
                        {formatPercent(store.metric_2v2)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-purple-700 text-xs">
                      {store.sales_current_year > 0
                        ? `${(store.sales_current_year / 1000).toFixed(0)}K`
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
