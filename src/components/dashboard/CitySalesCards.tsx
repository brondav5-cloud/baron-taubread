"use client";

import Link from "next/link";
import { formatNumber } from "@/lib/calculations";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import type { CitySalesData } from "@/hooks/useDashboard";

interface CitySalesCardsProps {
  cities: CitySalesData[];
}

export function CitySalesCards({ cities }: CitySalesCardsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>🏙️ מכירות לפי ערים</CardTitle>
        <p className="text-sm text-gray-500">
          H2 2025 (יול-דצמ) | לחץ על עיר להשוואה מפורטת
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
          {cities.map((city, i) => (
            <Link
              key={city.city}
              href={`/dashboard/compare?city=${city.city}`}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 sm:p-4 text-center hover:shadow-md transition-all border border-blue-100"
            >
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <span className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="font-bold text-gray-900 text-sm sm:text-base truncate">
                  {city.city}
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-blue-600">
                {formatNumber(city.qty)}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500">
                {city.stores} חנויות
              </p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
