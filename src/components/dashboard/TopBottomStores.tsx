"use client";

import Link from "next/link";
import { formatPercent } from "@/lib/calculations";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";

interface TopStore {
  id: number;
  name: string;
  city: string;
  metric_12v12: number;
  sales: number;
  status: string;
}

interface TopBottomStoresProps {
  topStores: TopStore[];
  bottomStores: TopStore[];
}

export function TopBottomStores({
  topStores,
  bottomStores,
}: TopBottomStoresProps) {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Top 20 */}
      <Card>
        <CardHeader>
          <CardTitle>🏆 20 מובילות</CardTitle>
        </CardHeader>
        <CardContent className="max-h-96 overflow-y-auto">
          <div className="space-y-2">
            {topStores.slice(0, 5).map((store, i) => (
              <Link
                key={store.id}
                href={`/dashboard/stores/${store.id}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{store.name}</p>
                    <p className="text-xs text-gray-500">{store.city}</p>
                  </div>
                </div>
                <span className="font-bold text-green-600">
                  +{formatPercent(store.metric_12v12)}
                </span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bottom 20 */}
      <Card>
        <CardHeader>
          <CardTitle>📉 20 בירידה</CardTitle>
        </CardHeader>
        <CardContent className="max-h-96 overflow-y-auto">
          <div className="space-y-2">
            {bottomStores.slice(0, 5).map((store, i) => (
              <Link
                key={store.id}
                href={`/dashboard/stores/${store.id}`}
                className="flex items-center justify-between p-3 bg-red-50 rounded-xl hover:bg-red-100"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{store.name}</p>
                    <p className="text-xs text-gray-500">{store.city}</p>
                  </div>
                </div>
                <span className="font-bold text-red-600">
                  {formatPercent(store.metric_12v12)}
                </span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
