"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Building2, TrendingUp, TrendingDown, Users } from "lucide-react";
import { clsx } from "clsx";
import { getNetworkForStore, getNetworkStoresData } from "@/lib/networkLoader";
import type { StoreWithStatus } from "@/types/data";

interface StoreNetworkInfoProps {
  store: StoreWithStatus;
}

export function StoreNetworkInfo({ store }: StoreNetworkInfoProps) {
  const router = useRouter();

  const networkData = useMemo(() => {
    const network = getNetworkForStore(store.id);
    if (!network) return null;

    const { stores, avgSales, totalSales } = getNetworkStoresData(network.id);
    const storeSales = store.sales_2025 || 0;
    const diff = avgSales > 0 ? ((storeSales - avgSales) / avgSales) * 100 : 0;

    // מציאת דירוג בתוך הרשת
    const sortedStores = [...stores].sort(
      (a, b) => (b.sales_2025 || 0) - (a.sales_2025 || 0),
    );
    const rank = sortedStores.findIndex((s) => s.id === store.id) + 1;

    return {
      network,
      storeCount: stores.length,
      avgSales,
      totalSales,
      storeSales,
      diff,
      rank,
      isAboveAvg: diff >= 0,
    };
  }, [store]);

  if (!networkData) return null;

  const { network, storeCount, avgSales, storeSales, diff, rank, isAboveAvg } =
    networkData;

  const handleCompareNetwork = () => {
    // שומר את IDs של חנויות הרשת ב-localStorage להשוואה
    const { stores } = getNetworkStoresData(network.id);
    const storeIds = stores.map((s) => s.id);
    localStorage.setItem("compareStoreIds", JSON.stringify(storeIds));
    router.push("/dashboard/compare");
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
      <div className="flex items-center justify-between">
        {/* Network Info */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">רשת:</span>
              <span className="font-bold text-gray-900">{network.name}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{storeCount} סניפים</span>
            </div>
          </div>
        </div>

        {/* Compare Button */}
        <button
          onClick={handleCompareNetwork}
          className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          השווה לרשת
        </button>
      </div>

      {/* Performance vs Network */}
      <div className="mt-4 pt-4 border-t border-blue-100">
        <div className="grid grid-cols-3 gap-4">
          {/* Store Sales */}
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">מכירות החנות</div>
            <div className="text-lg font-bold text-gray-900">
              ₪{storeSales.toLocaleString()}
            </div>
          </div>

          {/* Network Average */}
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">ממוצע רשת</div>
            <div className="text-lg font-bold text-gray-900">
              ₪{Math.round(avgSales).toLocaleString()}
            </div>
          </div>

          {/* Difference */}
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">ביחס לממוצע</div>
            <div
              className={clsx(
                "flex items-center justify-center gap-1 text-lg font-bold",
                isAboveAvg ? "text-green-600" : "text-red-600",
              )}
            >
              {isAboveAvg ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
              {isAboveAvg ? "+" : ""}
              {diff.toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Rank */}
        <div className="mt-3 text-center">
          <span
            className={clsx(
              "inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium",
              rank <= 3
                ? "bg-green-100 text-green-700"
                : rank <= storeCount / 2
                  ? "bg-blue-100 text-blue-700"
                  : "bg-orange-100 text-orange-700",
            )}
          >
            דירוג ברשת: {rank} מתוך {storeCount}
          </span>
        </div>
      </div>
    </div>
  );
}
