"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { clsx } from "clsx";
import { formatNumber } from "@/lib/calculations";
import { calcMonthlyTotals } from "@/components/ui";
import type { ProductWithStatus } from "@/types/data";

interface ProductsDataTableProps {
  products: ProductWithStatus[];
  periodMonths: string[];
  label: string;
  bgColor: string;
}

export function ProductsDataTable({
  products,
  periodMonths,
  label,
  bgColor,
}: ProductsDataTableProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {label && (
        <div className={clsx("px-4 py-2 font-medium text-white", bgColor)}>
          {label}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-3 w-10">
                <input type="checkbox" className="rounded" />
              </th>
              <th className="px-4 py-3 text-right font-medium">מוצר</th>
              <th className="px-3 py-3 text-center font-medium">כמות</th>
              <th className="px-3 py-3 text-center font-medium">מחזור</th>
              <th className="px-2 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const data = calcMonthlyTotals(product, periodMonths);
              return (
                <tr
                  key={product.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-2 py-3 text-center">
                    <input type="checkbox" className="rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/products/${product.id}`}
                      className="hover:text-primary-600"
                    >
                      <div className="font-medium text-gray-900">
                        {product.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {product.category}
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-center font-medium">
                    {formatNumber(data.qty)}
                  </td>
                  <td className="px-3 py-3 text-center font-medium">
                    ₪{formatNumber(Math.round(data.sales))}
                  </td>
                  <td className="px-2 py-3">
                    <Link href={`/dashboard/products/${product.id}`}>
                      <ChevronLeft className="w-4 h-4 text-gray-400" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
