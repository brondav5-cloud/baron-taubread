"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Store, Eye, CheckCircle, XCircle } from "lucide-react";
import type { PricingIndex } from "@/types/pricing";

interface PricingStoreItem {
  id: number;
  storeUuid?: string;
  name: string;
  city: string;
  hasPricing: boolean;
}

interface PricingStoresListProps {
  index: PricingIndex | null;
  stores: PricingStoreItem[];
}

export function PricingStoresList({ index, stores }: PricingStoresListProps) {
  const [search, setSearch] = useState("");
  const [showOnlyWithPricing, setShowOnlyWithPricing] = useState(true);

  const filteredStores = useMemo(() => {
    let result = stores;

    if (showOnlyWithPricing) {
      result = result.filter((s) => s.hasPricing);
    }

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.city.toLowerCase().includes(term) ||
          String(s.id).includes(term),
      );
    }

    return result;
  }, [stores, search, showOnlyWithPricing]);

  const storesWithPricingCount = stores.filter((s) => s.hasPricing).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Store className="w-5 h-5 text-primary-500" />
            חנויות ({storesWithPricingCount} עם מחירון)
          </h2>

          {index && (
            <span className="text-sm text-gray-500">
              עודכן: {new Date(index.lastUpdated).toLocaleDateString("he-IL")}
            </span>
          )}
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש חנות..."
              className="w-full pr-10 pl-4 py-2 bg-gray-50 rounded-xl text-sm"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyWithPricing}
              onChange={(e) => setShowOnlyWithPricing(e.target.checked)}
              className="rounded"
            />
            רק עם מחירון
          </label>
        </div>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredStores.length === 0 ? (
          <div className="p-8 text-center text-gray-500">לא נמצאו חנויות</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-right font-medium">חנות</th>
                <th className="px-4 py-3 text-center font-medium">מחירון</th>
                <th className="px-4 py-3 text-center font-medium">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredStores.map((store) => (
                <tr
                  key={store.id}
                  className="border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {store.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {store.city} | מזהה: {store.id}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {store.hasPricing ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      {store.storeUuid ? (
                        <Link
                          href={`/dashboard/stores/${store.storeUuid}?tab=pricing`}
                          className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg"
                          title="צפייה במחירון החנות"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      ) : (
                        <span
                          className="p-2 text-gray-300 cursor-not-allowed"
                          title="חנות ללא קישור"
                        >
                          <Eye className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
