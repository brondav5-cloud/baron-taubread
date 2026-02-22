"use client";

import { formatNumber } from "@/lib/calculations";
import type { ProductWithStatus } from "@/types/data";

interface ProductSummaryCardsProps {
  product: ProductWithStatus;
}

export function ProductSummaryCards({ product }: ProductSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
        <p className="text-sm text-gray-600">כמות 2024</p>
        <p className="text-2xl font-bold text-blue-600">
          {formatNumber(product.qty_2024)}
        </p>
      </div>
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
        <p className="text-sm text-gray-600">כמות 2025</p>
        <p className="text-2xl font-bold text-green-600">
          {formatNumber(product.qty_2025)}
        </p>
      </div>
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
        <p className="text-sm text-gray-600">מחזור 2024</p>
        <p className="text-2xl font-bold text-blue-600">
          ₪{formatNumber(Math.round(product.sales_2024))}
        </p>
      </div>
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
        <p className="text-sm text-gray-600">מחזור 2025</p>
        <p className="text-2xl font-bold text-green-600">
          ₪{formatNumber(Math.round(product.sales_2025))}
        </p>
      </div>
    </div>
  );
}
