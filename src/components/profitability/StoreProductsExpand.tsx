"use client";

import { useState, useMemo } from "react";
import { ChevronDown, Package, TrendingUp, TrendingDown } from "lucide-react";
import { clsx } from "clsx";
import { formatCurrency, formatNumber } from "@/lib/calculations";
import { useStoresAndProducts } from "@/context/StoresAndProductsContext";
import type { ProfitType } from "@/hooks/useProfitabilityPage";

interface Props {
  storeId: number;
  storeName: string;
  profitType: ProfitType;
  isExpanded: boolean;
  onToggle: () => void;
}

interface ProductProfit {
  id: number;
  name: string;
  category: string;
  qty: number;
  sales: number;
  profit: number;
  margin: number;
}

export function StoreProductsExpand({
  storeName,
  profitType,
  isExpanded,
  onToggle,
}: Props) {
  const { products: dbProducts } = useStoresAndProducts();
  const [sortBy, setSortBy] = useState<"profit" | "sales" | "qty">("profit");

  const productProfits = useMemo((): ProductProfit[] => {
    const products = dbProducts.map((p) => {
      const m = p.metrics || {};
      return {
        id: p.external_id,
        name: p.name,
        category: p.category || "",
        sales_2025: m.sales_current_year ?? 0,
        qty_2025: m.qty_current_year ?? 0,
      };
    });

    // Simulate product-level data for this store
    return products.slice(0, 15).map((product) => {
      const qty = Math.floor(Math.random() * 500) + 50;
      const avgPrice = product.sales_2025 / (product.qty_2025 || 1);
      const sales = qty * avgPrice;

      // Calculate margin based on profit type
      let marginBase: number;
      switch (profitType) {
        case "gross":
          marginBase = 0.35 + Math.random() * 0.2;
          break;
        case "operating":
          marginBase = 0.25 + Math.random() * 0.15;
          break;
        case "net":
          marginBase = 0.18 + Math.random() * 0.12;
          break;
      }

      const profit = sales * marginBase;

      return {
        id: product.id,
        name: product.name,
        category: product.category,
        qty,
        sales,
        profit,
        margin: marginBase * 100,
      };
    });
  }, [dbProducts, profitType]);

  const sortedProducts = useMemo(() => {
    return [...productProfits].sort((a, b) => {
      switch (sortBy) {
        case "profit":
          return b.profit - a.profit;
        case "sales":
          return b.sales - a.sales;
        case "qty":
          return b.qty - a.qty;
        default:
          return 0;
      }
    });
  }, [productProfits, sortBy]);

  const totals = useMemo(
    () => ({
      qty: productProfits.reduce((sum, p) => sum + p.qty, 0),
      sales: productProfits.reduce((sum, p) => sum + p.sales, 0),
      profit: productProfits.reduce((sum, p) => sum + p.profit, 0),
    }),
    [productProfits],
  );

  if (!isExpanded) {
    return (
      <button
        onClick={onToggle}
        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        title="הצג רווחיות לפי מוצרים"
      >
        <ChevronDown className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="col-span-full bg-gradient-to-br from-gray-50 to-blue-50/30 border-t border-b border-blue-100">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">
              רווחיות לפי מוצרים - {storeName}
            </h4>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-1.5 text-sm bg-white border rounded-lg"
            >
              <option value="profit">מיין לפי רווח</option>
              <option value="sales">מיין לפי מחזור</option>
              <option value="qty">מיין לפי כמות</option>
            </select>
            <button
              onClick={onToggle}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg"
            >
              <ChevronDown className="w-5 h-5 rotate-180" />
            </button>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  מוצר
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">
                  קטגוריה
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">
                  כמות
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">
                  מחזור
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">
                  רווחיות %
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-600 bg-green-50">
                  רווח
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-gray-900">
                      {product.name}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-600">
                    {product.category}
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-900">
                    {formatNumber(product.qty)}
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-900">
                    {formatCurrency(product.sales)}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span
                      className={clsx(
                        "font-medium",
                        product.margin >= 25
                          ? "text-green-600"
                          : product.margin >= 15
                            ? "text-blue-600"
                            : "text-orange-600",
                      )}
                    >
                      {product.margin.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center bg-green-50/50">
                    <div className="flex items-center justify-center gap-1">
                      {product.profit >= 0 ? (
                        <TrendingUp className="w-3 h-3 text-green-600" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-600" />
                      )}
                      <span
                        className={clsx(
                          "font-semibold",
                          product.profit >= 0
                            ? "text-green-600"
                            : "text-red-600",
                        )}
                      >
                        {formatCurrency(product.profit)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-semibold">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-right">
                  סה״כ {sortedProducts.length} מוצרים
                </td>
                <td className="px-4 py-3 text-center">
                  {formatNumber(totals.qty)}
                </td>
                <td className="px-4 py-3 text-center">
                  {formatCurrency(totals.sales)}
                </td>
                <td className="px-4 py-3 text-center">-</td>
                <td
                  className={clsx(
                    "px-4 py-3 text-center",
                    totals.profit >= 0
                      ? "text-green-600 bg-green-100"
                      : "text-red-600 bg-red-100",
                  )}
                >
                  {formatCurrency(totals.profit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
