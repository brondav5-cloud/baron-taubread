"use client";

import { useState } from "react";
import { Search, Package, PackageX } from "lucide-react";
import { clsx } from "clsx";
import { formatNumber } from "@/lib/calculations";
import type { StoreProduct, MissingProduct } from "@/hooks/useStoreProducts";

// ============================================
// TYPES
// ============================================

interface StoreProductsTabProps {
  storeProducts: StoreProduct[];
  missingProducts: MissingProduct[];
  totalProducts: number;
  totalMissing: number;
  isLoading: boolean;
  error: string | null;
  productSearch: string;
  missingSearch: string;
  onProductSearchChange: (v: string) => void;
  onMissingSearchChange: (v: string) => void;
}

type SubTab = "selling" | "missing";

// ============================================
// SEARCH INPUT
// ============================================

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pr-10 pl-4 py-2 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:border-blue-300 focus:ring-1 focus:ring-blue-300 outline-none"
      />
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function StoreProductsTab({
  storeProducts,
  missingProducts,
  totalProducts,
  totalMissing,
  isLoading,
  error,
  productSearch,
  missingSearch,
  onProductSearchChange,
  onMissingSearchChange,
}: StoreProductsTabProps) {
  const [subTab, setSubTab] = useState<SubTab>("selling");

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-gray-400 animate-pulse">
        טוען מוצרים...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
        <PackageX className="w-10 h-10 mx-auto mb-2 text-orange-400" />
        <p className="text-gray-600">{error}</p>
        <p className="text-sm text-gray-400 mt-1">
          ייתכן שטבלת store_products עדיין לא נוצרה ב-Supabase
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setSubTab("selling")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
            subTab === "selling"
              ? "bg-green-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          )}
        >
          <Package className="w-4 h-4" />
          מוכר ({totalProducts})
        </button>
        <button
          onClick={() => setSubTab("missing")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
            subTab === "missing"
              ? "bg-orange-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          )}
        >
          <PackageX className="w-4 h-4" />
          לא מוכר ({totalMissing})
        </button>
      </div>

      {/* Selling products */}
      {subTab === "selling" && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b flex items-center gap-4">
            <h3 className="font-bold text-gray-900 shrink-0">
              📦 מוצרים שהחנות מוכרת
            </h3>
            <SearchInput
              value={productSearch}
              onChange={onProductSearchChange}
              placeholder="חיפוש מוצר..."
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-right font-medium">מוצר</th>
                  <th className="px-4 py-2 text-right font-medium">קטגוריה</th>
                  <th className="px-4 py-2 text-center font-medium">כמות</th>
                  <th className="px-4 py-2 text-center font-medium">מכירות</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {storeProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center">
                      <p className="text-gray-400">לא נמצאו מוצרים</p>
                      <p className="text-xs text-gray-300 mt-1">
                        העלה שוב את קובץ ה-Excel אם יצרת לאחרונה את טבלת
                        store_products
                      </p>
                    </td>
                  </tr>
                ) : (
                  storeProducts.slice(0, 50).map((p) => (
                    <tr
                      key={p.product_external_id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-2 font-medium">
                        {p.product_name}
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {p.product_category}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {formatNumber(p.total_qty)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        ₪{formatNumber(Math.round(p.total_sales))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {storeProducts.length > 50 && (
            <div className="p-3 text-center text-sm text-gray-400 border-t">
              מציג 50 מתוך {storeProducts.length}
            </div>
          )}
        </div>
      )}

      {/* Missing products */}
      {subTab === "missing" && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b flex items-center gap-4">
            <h3 className="font-bold text-gray-900 shrink-0">
              🚫 מוצרים שהחנות לא מוכרת
            </h3>
            <SearchInput
              value={missingSearch}
              onChange={onMissingSearchChange}
              placeholder="חיפוש מוצר חסר..."
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-right font-medium">מוצר</th>
                  <th className="px-4 py-2 text-right font-medium">קטגוריה</th>
                  <th className="px-4 py-2 text-center font-medium">
                    כמות גלובלית (שנתי)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {missingProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      החנות מוכרת את כל המוצרים!
                    </td>
                  </tr>
                ) : (
                  missingProducts.slice(0, 50).map((p) => (
                    <tr key={p.external_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{p.name}</td>
                      <td className="px-4 py-2 text-gray-500">
                        {p.category || "-"}
                      </td>
                      <td className="px-4 py-2 text-center text-orange-600 font-medium">
                        {formatNumber(p.total_qty_global)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {missingProducts.length > 50 && (
            <div className="p-3 text-center text-sm text-gray-400 border-t">
              מציג 50 מתוך {missingProducts.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
